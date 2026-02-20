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
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
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
      const { businessId } = req.params as Record<string, string>;
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
      const { businessId } = req.params as Record<string, string>;
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
      const { reviewId } = req.params as Record<string, string>;
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
// When SERPAPI_KEY is configured, uses SerpAPI google_maps_reviews for unlimited paginated reviews.
// Falls back to Google Places API (5 reviews max) otherwise.
app.get(
  "/api/places/google-reviews",
  optionalAuthenticate,
  async (_req: Request, res: Response) => {
    try {
      const {
        name,
        lat,
        lng,
        placeId: existingDataId, // reused to store SerpAPI data_id across pages
        pagetoken,
      } = _req.query as Record<string, string>;
      const placesApiKey = process.env.GOOGLE_PLACES_API_KEY;
      const serpApiKey = process.env.SERPAPI_KEY;

      if (!placesApiKey && !serpApiKey) {
        return res
          .status(503)
          .json({ error: "Google Places API not configured", reviews: [] });
      }

      // Allow pagination without name/lat/lng if we already have the dataId
      if (!existingDataId && (!name || !lat || !lng)) {
        return res
          .status(400)
          .json({ error: "name, lat and lng are required" });
      }

      // ── SerpAPI path – unlimited paginated reviews ──────────────────────────
      if (serpApiKey) {
        let dataId: string | null = existingDataId || null;
        let googleRating: number | null = null;
        let totalRatings: number | null = null;

        // Step 1 (first page only): find place via SerpAPI google_maps to get data_id + rating
        if (!dataId) {
          const mapsUrl = new URL("https://serpapi.com/search.json");
          mapsUrl.searchParams.set("engine", "google_maps");
          mapsUrl.searchParams.set("q", name);
          mapsUrl.searchParams.set("ll", `@${lat},${lng},14z`);
          mapsUrl.searchParams.set("hl", "en");
          mapsUrl.searchParams.set("api_key", serpApiKey);

          const mapsResp = await fetch(mapsUrl.toString(), {
            signal: AbortSignal.timeout(30000),
          });
          const mapsData = (await mapsResp.json()) as any;

          if (mapsData.error) {
            console.error("SerpAPI maps search error:", mapsData.error);
            return res.status(502).json({
              error: "Failed to locate business via SerpAPI",
              reviews: [],
            });
          }

          const place = mapsData.local_results?.[0];
          if (!place) {
            return res.json({
              placeId: null,
              reviews: [],
              googleRating: null,
              totalRatings: null,
              nextPageToken: null,
            });
          }

          dataId = place.data_id;
          googleRating = place.rating ?? null;
          totalRatings = place.reviews ?? null; // "reviews" field = total count integer
        }

        // Step 2: fetch reviews with google_maps_reviews engine
        const reviewsUrl = new URL("https://serpapi.com/search.json");
        reviewsUrl.searchParams.set("engine", "google_maps_reviews");
        reviewsUrl.searchParams.set("data_id", dataId!);
        reviewsUrl.searchParams.set("hl", "en");
        reviewsUrl.searchParams.set("api_key", serpApiKey);
        if (pagetoken)
          reviewsUrl.searchParams.set("next_page_token", pagetoken);

        const reviewsResp = await fetch(reviewsUrl.toString(), {
          signal: AbortSignal.timeout(30000),
        });
        const reviewsData = (await reviewsResp.json()) as any;

        if (reviewsData.error) {
          console.error("SerpAPI reviews error:", reviewsData.error);
          return res.status(502).json({
            error: "Failed to fetch reviews via SerpAPI",
            reviews: [],
          });
        }

        const reviews = (reviewsData.reviews ?? []).map((r: any) => ({
          author_name: r.user?.name || "Anonymous",
          author_url: r.user?.link || null,
          profile_photo_url: r.user?.thumbnail || null,
          rating: r.rating ?? 0,
          text: r.snippet ?? "",
          time: r.iso_date
            ? Math.floor(new Date(r.iso_date).getTime() / 1000)
            : Math.floor(Date.now() / 1000),
          relative_time_description: r.date ?? "",
        }));

        return res.json({
          placeId: dataId, // returned so frontend can send it back for pagination
          reviews,
          googleRating, // only populated on first page
          totalRatings, // only populated on first page
          nextPageToken:
            reviewsData.serpapi_pagination?.next_page_token ?? null,
        });
      }

      // ── Google Places API fallback (max 5 reviews) ──────────────────────────
      if (!placesApiKey) {
        return res
          .status(503)
          .json({ error: "Google Places API not configured", reviews: [] });
      }

      let placeId: string | null = existingDataId || null;

      if (!placeId) {
        const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,rating,user_ratings_total&key=${placesApiKey}`;
        const findResp = await fetch(findUrl, {
          signal: AbortSignal.timeout(30000),
        });
        const findData = (await findResp.json()) as any;

        if (findData.candidates?.length > 0) {
          placeId = findData.candidates[0].place_id;
        } else {
          return res.json({
            placeId: null,
            reviews: [],
            googleRating: null,
            totalRatings: null,
            nextPageToken: null,
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
        ? `https://maps.googleapis.com/maps/api/place/details/json?pagetoken=${pagetoken}&fields=reviews,rating,user_ratings_total,next_page_token&key=${placesApiKey}`
        : `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,next_page_token&key=${placesApiKey}`;

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

      return res.json({
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

// Google Places Photo proxy – returns the first photo of a business as a redirect.
// Uses the existing GOOGLE_PLACES_API_KEY; no SerpAPI consumed.
app.get(
  "/api/places/photo",
  optionalAuthenticate,
  async (_req: Request, res: Response) => {
    try {
      const { name, lat, lng } = _req.query as Record<string, string>;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        return res
          .status(503)
          .json({ error: "Google Places API not configured" });
      }
      if (!name || !lat || !lng) {
        return res
          .status(400)
          .json({ error: "name, lat and lng are required" });
      }

      // Return immediately if already cached
      const cacheKey = `${name}|${lat}|${lng}`;
      const cached = db.getCachedPhoto(cacheKey);
      if (cached) return res.redirect(302, cached);

      // Find place and request a photo reference in one call
      const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id&key=${apiKey}`;
      const findData = (await (
        await fetch(findUrl, { signal: AbortSignal.timeout(15000) })
      ).json()) as any;
      const placeId = findData.candidates?.[0]?.place_id;
      if (!placeId) return res.status(404).json({ error: "Place not found" });

      // Fetch place details to get a photo reference
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;
      const detailsData = (await (
        await fetch(detailsUrl, { signal: AbortSignal.timeout(15000) })
      ).json()) as any;
      const photoRef = detailsData.result?.photos?.[0]?.photo_reference;
      if (!photoRef)
        return res.status(404).json({ error: "No photo available" });

      // Redirect to the actual Places Photo URL (browser fetches it directly)
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${apiKey}`;
      db.cachePhoto(cacheKey, photoUrl);
      res.redirect(302, photoUrl);
    } catch (error) {
      console.error("Places photo proxy error:", error);
      res.status(500).json({ error: "Failed to fetch business photo" });
    }
  },
);

// Google Places Nearby Search proxy – uses Places API (New) for comprehensive business data.
// Falls back gracefully; API key stays server-side.
app.get(
  "/api/places/nearby",
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = "2000" } = req.query as Record<string, string>;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        return res
          .status(503)
          .json({ error: "Google Places API not configured", businesses: [] });
      }
      if (!lat || !lng) {
        return res
          .status(400)
          .json({ error: "lat and lng are required", businesses: [] });
      }

      const PLACES_TYPE_CATEGORY: Record<string, string> = {
        // Food
        restaurant: "food",
        fast_food_restaurant: "food",
        meal_delivery: "food",
        meal_takeaway: "food",
        bar: "food",
        pub: "food",
        night_club: "food",
        bakery: "food",
        dessert_shop: "food",
        sandwich_shop: "food",
        pizza_restaurant: "food",
        hamburger_restaurant: "food",
        sushi_restaurant: "food",
        seafood_restaurant: "food",
        steak_house: "food",
        // Coffee
        cafe: "coffee",
        coffee_shop: "coffee",
        tea_house: "coffee",
        juice_bar: "coffee",
        ice_cream_shop: "coffee",
        // Retail
        grocery_store: "retail",
        supermarket: "retail",
        convenience_store: "retail",
        clothing_store: "retail",
        electronics_store: "retail",
        shopping_mall: "retail",
        book_store: "retail",
        jewelry_store: "retail",
        shoe_store: "retail",
        hardware_store: "retail",
        furniture_store: "retail",
        department_store: "retail",
        florist: "retail",
        pet_store: "retail",
        bicycle_store: "retail",
        sporting_goods_store: "retail",
        home_goods_store: "retail",
        gift_shop: "retail",
        drugstore: "retail",
        discount_store: "retail",
        market: "retail",
        // Health
        gym: "health",
        fitness_center: "health",
        sports_club: "health",
        pharmacy: "health",
        doctor: "health",
        dentist: "health",
        hospital: "health",
        physiotherapist: "health",
        beauty_salon: "health",
        spa: "health",
        hair_salon: "health",
        nail_salon: "health",
        barbershop: "health",
        massage_therapist: "health",
        veterinary_care: "health",
        // Entertainment
        movie_theater: "entertainment",
        bowling_alley: "entertainment",
        casino: "entertainment",
        amusement_park: "entertainment",
        zoo: "entertainment",
        aquarium: "entertainment",
        museum: "entertainment",
        art_gallery: "entertainment",
        performing_arts_theater: "entertainment",
        stadium: "entertainment",
        // Services
        bank: "services",
        atm: "services",
        car_repair: "services",
        car_wash: "services",
        laundry: "services",
        gas_station: "services",
        hotel: "services",
        lodging: "services",
        travel_agency: "services",
        car_rental: "services",
        insurance_agency: "services",
        real_estate_agency: "services",
        post_office: "services",
      };

      const CATEGORY_IMAGE_POOLS: Record<string, string[]> = {
        food: [
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        ],
        coffee: [
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop",
        ],
        retail: [
          "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
        ],
        health: [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
        ],
        entertainment: [
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
        ],
        services: [
          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
        ],
      };

      function djb2(s: string): number {
        return s
          .split("")
          .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
      }

      const placesRes = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.location",
              "places.types",
              "places.rating",
              "places.userRatingCount",
              "places.priceLevel",
              "places.regularOpeningHours",
              "places.internationalPhoneNumber",
              "places.websiteUri",
            ].join(","),
          },
          body: JSON.stringify({
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: {
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                },
                radius: parseFloat(radius),
              },
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!placesRes.ok) {
        const errText = await placesRes.text();
        console.error("Google Places Nearby error:", errText);
        return res
          .status(placesRes.status)
          .json({ error: "Google Places API error", businesses: [] });
      }

      const placesData = (await placesRes.json()) as { places?: any[] };
      const places = placesData.places ?? [];

      const priceLevelMap: Record<string, string> = {
        PRICE_LEVEL_FREE: "$",
        PRICE_LEVEL_INEXPENSIVE: "$",
        PRICE_LEVEL_MODERATE: "$$",
        PRICE_LEVEL_EXPENSIVE: "$$$",
        PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
      };

      const businesses = places.map((place: any) => {
        const name: string = place.displayName?.text ?? "Unknown";
        const types: string[] = place.types ?? [];
        const category =
          types.map((t) => PLACES_TYPE_CATEGORY[t]).find(Boolean) ?? "services";
        const pool =
          CATEGORY_IMAGE_POOLS[category] ?? CATEGORY_IMAGE_POOLS.food;
        const image = pool[djb2(name) % pool.length];
        const hours: string =
          place.regularOpeningHours?.weekdayDescriptions?.join("\n") ?? "";
        return {
          id: `gp-${place.id}`,
          name,
          category,
          rating:
            place.rating ?? Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
          reviewCount:
            place.userRatingCount ?? Math.floor(Math.random() * 300) + 20,
          address: place.formattedAddress ?? "",
          hours,
          description: `${name} – ${(types[0] ?? "business").replace(/_/g, " ")}`,
          image,
          lat: place.location?.latitude ?? 0,
          lng: place.location?.longitude ?? 0,
          phone: place.internationalPhoneNumber ?? "",
          priceLevel: priceLevelMap[place.priceLevel] ?? "$$",
          website: place.websiteUri ?? undefined,
        };
      });

      res.json({ businesses });
    } catch (error) {
      console.error("Places nearby proxy error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch nearby places", businesses: [] });
    }
  },
);

