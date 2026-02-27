import jwt, { type VerifyOptions } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import db, { type User } from "./database";
import crypto from "crypto";

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
  jti: string; // JWT ID for session management
  iat?: number;
  exp?: number;
}

class AuthService {
  private static get jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    return secret;
  }

  private static jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
  private static refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

  static generateJTI(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  static async generateTokens(user: User) {
    const jti = this.generateJTI();
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const signOptions: any = {
      expiresIn: this.jwtExpiresIn,
      issuer: "proximiti-app",
      audience: "proximiti-users",
    };

    const refreshSignOptions: any = {
      expiresIn: this.refreshExpiresIn,
      issuer: "proximiti-app",
      audience: "proximiti-users",
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, signOptions);
    const refreshToken = jwt.sign(
      { userId: user.id, jti: jti + "_refresh" },
      this.jwtSecret,
      refreshSignOptions,
    );

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setTime(
      expiresAt.getTime() + this.parseExpiration(this.jwtExpiresIn),
    );
    await db.createSession(user.id, jti, expiresAt);

    return { accessToken, refreshToken };
  }

  private static parseExpiration(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const verifyOptions: VerifyOptions = {
        issuer: "proximiti-app",
        audience: "proximiti-users",
      };

      const payload = jwt.verify(
        token,
        this.jwtSecret,
        verifyOptions,
      ) as JWTPayload;

      // Check if session is still valid in database
      if (!(await db.isSessionValid(payload.jti))) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  static async revokeToken(jti: string) {
    await db.revokeSession(jti);
  }

  static async revokeAllUserTokens(userId: string) {
    await db.revokeAllUserSessions(userId);
  }

  static async refreshToken(refreshToken: string) {
    try {
      const verifyOptions: VerifyOptions = {
        issuer: "proximiti-app",
        audience: "proximiti-users",
      };

      const payload = jwt.verify(
        refreshToken,
        this.jwtSecret,
        verifyOptions,
      ) as any;

      const user = await db.getUserById(parseInt(payload.userId));
      return this.generateTokens(user);
    } catch {
      throw new Error("Invalid refresh token");
    }
  }
}

// Middleware to extract token from cookies or Authorization header
const extractToken = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  let token = null;

  // First, try to get token from httpOnly cookie (preferred for security)
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  // Fallback to Authorization header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }

  next();
};

// Main authentication middleware
const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = null;

    // Extract token from cookie or Authorization header
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
        message: "No access token provided",
      });
    }

    const payload = await AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid or expired access token",
      });
    }

    // Get fresh user data from database
    const user = await db.getUserById(parseInt(payload.userId));
    if (!user || !user.isVerified) {
      return res.status(401).json({
        error: "Authentication failed",
        message: "User not found or not verified",
      });
    }

    req.user = user;
    req.sessionId = payload.jti;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      error: "Authentication failed",
      message: "Invalid access token",
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (token) {
      const payload = await AuthService.verifyToken(token);
      if (payload) {
        const user = await db.getUserById(parseInt(payload.userId));
        if (user && user.isVerified) {
          req.user = user;
          req.sessionId = payload.jti;
        }
      }
    }

    next();
  } catch {
    // Continue without authentication for optional auth
    next();
  }
};

// Role-based access control middleware
const requireRole = (roles: ("user" | "admin")[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to access this resource",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

// Admin-only middleware
const requireAdmin = requireRole(["admin"]);

// User or admin middleware
const requireUser = requireRole(["user", "admin"]);

// Rate limiting middleware helper
const createRateLimiter = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < now) {
        requests.delete(key);
      }
    }

    const currentRequests = requests.get(ip);

    if (!currentRequests || currentRequests.resetTime < now) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      next();
    } else if (currentRequests.count < max) {
      currentRequests.count++;
      next();
    } else {
      res.status(429).json({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((currentRequests.resetTime - now) / 1000),
      });
    }
  };
};

// Security headers middleware
const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  next();
};

export {
  AuthService,
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin,
  requireUser,
  extractToken,
  createRateLimiter,
  securityHeaders,
  type AuthenticatedRequest,
  type JWTPayload,
};
