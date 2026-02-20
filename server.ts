import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import dotenv from "dotenv";
import { Filter } from "bad-words";

// Import our authentication system
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
  extractToken,
  securityHeaders,
  createRateLimiter,
  type AuthenticatedRequest,
} from "./src/lib/auth";
import authRoutes from "./src/lib/routes/auth";
import db from "./src/lib/database";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Profanity filter
const profanityFilter = new Filter();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
        scriptSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://apis.google.com",
        ],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://apis.google.com",
        ],
        frameSrc: ["'self'", "https://accounts.google.com"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.use(securityHeaders);

// CORS configuration
const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
const globalRateLimit = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
app.use(globalRateLimit);

// Extract token from cookies/headers for all routes
app.use(extractToken);

// Health check endpoint (no auth required)
app.get("/", (req, res) => {
  res.json({
    message: "Proximiti API is running",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Public health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Authentication routes (public)
app.use("/api", authRoutes);

// Protected business data routes
app.get(
  "/api/businesses",
  optionalAuthenticate,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const businesses = [
        {
          id: "1",
          name: "The Green Kitchen",
          category: "food",
          rating: 4.7,
          reviewCount: 234,
          address: "123 Queen Street West, Toronto, ON M5H 2M9",
          hours: "8:00 AM - 10:00 PM",
          description:
            "Farm-to-table restaurant serving organic, locally-sourced dishes.",
          image:
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
          lat: 43.6532,
          lng: -79.3832,
          phone: "(416) 123-4567",
          priceLevel: "$$",
        },
      ];

      res.json({
        businesses,
        user: req.user
          ? {
              id: req.user.id,
              email: req.user.email,
              name: req.user.name,
              role: req.user.role,
            }
          : null,
      });
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({
        error: "Failed to fetch businesses",
        message: "Internal server error",
      });
    }
  },
);

// Protected route - user profile management
app.get(
  "/api/profile",
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role,
        isVerified: req.user!.isVerified,
        createdAt: req.user!.createdAt,
      },
    });
  },
);

app.put(
  "/api/profile",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          error: "Invalid input",
          message: "Name is required",
        });
      }

      const updatedUser = db.updateUser(req.user!.id, { name: name.trim() });

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        error: "Profile update failed",
        message: "Internal server error",
      });
    }
  },
);

// Admin-only routes
app.get(
  "/api/admin/users",
  authenticate,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const users = db.getAllUsers(limit, offset);

      res.json({
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        })),
        pagination: {
          page,
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        error: "Failed to fetch users",
        message: "Internal server error",
      });
    }
  },
);

app.put(
  "/api/admin/users/:id/role",
  authenticate,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { role } = req.body;

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
          message: 'Role must be either "user" or "admin"',
        });
      }

      const updatedUser = db.updateUser(id, { role });

      res.json({
        message: "User role updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({
        error: "Failed to update user role",
        message: "Internal server error",
      });
    }
  },
);

// ─── Reviews API ─────────────────────────────────────────────────────────────

// Threshold: once Proximiti review count >= this, Google reviews are phased out
const PROXIMITI_PHASE_OUT_THRESHOLD = 10;

// Fetch Proximiti reviews for a business
app.get(
  "/api/reviews/:businessId",
  optionalAuthenticate,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 50);
      const offset = parseInt(req.query.offset as string) || 0;
      const requestingUserId = req.user?.id;

      const { reviews, total } = db.getReviewsForBusiness(
        businessId,
        limit,
        offset,
        requestingUserId,
      );
      const proximitiCount = db.getProximitiReviewCount(businessId);

      // Determine if Proximiti reviews should phase out Google reviews
      const useProximitiOnly = proximitiCount >= PROXIMITI_PHASE_OUT_THRESHOLD;

      // Check if requesting user has already reviewed this business
      let userReview = null;
      if (requestingUserId) {
        userReview = db.getUserReviewForBusiness(businessId, requestingUserId);
      }

      res.json({
        reviews,
        total,
        proximitiCount,
        useProximitiOnly,
        userReview,
        hasMore: offset + limit < total,
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  },
);