// OpenStreetMap Overpass proxy – runs server-side so CSP doesn't block mirrors.
app.get(
  "/api/osm/nearby",
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = "2000" } = req.query as Record<string, string>;
      if (!lat || !lng)
        return res.status(400).json({ error: "lat and lng are required" });

      const r = parseFloat(radius);
      const query = `
[out:json][timeout:25];
(
  node["amenity"]["name"](around:${r},${lat},${lng});
  node["shop"]["name"](around:${r},${lat},${lng});
  way["amenity"]["name"](around:${r},${lat},${lng});
  way["shop"]["name"](around:${r},${lat},${lng});
);
out body;
>;
out skel qt;
`;

      const OVERPASS_ENDPOINTS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.ru/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        "https://overpass.terrametrics.com/api/interpreter",
      ];

      let osmData: any = null;
      const PER_ENDPOINT_TIMEOUT = 8000; // 8 s per mirror — try them all fast
      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(
            () => controller.abort(),
            PER_ENDPOINT_TIMEOUT,
          );
          const osmRes = await fetch(endpoint, {
            method: "POST",
            body: query,
            headers: { "Content-Type": "text/plain" },
            signal: controller.signal,
          }).finally(() => clearTimeout(timer));
          if (osmRes.ok) {
            osmData = await osmRes.json();
            break;
          }
          console.warn(`Overpass ${endpoint} returned HTTP ${osmRes.status}`);
        } catch (err) {
          console.warn(`Overpass ${endpoint} failed:`, err);
        }
      }

      if (!osmData) {
        console.warn("All Overpass endpoints failed — returning empty result");
        // Return an empty but valid response so the client degrades gracefully
        // to its static-data fallback without surfacing an error to the user.
        return res.json({ elements: [] });
      }

      res.json(osmData);
    } catch (error) {
      console.error("OSM proxy error:", error);
      res.status(500).json({ error: "OSM proxy error", elements: [] });
    }
  },
);

