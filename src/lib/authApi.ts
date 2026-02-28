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

class AuthApiService {
  private readonly baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      credentials: "include", // Include cookies in requests
      headers: {
        "Content-Type": "application/json",
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
  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        credential,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      }),
    });
  }

  // Traditional email/password login
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  // Complete TOTP login challenge
  async totpLogin(challengeToken: string, code: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/totp/login", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code }),
    });
  }

  // Generate TOTP secret + QR code
  async totpSetup(): Promise<{ secret: string; qrCodeDataUrl: string; otpAuthUrl: string }> {
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
    return this.request("/auth/logout", {
      method: "POST",
    });
  }

  // Logout from all devices
  async logoutAll(): Promise<{ message: string }> {
    return this.request("/auth/logout-all", {
      method: "POST",
    });
  }

  // Get current user profile
  async getCurrentUser(): Promise<{ user: User }> {
    return this.request("/auth/me");
  }

  // Refresh access token
  async refreshToken(): Promise<{
    tokens: { accessToken: string; refreshToken: string };
  }> {
    return this.request("/auth/refresh", {
      method: "POST",
    });
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