// Submit a new Proximiti review (auth required, 1 per user per business)
app.post(
  "/api/reviews/:businessId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { rating, text } = req.body;
      const userId = req.user!.id;

      // Validate inputs
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ error: "Rating must be a number between 1 and 5" });
      }
      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return res
          .status(400)
          .json({ error: "Review text must be at least 10 characters" });
      }
      if (text.trim().length > 1000) {
        return res
          .status(400)
          .json({ error: "Review text must be under 1000 characters" });
      }

      // Profanity check
      if (profanityFilter.isProfane(text)) {
        return res.status(400).json({
          error:
            "Review contains inappropriate language. Please revise and resubmit.",
        });
      }

      // Check for duplicate review
      const existing = db.getUserReviewForBusiness(businessId, userId);
      if (existing) {
        return res
          .status(409)
          .json({ error: "You have already reviewed this business" });
      }

      const review = await db.createReview(
        businessId,
        userId,
        Math.round(rating),
        text.trim(),
      );
      res
        .status(201)
        .json({ message: "Review submitted successfully", review });
    } catch (error: any) {
      if (error.message?.includes("already reviewed")) {
        return res.status(409).json({ error: error.message });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  },
);

// Toggle "Found this helpful?" (auth required)
app.post(
  "/api/reviews/:reviewId/helpful",
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reviewId } = req.params;
      const userId = req.user!.id;
      const isNowHelpful = db.toggleHelpful(reviewId, userId);
      res.json({ helpful: isNowHelpful });
    } catch (error) {
      console.error("Error toggling helpful:", error);
      res.status(500).json({ error: "Failed to update helpful status" });
    }
  },
);

// Google Places reviews proxy (keeps API key server-side)
app.get(
  "/api/places/google-reviews",
  optionalAuthenticate,
  async (_req: Request, res: Response) => {
    try {
      const { name, lat, lng, pagetoken } = _req.query as Record<
        string,
        string
      >;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        return res
          .status(503)
          .json({ error: "Google Places API not configured", reviews: [] });
      }

      if (!name || !lat || !lng) {
        return res
          .status(400)
          .json({ error: "name, lat and lng are required" });
      }

      // Step 1: Find Place ID via Find Place API (or use provided pagetoken to get more reviews)
      let placeId: string | null = null;

      if (!pagetoken) {
        const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,rating,user_ratings_total&key=${apiKey}`;
        const findResp = await fetch(findUrl, {
          signal: AbortSignal.timeout(30000),
        });
        const findData = (await findResp.json()) as any;

        if (findData.candidates?.length > 0) {
          placeId = findData.candidates[0].place_id;
        } else {
          return res.json({
            reviews: [],
            googleRating: null,
            totalRatings: null,
          });
        }
      }

      // Step 2: Get reviews from Place Details API
      // Important: Google Places API requires significant delay before using next_page_token
      // Free tier is heavily rate-limited (429 errors are common)
      if (pagetoken) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const detailsUrl = pagetoken
        ? `https://maps.googleapis.com/maps/api/place/details/json?pagetoken=${pagetoken}&fields=reviews,rating,user_ratings_total,next_page_token&key=${apiKey}`
        : `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,next_page_token&key=${apiKey}`;

      const detailsResp = await fetch(detailsUrl, {
        signal: AbortSignal.timeout(30000),
      });
      const detailsData = (await detailsResp.json()) as any;

      // Check for rate limit errors
      if (detailsData.error_message?.includes("quota") || detailsData.error_message?.includes("rate")) {
        console.warn("Google Places API rate limited:", detailsData.error_message);
        return res.status(429).json({ error: "Rate limited. Please wait before loading more reviews." });
      }

      if (detailsData.status && detailsData.status !== "OK") {
        console.warn("Google Places API error:", detailsData.status, detailsData.error_message);
        return res.status(400).json({ error: `Google API error: ${detailsData.status}` });
      }

      const responseNextPageToken = detailsData.next_page_token ?? null;

      res.json({
        placeId,
        reviews: detailsData.result?.reviews ?? [],
        googleRating: detailsData.result?.rating ?? null,
        totalRatings: detailsData.result?.user_ratings_total ?? null,
        nextPageToken: responseNextPageToken,
      });
    } catch (error) {
      console.error("Google Places proxy error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch Google reviews", reviews: [] });
    }
  },
);

// ─── End Reviews API ──────────────────────────────────────────────────────────

// Error handling middleware
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON",
      message: "Request body contains invalid JSON",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  db.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  db.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Proximiti API server running on http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🔐 Security features enabled: CORS, Helmet, Rate Limiting, JWT Auth`,
  );
  console.log(`🗄️  Database: SQLite with role-based access control`);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `⚠️  Development mode: Remember to configure production secrets!`,
    );
  }
});