// Google Places Text Search proxy – searches by name/keyword near a location.
// Uses Places API (New): places:searchText
app.get(
  "/api/places/search",
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    try {
      const {
        query,
        lat,
        lng,
        radius = "5000",
      } = req.query as Record<string, string>;
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!apiKey)
        return res
          .status(503)
          .json({ error: "Google Places API not configured", businesses: [] });
      if (!query || !lat || !lng)
        return res
          .status(400)
          .json({ error: "query, lat and lng are required", businesses: [] });

      const PLACES_TYPE_CATEGORY: Record<string, string> = {
        restaurant: "food",
        fast_food_restaurant: "food",
        meal_takeaway: "food",
        bar: "food",
        pub: "food",
        night_club: "food",
        bakery: "food",
        sandwich_shop: "food",
        pizza_restaurant: "food",
        hamburger_restaurant: "food",
        sushi_restaurant: "food",
        seafood_restaurant: "food",
        steak_house: "food",
        meal_delivery: "food",
        dessert_shop: "food",
        cafe: "coffee",
        coffee_shop: "coffee",
        tea_house: "coffee",
        juice_bar: "coffee",
        ice_cream_shop: "coffee",
        grocery_store: "retail",
        supermarket: "retail",
        convenience_store: "retail",
        clothing_store: "retail",
        electronics_store: "retail",
        shopping_mall: "retail",
        book_store: "retail",
        jewelry_store: "retail",
        shoe_store: "retail",
        hardware_store: "retail",
        furniture_store: "retail",
        department_store: "retail",
        florist: "retail",
        pet_store: "retail",
        bicycle_store: "retail",
        sporting_goods_store: "retail",
        home_goods_store: "retail",
        gift_shop: "retail",
        drugstore: "retail",
        discount_store: "retail",
        market: "retail",
        gym: "health",
        fitness_center: "health",
        sports_club: "health",
        pharmacy: "health",
        doctor: "health",
        dentist: "health",
        hospital: "health",
        physiotherapist: "health",
        beauty_salon: "health",
        spa: "health",
        hair_salon: "health",
        nail_salon: "health",
        barbershop: "health",
        massage_therapist: "health",
        veterinary_care: "health",
        movie_theater: "entertainment",
        bowling_alley: "entertainment",
        casino: "entertainment",
        amusement_park: "entertainment",
        museum: "entertainment",
        art_gallery: "entertainment",
        stadium: "entertainment",
        bank: "services",
        atm: "services",
        car_repair: "services",
        car_wash: "services",
        laundry: "services",
        gas_station: "services",
        hotel: "services",
        lodging: "services",
        post_office: "services",
        car_rental: "services",
        real_estate_agency: "services",
      };

      const CATEGORY_IMAGE_POOLS: Record<string, string[]> = {
        food: [
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
        ],
        coffee: [
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
        ],
        retail: [
          "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
        ],
        health: [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
        ],
        entertainment: [
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=300&fit=crop",
        ],
        services: [
          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
        ],
      };

      function djb2(s: string): number {
        return s
          .split("")
          .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
      }

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.location",
              "places.types",
              "places.rating",
              "places.userRatingCount",
              "places.priceLevel",
              "places.regularOpeningHours",
              "places.internationalPhoneNumber",
              "places.websiteUri",
            ].join(","),
          },
          body: JSON.stringify({
            textQuery: query,
            maxResultCount: 20,
            locationBias: {
              circle: {
                center: {
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                },
                radius: parseFloat(radius),
              },
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("Google Places Text Search error:", errText);
        return res
          .status(response.status)
          .json({ error: "Google Places API error", businesses: [] });
      }

      const data = (await response.json()) as { places?: any[] };
      const places = data.places ?? [];

      const priceLevelMap: Record<string, string> = {
        PRICE_LEVEL_FREE: "$",
        PRICE_LEVEL_INEXPENSIVE: "$",
        PRICE_LEVEL_MODERATE: "$$",
        PRICE_LEVEL_EXPENSIVE: "$$$",
        PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
      };

      const businesses = places.map((place: any) => {
        const name: string = place.displayName?.text ?? "Unknown";
        const types: string[] = place.types ?? [];
        const category =
          types.map((t: string) => PLACES_TYPE_CATEGORY[t]).find(Boolean) ??
          "services";
        const pool =
          CATEGORY_IMAGE_POOLS[category] ?? CATEGORY_IMAGE_POOLS.food;
        const image = pool[djb2(name) % pool.length];
        const hours: string =
          place.regularOpeningHours?.weekdayDescriptions?.join("\n") ?? "";
        return {
          id: `gp-${place.id}`,
          name,
          category,
          rating:
            place.rating ?? Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
          reviewCount:
            place.userRatingCount ?? Math.floor(Math.random() * 300) + 20,
          address: place.formattedAddress ?? "",
          hours,
          description: `${name} – ${(types[0] ?? "business").replace(/_/g, " ")}`,
          image,
          lat: place.location?.latitude ?? 0,
          lng: place.location?.longitude ?? 0,
          phone: place.internationalPhoneNumber ?? "",
          priceLevel: priceLevelMap[place.priceLevel] ?? "$$",
          website: place.websiteUri ?? undefined,
        };
      });

      res.json({ businesses });
    } catch (error) {
      console.error("Places text search error:", error);
      res
        .status(500)
        .json({ error: "Failed to search places", businesses: [] });
    }
  },
);

