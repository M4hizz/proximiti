/**
 * Authentication API service for Google OAuth and traditional login
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  isVerified: boolean;
  isPremium: boolean;
  planType: "basic" | "essential" | "enterprise";
  planExpiresAt: string | null;
  stripeSubscriptionId?: string | null;
  totpEnabled?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  totpRequired?: false; // discriminant — makes TypeScript narrow the union correctly
  message: string;
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface TotpChallengeResponse {
  totpRequired: true;
  challengeToken: string;
}

export type LoginResponse = AuthResponse | TotpChallengeResponse;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

const TOKEN_KEY = "proximiti_access_token";

class AuthApiService {
  private readonly baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  // ── Token storage (in-memory + localStorage for persistence) ─────────────
  private memoryToken: string | null = null;

  getStoredToken(): string | null {
    if (this.memoryToken) return this.memoryToken;
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setStoredToken(token: string | null): void {
    this.memoryToken = token;
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      /* localStorage unavailable */
    }
  }

  // Grab token from a successful auth response and persist it
  private saveTokensFromResponse(data: AuthResponse): void {
    if (data.tokens?.accessToken) {
      this.setStoredToken(data.tokens.accessToken);
    }
  }

  // ── HTTP helper ───────────────────────────────────────────────────────────
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getStoredToken();

    const config: RequestInit = {
      ...options,
      credentials: "include", // still send cookies when same-origin
      headers: {
        "Content-Type": "application/json",
        // Inject stored token as Bearer — works cross-origin where cookies can't
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }

  // Google OAuth login
  async loginWithGoogle(credential: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        credential,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      }),
    });
    if (!("totpRequired" in data) || !data.totpRequired) {
      this.saveTokensFromResponse(data as AuthResponse);
    }
    return data;
  }

  // Traditional email/password login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (!("totpRequired" in data) || !data.totpRequired) {
      this.saveTokensFromResponse(data as AuthResponse);
    }
    return data;
  }

  // Complete TOTP login challenge
  async totpLogin(challengeToken: string, code: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/totp/login", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code }),
    });
    this.saveTokensFromResponse(data);
    return data;
  }

  // Generate TOTP secret + QR code
  async totpSetup(): Promise<{
    secret: string;
    qrCodeDataUrl: string;
    otpAuthUrl: string;
  }> {
    return this.request("/auth/totp/setup", { method: "POST" });
  }

  // Enable TOTP after verifying the code
  async totpEnable(code: string): Promise<{ message: string }> {
    return this.request("/auth/totp/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  // Disable TOTP (requires current code)
  async totpDisable(code: string): Promise<{ message: string }> {
    return this.request("/auth/totp/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  // Register new user
  async register(
    userData: RegisterData,
  ): Promise<{ message: string; user: User }> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  // Logout
  async logout(): Promise<{ message: string }> {
    const result = await this.request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
    this.setStoredToken(null);
    return result;
  }

  // Logout from all devices
  async logoutAll(): Promise<{ message: string }> {
    const result = await this.request<{ message: string }>("/auth/logout-all", {
      method: "POST",
    });
    this.setStoredToken(null);
    return result;
  }

  // Get current user profile
  async getCurrentUser(): Promise<{ user: User }> {
    const data = await this.request<{
      user: User;
      tokens?: { accessToken: string; refreshToken: string };
    }>("/auth/me");
    // /auth/me now returns a fresh token — persist it so cross-origin
    // requests keep working across page refreshes without requiring re-login.
    if (data.tokens?.accessToken) {
      this.setStoredToken(data.tokens.accessToken);
    }
    return data;
  }

  // Refresh access token
  async refreshToken(): Promise<{
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const data = await this.request<{
      tokens: { accessToken: string; refreshToken: string };
    }>("/auth/refresh", { method: "POST" });
    if (data.tokens?.accessToken) {
      this.setStoredToken(data.tokens.accessToken);
    }
    return data;
  }

  // Update user profile
  async updateProfile(updates: {
    name: string;
  }): Promise<{ message: string; user: User }> {
    return this.request("/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Admin: Get all users
  async getUsers(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: User[];
    pagination: { page: number; limit: number; offset: number };
  }> {
    return this.request(`/admin/users?page=${page}&limit=${limit}`);
  }

  // Admin: Update user role
  async updateUserRole(
    userId: string,
    role: "user" | "admin",
  ): Promise<{
    message: string;
    user: User;
  }> {
    return this.request(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  // Admin: Cancel a user's subscription
  async adminCancelUserSubscription(
    userId: string,
  ): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}/subscription`, {
      method: "DELETE",
    });
  }

  // Admin: Remove a user's plan (local only, no Stripe)
  async adminRemoveUserPlan(userId: string): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}/plan`, {
      method: "DELETE",
    });
  }

  // Admin: Permanently delete a user account
  async adminDeleteUser(userId: string): Promise<{ message: string }> {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  // Get businesses (optional auth)
  async getBusinesses(): Promise<{
    businesses: any[];
    user?: User;
  }> {
    return this.request("/businesses");
  }
}

export const authApi = new AuthApiService();
export default authApi;
