import { OAuth2Client } from "google-auth-library";
import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import db from "../database";
import {
  AuthService,
  type AuthenticatedRequest,
  createRateLimiter,
  authenticate,
} from "../auth";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const router = Router();

// Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

// Rate limiting for auth endpoints
const authRateLimit = createRateLimiter(15 * 60 * 1000, 50); // 50 requests per 15 minutes

interface GoogleTokenData {
  email: string;
  name: string;
  picture?: string;
  sub: string; // Google user ID
  email_verified: boolean;
}

// Set secure cookie options
const getCookieOptions = (maxAge: number = 7 * 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge,
  domain:
    process.env.NODE_ENV === "production"
      ? process.env.COOKIE_DOMAIN
      : undefined,
  path: "/",
});

// Google OAuth sign-in/sign-up
router.post(
  "/auth/google",
  authRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          error: "Missing credentials",
          message: "Google credential token is required",
        });
      }

      // Verify the token with Google
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
      } catch (error) {
        console.error("Google token verification failed:", error);
        return res.status(401).json({
          error: "Invalid token",
          message: "Failed to verify Google token",
        });
      }

      const payload = ticket.getPayload();
      if (!payload) {
        return res.status(401).json({
          error: "Invalid token",
          message: "Failed to extract token payload",
        });
      }

      const googleData: GoogleTokenData = {
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
        sub: payload.sub,
        email_verified: payload.email_verified || false,
      };

      // Check if email is verified
      if (!googleData.email_verified) {
        return res.status(400).json({
          error: "Email not verified",
          message: "Please verify your email with Google first",
        });
      }

      let user = await db.getUserByGoogleId(googleData.sub);

      if (!user) {
        // Check if user exists with same email but different provider
        const existingUser = await db.getUserByEmail(googleData.email);
        if (existingUser) {
          return res.status(409).json({
            error: "Email already registered",
            message:
              "An account with this email already exists. Please sign in with your original method.",
          });
        }

        // Create new user
        try {
          user = await db.createUser({
            email: googleData.email,
            name: googleData.name,
            googleId: googleData.sub,
            role: "user",
            isVerified: true,
          });

          console.log(`New Google user created: ${user.email}`);
        } catch (error: any) {
          console.error("Error creating Google user:", error);
          return res.status(500).json({
            error: "Registration failed",
            message: "Failed to create user account",
          });
        }
      }

      // Generate JWT tokens (Google OAuth)
      // If TOTP is enabled, issue a challenge token instead
      if (user!.totpEnabled) {
        const challengeToken = jwt.sign(
          { userId: user!.id, challenge: true },
          process.env.JWT_SECRET!,
          {
            expiresIn: "5m",
            issuer: "proximiti-app",
            audience: "proximiti-users",
          },
        );
        return res.status(200).json({ totpRequired: true, challengeToken });
      }

      const { accessToken, refreshToken } = await AuthService.generateTokens(
        user!,
      );

      // Set secure cookies
      const accessCookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000); // 7 days
      const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000); // 30 days

      res.cookie("accessToken", accessToken, accessCookieOptions);
      res.cookie("refreshToken", refreshToken, refreshCookieOptions);

      // Send success response
      res.status(200).json({
        message: "Authentication successful",
        user: {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          role: user!.role,
          isVerified: user!.isVerified,
          isPremium: user!.isPremium,
          planType: user!.planType,
          planExpiresAt: user!.planExpiresAt,
          totpEnabled: user!.totpEnabled,
        },
        // Also send tokens for clients that prefer headers over cookies
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Google authentication error:", error);
      res.status(500).json({
        error: "Authentication failed",
        message: "Internal server error during Google authentication",
      });
    }
  },
);

// Traditional email/password login (kept for backward compatibility)
router.post(
  "/auth/login",
  authRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Missing credentials",
          message: "Email and password are required",
        });
      }

      const user = await db.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Incorrect email or password",
        });
      }

      // Auto-verify on successful login — no email system is in place so
      // blocking unverified accounts would permanently lock users out.
      if (!user.isVerified) {
        await db.updateUser(user.id, { isVerified: true });
        user.isVerified = true;
      }

      // If TOTP is enabled, issue a short-lived challenge token instead of full auth
      if (user.totpEnabled) {
        const challengeToken = jwt.sign(
          { userId: user.id, challenge: true },
          process.env.JWT_SECRET!,
          {
            expiresIn: "5m",
            issuer: "proximiti-app",
            audience: "proximiti-users",
          },
        );
        return res.status(200).json({
          totpRequired: true,
          challengeToken,
        });
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } =
        await AuthService.generateTokens(user);

      // Set secure cookies
      const accessCookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
      const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

      res.cookie("accessToken", accessToken, accessCookieOptions);
      res.cookie("refreshToken", refreshToken, refreshCookieOptions);

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          isPremium: user.isPremium,
          planType: user.planType,
          planExpiresAt: user.planExpiresAt,
          totpEnabled: user.totpEnabled,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Login failed",
        message: "Internal server error during login",
      });
    }
  },
);