// ─── AI Search API ───────────────────────────────────────────────────────────

const aiSearchRateLimit = createRateLimiter(60 * 1000, 10); // 10 requests/minute

app.post(
  "/api/ai-search",
  aiSearchRateLimit,
  optionalAuthenticate,
  async (req: Request, res: Response) => {
    try {
      const { query, lat, lng } = req.body as {
        query: string;
        lat?: number;
        lng?: number;
      };

      const geminiKey = process.env.GEMINI_API_KEY;
      const placesKey = process.env.GOOGLE_PLACES_API_KEY;

      if (!geminiKey) {
        return res.status(503).json({
          error:
            "AI search is not configured. Add GEMINI_API_KEY to the server environment.",
        });
      }

      if (!query || typeof query !== "string" || query.trim().length < 3) {
        return res.status(400).json({
          error: "A search query of at least 3 characters is required",
        });
      }

      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const searchLat = typeof lat === "number" && !isNaN(lat) ? lat : 43.6532;
      const searchLng = typeof lng === "number" && !isNaN(lng) ? lng : -79.3832;

      // ── Step 1: Generate search queries from the natural-language input ─────
      // We do this algorithmically to save the Gemini quota for ranking.
      // Google Places Text Search handles natural language very well natively.
      const rawQuery = query.trim().slice(0, 500);
      // Remove filler words for a cleaner search variant
      const cleanQuery = rawQuery
        .replace(
          /\b(that|which|who|with|and|the|a|an|is|are|has|have|can|near\s*me|nearby|around\s*here|close\s*by|in\s*my\s*area)\b/gi,
          " ",
        )
        .replace(/\s+/g, " ")
        .trim();

      const keywords = rawQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 2 &&
            ![
              "that",
              "which",
              "who",
              "with",
              "and",
              "the",
              "for",
              "are",
              "has",
              "have",
              "can",
              "near",
              "nearby",
              "from",
              "this",
              "been",
              "does",
              "not",
              "its",
              "but",
              "also",
              "very",
              "just",
              "like",
              "some",
              "into",
              "bakes",
              "makes",
              "sells",
              "offers",
              "serves",
              "provides",
            ].includes(w),
        );

      // Build 2-3 search queries: raw query (best for Google) + cleaned version
      const searchQueries = [rawQuery];
      if (cleanQuery !== rawQuery && cleanQuery.length >= 3) {
        searchQueries.push(cleanQuery);
      }

      // ── Step 2: Fetch businesses from Google Places Text Search ─────────────
      // Google handles natural language natively — "bakery wedding cakes" works great.

      const PLACES_TYPE_CATEGORY: Record<string, string> = {
        restaurant: "food",
        fast_food_restaurant: "food",
        meal_takeaway: "food",
        bar: "food",
        pub: "food",
        bakery: "food",
        sandwich_shop: "food",
        pizza_restaurant: "food",
        hamburger_restaurant: "food",
        sushi_restaurant: "food",
        seafood_restaurant: "food",
        steak_house: "food",
        dessert_shop: "food",
        cafe: "coffee",
        coffee_shop: "coffee",
        tea_house: "coffee",
        juice_bar: "coffee",
        ice_cream_shop: "coffee",
        grocery_store: "retail",
        supermarket: "retail",
        convenience_store: "retail",
        clothing_store: "retail",
        electronics_store: "retail",
        shopping_mall: "retail",
        book_store: "retail",
        jewelry_store: "retail",
        shoe_store: "retail",
        hardware_store: "retail",
        furniture_store: "retail",
        department_store: "retail",
        florist: "retail",
        pet_store: "retail",
        sporting_goods_store: "retail",
        home_goods_store: "retail",
        gift_shop: "retail",
        drugstore: "retail",
        market: "retail",
        gym: "health",
        fitness_center: "health",
        pharmacy: "health",
        doctor: "health",
        dentist: "health",
        hospital: "health",
        beauty_salon: "health",
        spa: "health",
        hair_salon: "health",
        nail_salon: "health",
        barbershop: "health",
        movie_theater: "entertainment",
        bowling_alley: "entertainment",
        casino: "entertainment",
        amusement_park: "entertainment",
        museum: "entertainment",
        art_gallery: "entertainment",
        bank: "services",
        car_repair: "services",
        car_wash: "services",
        laundry: "services",
        gas_station: "services",
        hotel: "services",
        lodging: "services",
        post_office: "services",
      };

      const CATEGORY_IMAGE_POOLS: Record<string, string[]> = {
        food: [
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
        ],
        coffee: [
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
        ],
        retail: [
          "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
        ],
        health: [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
        ],
        entertainment: [
          "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=300&fit=crop",
        ],
        services: [
          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop",
          "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop",
        ],
      };

      function djb2(s: string): number {
        return s
          .split("")
          .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
      }

      const haversine = (
        lt1: number,
        ln1: number,
        lt2: number,
        ln2: number,
      ) => {
        const R = 6371;
        const dLat = ((lt2 - lt1) * Math.PI) / 180;
        const dLng = ((ln2 - ln1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lt1 * Math.PI) / 180) *
            Math.cos((lt2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      type PlaceResult = {
        id: string;
        name: string;
        lat: number;
        lng: number;
        distanceKm: number;
        rating: number | null;
        reviewCount: number;
        address: string;
        category: string;
        types: string[];
        phone: string | null;
        website: string | null;
        openingHours: string | null;
        image: string;
      };

      let allPlaces: PlaceResult[] = [];

      if (placesKey) {
        // Run multiple search queries in parallel for better coverage
        const searchPromises = searchQueries.map(async (sq) => {
          try {
            const response = await fetch(
              "https://places.googleapis.com/v1/places:searchText",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Goog-Api-Key": placesKey,
                  "X-Goog-FieldMask": [
                    "places.id",
                    "places.displayName",
                    "places.formattedAddress",
                    "places.location",
                    "places.types",
                    "places.rating",
                    "places.userRatingCount",
                    "places.priceLevel",
                    "places.regularOpeningHours",
                    "places.internationalPhoneNumber",
                    "places.websiteUri",
                    "places.editorialSummary",
                  ].join(","),
                },
                body: JSON.stringify({
                  textQuery: sq,
                  maxResultCount: 10,
                  locationBias: {
                    circle: {
                      center: { latitude: searchLat, longitude: searchLng },
                      radius: 15000,
                    },
                  },
                }),
                signal: AbortSignal.timeout(15000),
              },
            );
            if (!response.ok) return [];
            const data = (await response.json()) as { places?: any[] };
            return data.places ?? [];
          } catch (e) {
            console.warn(
              `[AI Search] Google Places search failed for "${sq}":`,
              e,
            );
            return [];
          }
        });

        const searchResults = await Promise.all(searchPromises);
        const seenIds = new Set<string>();

        for (const places of searchResults) {
          for (const place of places) {
            const placeId = place.id;
            if (seenIds.has(placeId)) continue;
            seenIds.add(placeId);

            const name: string = place.displayName?.text ?? "Unknown";
            const types: string[] = place.types ?? [];
            const category =
              types.map((t: string) => PLACES_TYPE_CATEGORY[t]).find(Boolean) ??
              "services";
            const pool =
              CATEGORY_IMAGE_POOLS[category] ?? CATEGORY_IMAGE_POOLS.food;
            const image = pool[djb2(name) % pool.length];
            const pLat = place.location?.latitude ?? 0;
            const pLng = place.location?.longitude ?? 0;
            const distanceKm = haversine(searchLat, searchLng, pLat, pLng);
            const hours: string =
              place.regularOpeningHours?.weekdayDescriptions?.join("\n") ?? "";

            allPlaces.push({
              id: `gp-${placeId}`,
              name,
              lat: pLat,
              lng: pLng,
              distanceKm,
              rating: place.rating ?? null,
              reviewCount: place.userRatingCount ?? 0,
              address: place.formattedAddress ?? "",
              category,
              types,
              phone: place.internationalPhoneNumber ?? null,
              website: place.websiteUri ?? null,
              openingHours: hours || null,
              image,
            });
          }
        }

        console.log(
          `[AI Search] Google Places returned ${allPlaces.length} unique results`,
        );
      } else {
        console.warn(
          "[AI Search] No GOOGLE_PLACES_API_KEY — skipping Google Places",
        );
      }

      // ── Step 3: Use Gemini to rank and explain results ──────────────────────
      // Instead of manual scoring, let Gemini (which understands the query deeply)
      // pick the best matches and explain why.

      if (allPlaces.length === 0) {
        return res.json({
          results: [],
          parsed: {
            category: "general",
            keywords,
            description: rawQuery,
          },
          message:
            "No businesses found nearby for your query. Try broadening it or enable location access.",
        });
      }

      // Sort by distance first to give nearby places priority
      allPlaces.sort((a, b) => a.distanceKm - b.distanceKm);

      // Limit candidates for Gemini ranking (top 20 by distance)
      const candidates = allPlaces.slice(0, 20);

      const rankPrompt = `You are a local business recommendation expert. The user is searching for:
"${rawQuery}"

Here are ${candidates.length} nearby businesses. Pick the TOP 5 that BEST match the user's query (considering relevance, quality, and distance). For each, write a specific 10-20 word reason explaining WHY it matches.

Businesses:
${candidates.map((p, i) => `${i + 1}. "${p.name}" | ${p.address} | types: ${p.types.slice(0, 5).join(", ")} | rating: ${p.rating ?? "N/A"} (${p.reviewCount} reviews) | ${p.distanceKm.toFixed(1)}km away`).join("\n")}

Return ONLY valid compact JSON (no markdown, no comments):
{
  "rankings": [
    {"index": 1, "reason": "Specific reason why this matches the query", "score": 95},
    {"index": 3, "reason": "Specific reason why this matches", "score": 88}
  ]
}

RULES:
- "index" is the 1-based number from the list above
- Return exactly up to 5 results, ordered by best match first
- "score" is 0-100 (100 = perfect match)
- Be SPECIFIC in reasons — reference what makes this business match the niche query
- If a business clearly doesn't match the query, don't include it
- Prefer businesses with higher ratings and more reviews when relevance is similar
- Prefer closer businesses when relevance is similar`;

      type RankResult = { index: number; reason: string; score: number };
      let rankings: RankResult[] = [];

      try {
        const rankResp = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: rankPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
          }),
          signal: AbortSignal.timeout(15000),
        });
        const rankData = (await rankResp.json()) as any;
        if (!rankData.candidates?.length) {
          console.warn(
            "[AI Search] Gemini ranking: no candidates in response.",
            JSON.stringify(rankData).slice(0, 300),
          );
        }
        const raw = rankData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
        console.log(
          "[AI Search] Gemini ranking raw response:",
          raw.slice(0, 500),
        );
        const clean = raw.replace(/```json\n?|```\n?/g, "").trim();
        const maybeR = JSON.parse(clean);
        if (maybeR?.rankings && Array.isArray(maybeR.rankings)) {
          rankings = maybeR.rankings
            .filter(
              (r: any) =>
                typeof r.index === "number" &&
                r.index >= 1 &&
                r.index <= candidates.length,
            )
            .slice(0, 5);
          console.log("[AI Search] Gemini ranked", rankings.length, "results");
        } else {
          console.warn(
            "[AI Search] Gemini ranking response missing 'rankings' array:",
            JSON.stringify(maybeR).slice(0, 200),
          );
        }
      } catch (e) {
        console.warn(
          "[AI Search] Gemini ranking failed, using distance-based fallback:",
          e,
        );
      }

      // Fallback: if Gemini ranking failed, score by keyword match + rating + proximity
      if (rankings.length === 0) {
        const queryLower = rawQuery.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

        const fallbackScored = candidates.map((p, i) => {
          const nameLower = p.name.toLowerCase();
          const typesStr = p.types.join(" ").toLowerCase();
          const allText = `${nameLower} ${typesStr} ${p.address.toLowerCase()}`;

          // Keyword relevance: how many query words appear in the business info
          const kwHits = queryWords.filter((w) => allText.includes(w)).length;
          const kwScore =
            queryWords.length > 0 ? kwHits / queryWords.length : 0;

          // Rating score: normalized 0-1 (3.0 = 0, 5.0 = 1)
          const ratingScore = p.rating
            ? Math.max(0, (p.rating - 3.0) / 2.0)
            : 0.3;

          // Review count score: more reviews = more credible
          const reviewScore = Math.min(1, p.reviewCount / 200);

          // Distance penalty: closer is better (0km = 1.0, 5km = 0.5, 15km = 0.25)
          const distScore = 1 / (1 + p.distanceKm * 0.2);

          // Weighted composite
          const total =
            0.35 * kwScore +
            0.25 * ratingScore +
            0.1 * reviewScore +
            0.3 * distScore;

          return { index: i + 1, score: Math.round(total * 100), place: p };
        });

        fallbackScored.sort((a, b) => b.score - a.score);

        rankings = fallbackScored
          .slice(0, 5)
          .map(({ index, score, place }) => ({
            index,
            reason: `${place.name} — ${place.rating ? `rated ${place.rating}★` : ""} ${place.distanceKm.toFixed(1)}km away. Matched for "${queryWords.slice(0, 3).join(", ")}".`,
            score: Math.max(40, Math.min(95, score)),
          }));
      }

      // ── Step 4: Build and return response ───────────────────────────────────
      const results = rankings.map((r) => {
        const place = candidates[r.index - 1];
        return {
          id: place.id,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          distanceKm: Math.round(place.distanceKm * 10) / 10,
          rating: place.rating,
          address: place.address || null,
          category: place.category,
          cuisine: null as string | null,
          phone: place.phone,
          website: place.website,
          openingHours: place.openingHours,
          featureMatches: [] as string[],
          matchReason: r.reason,
          score: r.score,
          image: place.image,
          reviewCount: place.reviewCount,
        };
      });

      res.json({
        results,
        parsed: {
          category: "general",
          keywords,
          description: rawQuery,
        },
        message: null,
      });
    } catch (error) {
      console.error("[AI Search] Unhandled error:", error);
      res.status(500).json({ error: "AI search failed. Please try again." });
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
