import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  role: "user" | "admin";
  hashedPassword?: string; // For non-Google users
  isVerified: boolean;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  text: string;
  helpfulCount: number;
  userFoundHelpful?: boolean;
  createdAt: string;
}

export type RideshareStatus =
  | "waiting"
  | "accepted"
  | "in_transit"
  | "completed"
  | "cancelled";

export interface Rideshare {
  id: string;
  creatorId: string;
  creatorName: string;
  driverId: string | null;
  driverName: string | null;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  maxPassengers: number;
  currentPassengers: number;
  status: RideshareStatus;
  note: string | null;
  shareCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface RidesharePassenger {
  id: string;
  rideshareId: string;
  userId: string;
  userName: string;
  joinedAt: string;
}

export interface Coupon {
  id: string;
  businessId: string;
  title: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  couponCode: string;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  isPremiumOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseUser extends Omit<User, "id"> {
  id: number;
}

class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        google_id TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        hashed_password TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT email_or_google CHECK (
          (google_id IS NOT NULL AND hashed_password IS NULL) OR
          (google_id IS NULL AND hashed_password IS NOT NULL)
        )
      )
    `);

    // Create sessions table for JWT blacklisting
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        jti TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create reviews table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        text TEXT NOT NULL,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (business_id, user_id)
      )
    `);

    // Create review_helpful pivot table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS review_helpful (
        review_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (review_id, user_id),
        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(jti);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    `);

    // Create coupons table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
        discount_value REAL NOT NULL CHECK (discount_value > 0),
        coupon_code TEXT NOT NULL UNIQUE,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        is_premium_only BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (end_date > start_date),
        CHECK (usage_limit IS NULL OR usage_count <= usage_limit)
      )
    `);

    // Create indexes for coupons
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(coupon_code);
      CREATE INDEX IF NOT EXISTS idx_coupons_business ON coupons(business_id);
      CREATE INDEX IF NOT EXISTS idx_coupons_end_date ON coupons(end_date);
      CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
    `);

    // Photo cache: stores resolved Google Places photo URLs keyed by business
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS business_photos (
        cache_key TEXT PRIMARY KEY,
        photo_url TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create rideshares table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rideshares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        driver_id INTEGER,
        origin_name TEXT NOT NULL,
        origin_lat REAL NOT NULL,
        origin_lng REAL NOT NULL,
        destination_name TEXT NOT NULL,
        destination_lat REAL NOT NULL,
        destination_lng REAL NOT NULL,
        max_passengers INTEGER NOT NULL DEFAULT 4 CHECK (max_passengers >= 1 AND max_passengers <= 4),
        status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'accepted', 'in_transit', 'completed', 'cancelled')),
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // Create rideshare_passengers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rideshare_passengers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rideshare_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rideshare_id) REFERENCES rideshares (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (rideshare_id, user_id)
      )
    `);

    // Add share_code column (migration for existing DBs)
    // Note: SQLite ALTER TABLE cannot add columns with UNIQUE constraint;
    // uniqueness is enforced via the UNIQUE INDEX created below instead.
    try {
      this.db.exec(`ALTER TABLE rideshares ADD COLUMN share_code TEXT`);
    } catch {
      // Column already exists — ignore
    }

    // Add is_premium column to users (migration for existing DBs)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT 0`);
    } catch {
      // Column already exists — ignore
    }

    // Create indexes for rideshares
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rideshares_status ON rideshares(status);
      CREATE INDEX IF NOT EXISTS idx_rideshares_creator ON rideshares(creator_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rideshares_share_code ON rideshares(share_code);
      CREATE INDEX IF NOT EXISTS idx_rideshare_passengers_rideshare ON rideshare_passengers(rideshare_id);
      CREATE INDEX IF NOT EXISTS idx_rideshare_passengers_user ON rideshare_passengers(user_id);
    `);

    // Create the first admin user if no users exist
    this.createDefaultAdmin();
  }

  private createDefaultAdmin(): void {
    const userCount = this.db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get() as { count: number };

    if (userCount.count === 0) {
      console.log("Creating default admin user...");
      // Use synchronous bcrypt hash so the insertion is atomic with the rest
      // of initializeTables (which runs in the constructor and cannot be async).
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
      const hashedPassword = bcrypt.hashSync("admin123", saltRounds);
      this.db
        .prepare(
          `INSERT INTO users (email, name, google_id, role, hashed_password, is_verified)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "admin@proximiti.local",
          "Administrator",
          null,
          "admin",
          hashedPassword,
          1,
        );
      console.log(
        "Default admin user created. Email: admin@proximiti.local, Password: admin123",
      );
      console.log(
        "IMPORTANT: Change the admin password immediately after first login!",
      );
    }
  }

  async createUser(userData: {
    email: string;
    name: string;
    role?: "user" | "admin";
    password?: string;
    googleId?: string;
    isVerified?: boolean;
  }): Promise<User> {
    const {
      email,
      name,
      role = "user",
      password,
      googleId,
      isVerified = false,
    } = userData;

    let hashedPassword: string | null = null;
    if (password && !googleId) {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    const stmt = this.db.prepare(`
      INSERT INTO users (email, name, google_id, role, hashed_password, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        email,
        name,
        googleId ?? null,
        role,
        hashedPassword,
        isVerified ? 1 : 0,
      );
      return this.getUserById(result.lastInsertRowid as number);
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("User with this email already exists");
      }
      throw error;
    }
  }

  getUserById(id: number): User {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role, 
             hashed_password as hashedPassword, is_verified as isVerified,
             is_premium as isPremium,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE id = ?
    `);
    const user = stmt.get(id) as DatabaseUser | undefined;
    if (!user) {
      throw new Error("User not found");
    }
    return {
      ...user,
      id: user.id.toString(),
      isPremium: Boolean(user.isPremium),
    };
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role,
             hashed_password as hashedPassword, is_verified as isVerified,
             is_premium as isPremium,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE email = ?
    `);
    const user = stmt.get(email) as DatabaseUser | undefined;
    return user
      ? { ...user, id: user.id.toString(), isPremium: Boolean(user.isPremium) }
      : null;
  }

  getUserByGoogleId(googleId: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role,
             hashed_password as hashedPassword, is_verified as isVerified,
             is_premium as isPremium,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE google_id = ?
    `);
    const user = stmt.get(googleId) as DatabaseUser | undefined;
    return user
      ? { ...user, id: user.id.toString(), isPremium: Boolean(user.isPremium) }
      : null;
  }

  getAllUsers(limit: number = 100, offset: number = 0): User[] {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role,
             hashed_password as hashedPassword, is_verified as isVerified,
             is_premium as isPremium,
             created_at as createdAt, updated_at as updatedAt
      FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?
    `);
    const users = stmt.all(limit, offset) as DatabaseUser[];
    return users.map((user) => ({
      ...user,
      id: user.id.toString(),
      isPremium: Boolean(user.isPremium),
    }));
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = this.getUserByEmail(email);
    if (!user || !user.hashedPassword) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    return isValid ? user : null;
  }

  updateUser(id: string, updates: Partial<Omit<User, "id">>): User {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(", ")} WHERE id = ?
    `);

    stmt.run(...values);
    return this.getUserById(parseInt(id));
  }

  deleteUser(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  setPremiumStatus(id: string, isPremium: boolean): User {
    const stmt = this.db.prepare(`
      UPDATE users SET is_premium = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(isPremium ? 1 : 0, id);
    return this.getUserById(parseInt(id));
  }

  // Session management for JWT blacklisting
  createSession(userId: string, jti: string, expiresAt: Date): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (user_id, jti, expires_at)
      VALUES (?, ?, datetime(?))
    `);
    stmt.run(userId, jti, expiresAt.toISOString());
  }

  isSessionValid(jti: string): boolean {
    const stmt = this.db.prepare(`
      SELECT id FROM sessions 
      WHERE jti = ? AND expires_at > datetime('now')
    `);
    const session = stmt.get(jti);
    return !!session;
  }

  revokeSession(jti: string): void {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE jti = ?");
    stmt.run(jti);
  }

  revokeAllUserSessions(userId: string): void {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE user_id = ?");
    stmt.run(userId);
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const stmt = this.db.prepare(
      "DELETE FROM sessions WHERE expires_at <= datetime('now')",
    );
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired sessions`);
    }
  }

  // ─── Review Methods ────────────────────────────────────────────────────────

  createReview(
    businessId: string,
    userId: string,
    rating: number,
    text: string,
  ): Review {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (business_id, user_id, rating, text)
      VALUES (?, ?, ?, ?)
    `);
    try {
      const result = stmt.run(businessId, userId, rating, text);
      return this.getReviewById(result.lastInsertRowid as number);
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("You have already reviewed this business");
      }
      throw error;
    }
  }

  getReviewById(id: number, requestingUserId?: string): Review {
    const row = this.db
      .prepare(
        `
      SELECT r.id, r.business_id, r.user_id, u.name as user_name, u.email as user_email,
             r.rating, r.text, r.helpful_count, r.created_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `,
      )
      .get(id) as any;
    if (!row) throw new Error("Review not found");

    let userFoundHelpful = false;
    if (requestingUserId) {
      const h = this.db
        .prepare(
          "SELECT 1 FROM review_helpful WHERE review_id = ? AND user_id = ?",
        )
        .get(id, requestingUserId);
      userFoundHelpful = !!h;
    }

    return {
      id: row.id.toString(),
      businessId: row.business_id,
      userId: row.user_id.toString(),
      userName: row.user_name,
      userEmail: row.user_email,
      rating: row.rating,
      text: row.text,
      helpfulCount: row.helpful_count,
      userFoundHelpful,
      createdAt: row.created_at,
    };
  }

  getReviewsForBusiness(
    businessId: string,
    limit: number = 10,
    offset: number = 0,
    requestingUserId?: string,
  ): { reviews: Review[]; total: number } {
    const total = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM reviews WHERE business_id = ?")
        .get(businessId) as { count: number }
    ).count;

    const rows = this.db
      .prepare(
        `
      SELECT r.id, r.business_id, r.user_id, u.name as user_name, u.email as user_email,
             r.rating, r.text, r.helpful_count, r.created_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = ?
      ORDER BY r.helpful_count DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(businessId, limit, offset) as any[];

    const helpfulSet = new Set<number>();
    if (requestingUserId && rows.length > 0) {
      const ids = rows.map((r: any) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const helpful = this.db
        .prepare(
          `SELECT review_id FROM review_helpful WHERE user_id = ? AND review_id IN (${placeholders})`,
        )
        .all(requestingUserId, ...ids) as { review_id: number }[];
      helpful.forEach((h) => helpfulSet.add(h.review_id));
    }

    const reviews: Review[] = rows.map((row: any) => ({
      id: row.id.toString(),
      businessId: row.business_id,
      userId: row.user_id.toString(),
      userName: row.user_name,
      userEmail: row.user_email,
      rating: row.rating,
      text: row.text,
      helpfulCount: row.helpful_count,
      userFoundHelpful: helpfulSet.has(row.id),
      createdAt: row.created_at,
    }));

    return { reviews, total };
  }

  getUserReviewForBusiness(businessId: string, userId: string): Review | null {
    const row = this.db
      .prepare(
        `
      SELECT r.id, r.business_id, r.user_id, u.name as user_name, u.email as user_email,
             r.rating, r.text, r.helpful_count, r.created_at
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = ? AND r.user_id = ?
    `,
      )
      .get(businessId, userId) as any;
    if (!row) return null;
    return {
      id: row.id.toString(),
      businessId: row.business_id,
      userId: row.user_id.toString(),
      userName: row.user_name,
      userEmail: row.user_email,
      rating: row.rating,
      text: row.text,
      helpfulCount: row.helpful_count,
      userFoundHelpful: false,
      createdAt: row.created_at,
    };
  }

  getProximitiReviewCount(businessId: string): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM reviews WHERE business_id = ?")
      .get(businessId) as { count: number };
    return result.count;
  }

  /** Toggle helpful – returns new state (true = now helpful) */
  toggleHelpful(reviewId: string, userId: string): boolean {
    const existing = this.db
      .prepare(
        "SELECT 1 FROM review_helpful WHERE review_id = ? AND user_id = ?",
      )
      .get(reviewId, userId);

    if (existing) {
      this.db
        .prepare(
          "DELETE FROM review_helpful WHERE review_id = ? AND user_id = ?",
        )
        .run(reviewId, userId);
      this.db
        .prepare(
          "UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = ?",
        )
        .run(reviewId);
      return false;
    } else {
      this.db
        .prepare(
          "INSERT INTO review_helpful (review_id, user_id) VALUES (?, ?)",
        )
        .run(reviewId, userId);
      this.db
        .prepare(
          "UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?",
        )
        .run(reviewId);
      return true;
    }
  }

  // ─── Photo cache ─────────────────────────────────────────────────────────────

  cachePhoto(key: string, photoUrl: string): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO business_photos (cache_key, photo_url) VALUES (?, ?)",
      )
      .run(key, photoUrl);
  }

  getCachedPhoto(key: string): string | null {
    const row = this.db
      .prepare("SELECT photo_url FROM business_photos WHERE cache_key = ?")
      .get(key) as { photo_url: string } | undefined;
    return row?.photo_url ?? null;
  }

  // ─── Coupon Methods ──────────────────────────────────────────────────────────

  createCoupon(couponData: {
    businessId: string;
    title: string;
    description: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    couponCode: string;
    startDate: Date;
    endDate: Date;
    usageLimit?: number;
    isPremiumOnly?: boolean;
  }): Coupon {
    const {
      businessId,
      title,
      description,
      discountType,
      discountValue,
      couponCode,
      startDate,
      endDate,
      usageLimit,
      isPremiumOnly,
    } = couponData;

    // Validate dates
    if (endDate <= startDate) {
      throw new Error("End date must be after start date");
    }

    // Validate discount value
    if (discountValue <= 0) {
      throw new Error("Discount value must be positive");
    }

    if (discountType === "percentage" && discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }

    const stmt = this.db.prepare(`
      INSERT INTO coupons (
        business_id, title, description, discount_type, discount_value,
        coupon_code, start_date, end_date, usage_limit, is_premium_only
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        businessId,
        title,
        description,
        discountType,
        discountValue,
        couponCode.toUpperCase(),
        startDate.toISOString(),
        endDate.toISOString(),
        usageLimit ?? null,
        isPremiumOnly ? 1 : 0,
      );
      return this.getCouponById(result.lastInsertRowid as number);
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("Coupon code already exists");
      }
      throw error;
    }
  }

  getCouponById(id: number): Coupon {
    const stmt = this.db.prepare(`
      SELECT id, business_id as businessId, title, description,
             discount_type as discountType, discount_value as discountValue,
             coupon_code as couponCode, start_date as startDate,
             end_date as endDate, usage_limit as usageLimit,
             usage_count as usageCount, is_active as isActive,
             is_premium_only as isPremiumOnly,
             created_at as createdAt, updated_at as updatedAt
      FROM coupons WHERE id = ?
    `);
    const coupon = stmt.get(id) as any;
    if (!coupon) {
      throw new Error("Coupon not found");
    }
    return {
      ...coupon,
      id: coupon.id.toString(),
      isActive: Boolean(coupon.isActive),
      isPremiumOnly: Boolean(coupon.isPremiumOnly),
    };
  }

  getCouponByCode(couponCode: string): Coupon | null {
    const stmt = this.db.prepare(`
      SELECT id, business_id as businessId, title, description,
             discount_type as discountType, discount_value as discountValue,
             coupon_code as couponCode, start_date as startDate,
             end_date as endDate, usage_limit as usageLimit,
             usage_count as usageCount, is_active as isActive,
             is_premium_only as isPremiumOnly,
             created_at as createdAt, updated_at as updatedAt
      FROM coupons WHERE coupon_code = ?
    `);
    const coupon = stmt.get(couponCode.toUpperCase()) as any;
    if (!coupon) return null;
    return {
      ...coupon,
      id: coupon.id.toString(),
      isActive: Boolean(coupon.isActive),
      isPremiumOnly: Boolean(coupon.isPremiumOnly),
    };
  }

  getActiveCouponsForBusiness(businessId: string): Coupon[] {
    const stmt = this.db.prepare(`
      SELECT id, business_id as businessId, title, description,
             discount_type as discountType, discount_value as discountValue,
             coupon_code as couponCode, start_date as startDate,
             end_date as endDate, usage_limit as usageLimit,
             usage_count as usageCount, is_active as isActive,
             is_premium_only as isPremiumOnly,
             created_at as createdAt, updated_at as updatedAt
      FROM coupons 
      WHERE business_id = ? 
        AND is_active = 1
        AND datetime(start_date) <= datetime('now')
        AND datetime(end_date) >= datetime('now')
      ORDER BY end_date ASC
    `);
    const coupons = stmt.all(businessId) as any[];
    return coupons.map((c) => ({
      ...c,
      id: c.id.toString(),
      isActive: Boolean(c.isActive),
      isPremiumOnly: Boolean(c.isPremiumOnly),
    }));
  }

  getAllCouponsForBusiness(businessId: string): Coupon[] {
    const stmt = this.db.prepare(`
      SELECT id, business_id as businessId, title, description,
             discount_type as discountType, discount_value as discountValue,
             coupon_code as couponCode, start_date as startDate,
             end_date as endDate, usage_limit as usageLimit,
             usage_count as usageCount, is_active as isActive,
             is_premium_only as isPremiumOnly,
             created_at as createdAt, updated_at as updatedAt
      FROM coupons 
      WHERE business_id = ?
      ORDER BY created_at DESC
    `);
    const coupons = stmt.all(businessId) as any[];
    return coupons.map((c) => ({
      ...c,
      id: c.id.toString(),
      isActive: Boolean(c.isActive),
      isPremiumOnly: Boolean(c.isPremiumOnly),
    }));
  }

  getAllCoupons(): Coupon[] {
    const stmt = this.db.prepare(`
      SELECT id, business_id as businessId, title, description,
             discount_type as discountType, discount_value as discountValue,
             coupon_code as couponCode, start_date as startDate,
             end_date as endDate, usage_limit as usageLimit,
             usage_count as usageCount, is_active as isActive,
             is_premium_only as isPremiumOnly,
             created_at as createdAt, updated_at as updatedAt
      FROM coupons 
      ORDER BY created_at DESC
    `);
    const coupons = stmt.all() as any[];
    return coupons.map((c) => ({
      ...c,
      id: c.id.toString(),
      isActive: Boolean(c.isActive),
      isPremiumOnly: Boolean(c.isPremiumOnly),
    }));
  }

  updateCoupon(
    id: string,
    updates: Partial<
      Omit<
        Coupon,
        "id" | "couponCode" | "usageCount" | "createdAt" | "updatedAt"
      >
    >,
  ): Coupon {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();

        // Handle date conversions
        if (key === "startDate" || key === "endDate") {
          fields.push(`${dbKey} = ?`);
          values.push(new Date(value as string).toISOString());
        } else {
          fields.push(`${dbKey} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE coupons SET ${fields.join(", ")} WHERE id = ?
    `);

    stmt.run(...values);
    return this.getCouponById(parseInt(id));
  }

  deleteCoupon(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM coupons WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  redeemCoupon(couponCode: string): {
    success: boolean;
    coupon?: Coupon;
    error?: string;
  } {
    const coupon = this.getCouponByCode(couponCode);

    if (!coupon) {
      return { success: false, error: "Coupon not found" };
    }

    if (!coupon.isActive) {
      return { success: false, error: "Coupon is not active" };
    }

    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (now < startDate) {
      return { success: false, error: "Coupon is not yet valid" };
    }

    if (now > endDate) {
      return { success: false, error: "Coupon has expired" };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, error: "Coupon usage limit reached" };
    }

    // Increment usage count
    const stmt = this.db.prepare(`
      UPDATE coupons 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(coupon.id);

    // Get updated coupon
    const updatedCoupon = this.getCouponById(parseInt(coupon.id));

    return { success: true, coupon: updatedCoupon };
  }

  // Get count of active coupons for a business (for badge display)
  getActiveCouponCount(businessId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM coupons 
      WHERE business_id = ? 
        AND is_active = 1
        AND datetime(start_date) <= datetime('now')
        AND datetime(end_date) >= datetime('now')
    `);
    const result = stmt.get(businessId) as { count: number };
    return result.count;
  }

  // Auto-expire coupons (for cron job)
  expireOldCoupons(): number {
    const stmt = this.db.prepare(`
      UPDATE coupons 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE is_active = 1 AND datetime(end_date) < datetime('now')
    `);
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Auto-expired ${result.changes} coupons`);
    }
    return result.changes;
  }

  // ─── Rideshare Methods ───────────────────────────────────────────────────────

  createRideshare(data: {
    creatorId: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    maxPassengers: number;
    note?: string;
  }): Rideshare {
    const {
      creatorId,
      originName,
      originLat,
      originLng,
      destinationName,
      destinationLat,
      destinationLng,
      maxPassengers,
      note,
    } = data;

    if (maxPassengers < 1 || maxPassengers > 4) {
      throw new Error("Max passengers must be between 1 and 4");
    }

    // Generate a unique 6-char share code
    const generateCode = (): string => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 to avoid confusion
      let code = "";
      for (let i = 0; i < 6; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };
    let shareCode = generateCode();
    // Ensure uniqueness (extremely unlikely collision but just in case)
    while (
      this.db
        .prepare("SELECT 1 FROM rideshares WHERE share_code = ?")
        .get(shareCode)
    ) {
      shareCode = generateCode();
    }

    const stmt = this.db.prepare(`
      INSERT INTO rideshares (
        creator_id, origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        max_passengers, note, share_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      creatorId,
      originName,
      originLat,
      originLng,
      destinationName,
      destinationLat,
      destinationLng,
      maxPassengers,
      note ?? null,
      shareCode,
    );

    // Creator is also the first passenger
    this.db
      .prepare(
        "INSERT INTO rideshare_passengers (rideshare_id, user_id) VALUES (?, ?)",
      )
      .run(result.lastInsertRowid, creatorId);

    return this.getRideshareById(result.lastInsertRowid as number);
  }

  getRideshareById(id: number): Rideshare {
    const row = this.db
      .prepare(
        `
      SELECT r.*, u1.name as creator_name, u2.name as driver_name,
        (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
      FROM rideshares r
      JOIN users u1 ON u1.id = r.creator_id
      LEFT JOIN users u2 ON u2.id = r.driver_id
      WHERE r.id = ?
    `,
      )
      .get(id) as any;

    if (!row) throw new Error("Rideshare not found");
    return this.mapRideshareRow(row);
  }

  getRideshareByShareCode(code: string): Rideshare | null {
    const row = this.db
      .prepare(
        `
      SELECT r.*, u1.name as creator_name, u2.name as driver_name,
        (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
      FROM rideshares r
      JOIN users u1 ON u1.id = r.creator_id
      LEFT JOIN users u2 ON u2.id = r.driver_id
      WHERE r.share_code = ?
    `,
      )
      .get(code.toUpperCase()) as any;

    if (!row) return null;
    return this.mapRideshareRow(row);
  }

  private mapRideshareRow(row: any): Rideshare {
    return {
      id: row.id.toString(),
      creatorId: row.creator_id.toString(),
      creatorName: row.creator_name,
      driverId: row.driver_id?.toString() ?? null,
      driverName: row.driver_name ?? null,
      originName: row.origin_name,
      originLat: row.origin_lat,
      originLng: row.origin_lng,
      destinationName: row.destination_name,
      destinationLat: row.destination_lat,
      destinationLng: row.destination_lng,
      maxPassengers: row.max_passengers,
      currentPassengers: row.current_passengers,
      status: row.status as RideshareStatus,
      note: row.note,
      shareCode: row.share_code ?? "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getActiveRideshares(): Rideshare[] {
    const rows = this.db
      .prepare(
        `
      SELECT r.*, u1.name as creator_name, u2.name as driver_name,
        (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
      FROM rideshares r
      JOIN users u1 ON u1.id = r.creator_id
      LEFT JOIN users u2 ON u2.id = r.driver_id
      WHERE r.status IN ('waiting', 'accepted')
      ORDER BY r.created_at DESC
    `,
      )
      .all() as any[];

    return rows.map((row: any) => this.mapRideshareRow(row));
  }

  getAllRideshares(includeCompleted: boolean = false): Rideshare[] {
    const statusFilter = includeCompleted
      ? ""
      : "WHERE r.status NOT IN ('completed', 'cancelled')";

    const rows = this.db
      .prepare(
        `
      SELECT r.*, u1.name as creator_name, u2.name as driver_name,
        (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
      FROM rideshares r
      JOIN users u1 ON u1.id = r.creator_id
      LEFT JOIN users u2 ON u2.id = r.driver_id
      ${statusFilter}
      ORDER BY r.created_at DESC
    `,
      )
      .all() as any[];

    return rows.map((row: any) => this.mapRideshareRow(row));
  }

  getUserRideshares(userId: string): Rideshare[] {
    const rows = this.db
      .prepare(
        `
      SELECT DISTINCT r.*, u1.name as creator_name, u2.name as driver_name,
        (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
      FROM rideshares r
      JOIN users u1 ON u1.id = r.creator_id
      LEFT JOIN users u2 ON u2.id = r.driver_id
      LEFT JOIN rideshare_passengers rp ON rp.rideshare_id = r.id
      WHERE r.creator_id = ? OR r.driver_id = ? OR rp.user_id = ?
      ORDER BY r.created_at DESC
    `,
      )
      .all(userId, userId, userId) as any[];

    return rows.map((row: any) => this.mapRideshareRow(row));
  }

  getRidesharePassengers(rideshareId: string): RidesharePassenger[] {
    const rows = this.db
      .prepare(
        `
      SELECT rp.id, rp.rideshare_id, rp.user_id, u.name as user_name, rp.joined_at
      FROM rideshare_passengers rp
      JOIN users u ON u.id = rp.user_id
      WHERE rp.rideshare_id = ?
      ORDER BY rp.joined_at ASC
    `,
      )
      .all(rideshareId) as any[];

    return rows.map((row: any) => ({
      id: row.id.toString(),
      rideshareId: row.rideshare_id.toString(),
      userId: row.user_id.toString(),
      userName: row.user_name,
      joinedAt: row.joined_at,
    }));
  }

  joinRideshare(
    rideshareId: string,
    userId: string,
  ): { success: boolean; error?: string } {
    const rideshare = this.getRideshareById(parseInt(rideshareId));

    if (!rideshare) {
      return { success: false, error: "Rideshare not found" };
    }

    if (rideshare.status === "in_transit") {
      return {
        success: false,
        error: "This ride is already in transit — lobby is closed",
      };
    }

    if (rideshare.status === "completed" || rideshare.status === "cancelled") {
      return { success: false, error: "This ride is no longer active" };
    }

    if (rideshare.currentPassengers >= rideshare.maxPassengers) {
      return { success: false, error: "This ride is full" };
    }

    // Check if already joined
    const existing = this.db
      .prepare(
        "SELECT 1 FROM rideshare_passengers WHERE rideshare_id = ? AND user_id = ?",
      )
      .get(rideshareId, userId);

    if (existing) {
      return { success: false, error: "You already joined this ride" };
    }

    try {
      this.db
        .prepare(
          "INSERT INTO rideshare_passengers (rideshare_id, user_id) VALUES (?, ?)",
        )
        .run(rideshareId, userId);

      this.db
        .prepare(
          "UPDATE rideshares SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .run(rideshareId);

      return { success: true };
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return { success: false, error: "You already joined this ride" };
      }
      throw error;
    }
  }

  leaveRideshare(
    rideshareId: string,
    userId: string,
  ): { success: boolean; error?: string } {
    const rideshare = this.getRideshareById(parseInt(rideshareId));

    if (rideshare.status === "in_transit") {
      return {
        success: false,
        error: "Cannot leave a ride that is in transit",
      };
    }

    if (rideshare.creatorId === userId) {
      return {
        success: false,
        error: "The creator cannot leave — cancel the ride instead",
      };
    }

    const result = this.db
      .prepare(
        "DELETE FROM rideshare_passengers WHERE rideshare_id = ? AND user_id = ?",
      )
      .run(rideshareId, userId);

    if (result.changes === 0) {
      return { success: false, error: "You are not in this ride" };
    }

    this.db
      .prepare(
        "UPDATE rideshares SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(rideshareId);

    return { success: true };
  }

  acceptTransport(
    rideshareId: string,
    driverId: string,
  ): { success: boolean; error?: string } {
    const rideshare = this.getRideshareById(parseInt(rideshareId));

    if (rideshare.status !== "waiting") {
      return {
        success: false,
        error: "This ride already has a driver or is no longer waiting",
      };
    }

    if (rideshare.creatorId === driverId) {
      return { success: false, error: "The creator cannot also be the driver" };
    }

    this.db
      .prepare(
        "UPDATE rideshares SET driver_id = ?, status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(driverId, rideshareId);

    return { success: true };
  }

  startTransport(
    rideshareId: string,
    driverId: string,
  ): { success: boolean; error?: string } {
    const rideshare = this.getRideshareById(parseInt(rideshareId));

    if (rideshare.driverId !== driverId) {
      return {
        success: false,
        error: "Only the assigned driver can start the transport",
      };
    }

    if (rideshare.status !== "accepted") {
      return {
        success: false,
        error: "Transport must be accepted before starting",
      };
    }

    this.db
      .prepare(
        "UPDATE rideshares SET status = 'in_transit', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(rideshareId);

    return { success: true };
  }

  completeRideshare(
    rideshareId: string,
    userId: string,
  ): { success: boolean; error?: string } {
    const rideshare = this.getRideshareById(parseInt(rideshareId));

    if (rideshare.driverId !== userId && rideshare.creatorId !== userId) {
      return {
        success: false,
        error: "Only the driver or creator can complete the ride",
      };
    }

    if (rideshare.status !== "in_transit") {
      return {
        success: false,
        error: "Can only complete a ride that is in transit",
      };
    }

    this.db
      .prepare(
        "UPDATE rideshares SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(rideshareId);

    return { success: true };
  }

  cancelRideshare(
    rideshareId: string,
    userId: string,
  ): { success: boolean; error?: string } {
    const rideshare = this.getRideshareById(parseInt(rideshareId));

    if (rideshare.creatorId !== userId && rideshare.driverId !== userId) {
      return { success: false, error: "Only the creator or driver can cancel" };
    }

    if (rideshare.status === "completed") {
      return { success: false, error: "Cannot cancel a completed ride" };
    }

    this.db
      .prepare(
        "UPDATE rideshares SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(rideshareId);

    return { success: true };
  }

  // Clean up old completed/cancelled rideshares (older than 24 hours)
  cleanupOldRideshares(): number {
    const stmt = this.db.prepare(`
      DELETE FROM rideshares
      WHERE status IN ('completed', 'cancelled')
        AND datetime(updated_at) < datetime('now', '-24 hours')
    `);
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} old rideshares`);
    }
    return result.changes;
  }

  // ─── Session management ─────────────────────────────────────────────────────

  close(): void {
    this.db.close();
  }
}

// Singleton instance
// Use process.cwd() as fallback so the DB always lands at the project root
// regardless of __dirname (which varies based on how tsx resolves the file).
const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");
export const db = new DatabaseManager(dbPath);

// Cleanup expired sessions every hour
setInterval(
  () => {
    db.cleanupExpiredSessions();
  },
  60 * 60 * 1000,
);

// Auto-expire coupons every hour
setInterval(
  () => {
    db.expireOldCoupons();
  },
  60 * 60 * 1000,
);

// Cleanup old rideshares every hour
setInterval(
  () => {
    db.cleanupOldRideshares();
  },
  60 * 60 * 1000,
);

export default db;