// Register new user with email/password
router.post(
  "/auth/register",
  authRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          error: "Missing fields",
          message: "Email, password, and name are required",
        });
      }

      // Basic password validation
      if (password.length < 8) {
        return res.status(400).json({
          error: "Weak password",
          message: "Password must be at least 8 characters long",
        });
      }

      try {
        const user = await db.createUser({
          email,
          name,
          password,
          role: "user",
          isVerified: true, // Auto-verify on registration
        });

        res.status(201).json({
          message: "Registration successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
            isPremium: user.isPremium,
            planType: user.planType,
            planExpiresAt: user.planExpiresAt,
          },
        });
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          return res.status(409).json({
            error: "Email already registered",
            message: "An account with this email already exists",
          });
        }
        throw error;
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: "Internal server error during registration",
      });
    }
  },
);

// Refresh access token
router.post(
  "/auth/refresh",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: "No refresh token",
          message: "Refresh token is required",
        });
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await AuthService.refreshToken(refreshToken);

      // Set new secure cookies
      const accessCookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
      const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

      res.cookie("accessToken", accessToken, accessCookieOptions);
      res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

      res.status(200).json({
        message: "Token refreshed successfully",
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({
        error: "Token refresh failed",
        message: "Invalid or expired refresh token",
      });
    }
  },
);

// Logout
router.post(
  "/auth/logout",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Revoke current session if user is authenticated
      if (req.sessionId) {
        await AuthService.revokeToken(req.sessionId);
      }

      // Clear cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        error: "Logout failed",
        message: "Error during logout process",
      });
    }
  },
);

// Logout from all devices
router.post(
  "/auth/logout-all",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
          message: "You must be logged in to logout from all devices",
        });
      }

      // Revoke all user sessions
      await AuthService.revokeAllUserTokens(req.user.id);

      // Clear cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.status(200).json({
        message: "Logged out from all devices successfully",
      });
    } catch (error) {
      console.error("Logout all error:", error);
      res.status(500).json({
        error: "Logout failed",
        message: "Error during logout process",
      });
    }
  },
);

// Get current user profile
router.get("/auth/me", async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to view your profile",
    });
  }

  res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      isVerified: req.user.isVerified,
      isPremium: req.user.isPremium,
      planType: req.user.planType,
      planExpiresAt: req.user.planExpiresAt,
      totpEnabled: req.user.totpEnabled,
      createdAt: req.user.createdAt,
    },
  });
});

// ─── TOTP / Google Authenticator Routes ──────────────────────────────────────

// Step 1: Generate a TOTP secret + QR code for the authenticated user
router.post(
  "/auth/totp/setup",
  authRateLimit,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (req.user.totpEnabled) {
        return res.status(400).json({
          error: "2FA already enabled",
          message:
            "Two-factor authentication is already active. Disable it first.",
        });
      }

      // Generate a fresh TOTP secret
      const secret = generateSecret();
      const appName = process.env.APP_NAME || "Proximiti";
      const otpAuthUrl = generateURI({
        issuer: appName,
        label: req.user.email,
        secret,
      });

      // Generate QR code as a data URL (PNG base64)
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 256 });

      // Store the secret temporarily (not yet enabled) so we can verify the next step
      await db.updateUser(req.user.id, {
        totpSecret: secret,
        totpEnabled: false,
      });

      res.status(200).json({
        secret,
        qrCodeDataUrl,
        otpAuthUrl,
      });
    } catch (error) {
      console.error("TOTP setup error:", error);
      res.status(500).json({ error: "Failed to generate TOTP setup" });
    }
  },
);

// Step 2: Confirm the code and enable TOTP
router.post(
  "/auth/totp/enable",
  authRateLimit,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { code } = req.body as { code: string };
      if (!code) {
        return res.status(400).json({ error: "TOTP code is required" });
      }

      const secret = req.user.totpSecret;
      if (!secret) {
        return res.status(400).json({
          error: "No TOTP setup in progress",
          message: "Call /auth/totp/setup first",
        });
      }

      const isValid = verifySync({ secret, token: code }).valid;
      if (!isValid) {
        return res.status(400).json({
          error: "Invalid code",
          message:
            "The 6-digit code is incorrect. Make sure your device clock is accurate.",
        });
      }

      await db.updateUser(req.user.id, { totpEnabled: true });

      // Revoke ALL sessions so the user must log back in through the 2FA flow.
      // Any token issued before 2FA was enabled must not grant access to
      // authenticated features without re-verifying with the authenticator app.
      await AuthService.revokeAllUserTokens(req.user.id);

      // Clear session cookies on this device too
      const expireCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 0,
        path: "/",
      };
      res.clearCookie("accessToken", expireCookieOptions);
      res.clearCookie("refreshToken", expireCookieOptions);

      res.status(200).json({
        message: "Two-factor authentication enabled successfully.",
        requiresRelogin: true,
      });
    } catch (error) {
      console.error("TOTP enable error:", error);
      res.status(500).json({ error: "Failed to enable TOTP" });
    }
  },
);

// Disable TOTP (requires a valid current code)
router.post(
  "/auth/totp/disable",
  authRateLimit,
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!req.user.totpEnabled) {
        return res.status(400).json({ error: "2FA is not enabled" });
      }

      const { code } = req.body as { code: string };
      if (!code) {
        return res
          .status(400)
          .json({ error: "TOTP code is required to disable 2FA" });
      }

      const secret = req.user.totpSecret;
      if (!secret) {
        return res
          .status(500)
          .json({ error: "Internal error: TOTP secret missing" });
      }

      const isValid = verifySync({ secret, token: code }).valid;
      if (!isValid) {
        return res.status(400).json({
          error: "Invalid code",
          message: "The 6-digit code is incorrect.",
        });
      }

      await db.updateUser(req.user.id, {
        totpEnabled: false,
        totpSecret: null,
      });

      res.status(200).json({ message: "Two-factor authentication disabled." });
    } catch (error) {
      console.error("TOTP disable error:", error);
      res.status(500).json({ error: "Failed to disable TOTP" });
    }
  },
);

// Complete login when TOTP is required (accepts a challengeToken + code)
router.post(
  "/auth/totp/login",
  authRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { challengeToken, code } = req.body as {
        challengeToken: string;
        code: string;
      };

      if (!challengeToken || !code) {
        return res.status(400).json({
          error: "Missing fields",
          message: "challengeToken and code are required",
        });
      }

      // Verify challenge token
      let payload: any;
      try {
        payload = jwt.verify(challengeToken, process.env.JWT_SECRET!, {
          issuer: "proximiti-app",
          audience: "proximiti-users",
        });
      } catch {
        return res.status(401).json({
          error: "Invalid or expired challenge token",
          message: "Please log in again",
        });
      }

      if (!payload.challenge || !payload.userId) {
        return res.status(401).json({ error: "Invalid challenge token" });
      }

      const user = await db.getUserById(parseInt(payload.userId));
      if (!user || !user.totpEnabled || !user.totpSecret) {
        return res
          .status(401)
          .json({ error: "User not found or 2FA not configured" });
      }

      const isValid = verifySync({
        secret: user.totpSecret,
        token: code,
      }).valid;
      if (!isValid) {
        return res.status(400).json({
          error: "Invalid code",
          message: "The 6-digit code is incorrect or expired.",
        });
      }

      // Issue full tokens
      const { accessToken, refreshToken } =
        await AuthService.generateTokens(user);

      const accessCookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);
      const refreshCookieOptions = getCookieOptions(30 * 24 * 60 * 60 * 1000);

      res.cookie("accessToken", accessToken, accessCookieOptions);
      res.cookie("refreshToken", refreshToken, refreshCookieOptions);

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          isPremium: user.isPremium,
          planType: user.planType,
          planExpiresAt: user.planExpiresAt,
          totpEnabled: user.totpEnabled,
        },
        tokens: { accessToken, refreshToken },
      });
    } catch (error) {
      console.error("TOTP login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  },
);

export default router;
