import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcrypt";

export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  role: "user" | "admin";
  hashedPassword?: string;
  isVerified: boolean;
  isPremium: boolean;
  planType: "basic" | "essential" | "enterprise";
  planExpiresAt: string | null;
  stripeSubscriptionId?: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toBool(v: unknown): boolean {
  return v === 1 || v === 1n || v === true || v === "1";
}

function toNum(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : Number(v ?? 0);
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: row.email as string,
    name: row.name as string,
    googleId: row.googleId as string | undefined,
    role: row.role as "user" | "admin",
    hashedPassword: row.hashedPassword as string | undefined,
    isVerified: toBool(row.isVerified),
    isPremium: toBool(row.isPremium),
    planType: ((row.planType as string) || "basic") as
      | "basic"
      | "essential"
      | "enterprise",
    planExpiresAt: (row.planExpiresAt as string) ?? null,
    stripeSubscriptionId: (row.stripeSubscriptionId as string | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

function mapCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: String(row.id),
    businessId: row.businessId as string,
    title: row.title as string,
    description: row.description as string,
    discountType: row.discountType as "percentage" | "fixed",
    discountValue: toNum(row.discountValue),
    couponCode: row.couponCode as string,
    startDate: row.startDate as string,
    endDate: row.endDate as string,
    usageLimit: row.usageLimit != null ? toNum(row.usageLimit) : null,
    usageCount: toNum(row.usageCount),
    isActive: toBool(row.isActive),
    isPremiumOnly: toBool(row.isPremiumOnly),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

function mapRideshareRow(row: Record<string, unknown>): Rideshare {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    creatorName: row.creator_name as string,
    driverId: row.driver_id != null ? String(row.driver_id) : null,
    driverName: (row.driver_name as string) ?? null,
    originName: row.origin_name as string,
    originLat: toNum(row.origin_lat),
    originLng: toNum(row.origin_lng),
    destinationName: row.destination_name as string,
    destinationLat: toNum(row.destination_lat),
    destinationLng: toNum(row.destination_lng),
    maxPassengers: toNum(row.max_passengers),
    currentPassengers: toNum(row.current_passengers),
    status: row.status as RideshareStatus,
    note: (row.note as string) ?? null,
    shareCode: (row.share_code as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── DatabaseManager ──────────────────────────────────────────────────────────

class DatabaseManager {
  private client: Client;
  private initialized = false;

  constructor() {
    const url = process.env.DATABASE_URL || "file:database.sqlite";
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    this.client = createClient({ url, authToken });
  }

  /** Call once at server startup before handling requests. */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.initializeTables();
    this.initialized = true;
  }

  private async exec(sql: string): Promise<void> {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await this.client.execute(stmt);
    }
  }

  private async initializeTables(): Promise<void> {
    await this.client.execute("PRAGMA foreign_keys = ON");

    await this.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        google_id TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        hashed_password TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT 0,
        plan_type TEXT DEFAULT 'basic',
        plan_expires_at DATETIME DEFAULT NULL,
        stripe_subscription_id TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        jti TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    await this.exec(`
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

    await this.exec(`
      CREATE TABLE IF NOT EXISTS review_helpful (
        review_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (review_id, user_id),
        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(jti)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)`,
    );

    await this.exec(`
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(coupon_code)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_coupons_business ON coupons(business_id)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_coupons_end_date ON coupons(end_date)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active)`,
    );

    await this.exec(`
      CREATE TABLE IF NOT EXISTS business_photos (
        cache_key TEXT PRIMARY KEY,
        photo_url TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.exec(`
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
        share_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    await this.exec(`
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

    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_rideshares_status ON rideshares(status)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_rideshares_creator ON rideshares(creator_id)`,
    );
    await this.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_rideshares_share_code ON rideshares(share_code)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_rideshare_passengers_rideshare ON rideshare_passengers(rideshare_id)`,
    );
    await this.exec(
      `CREATE INDEX IF NOT EXISTS idx_rideshare_passengers_user ON rideshare_passengers(user_id)`,
    );

    await this.client.execute(
      "UPDATE users SET is_verified = 1 WHERE hashed_password IS NOT NULL AND is_verified = 0",
    );

    await this.createDefaultAdmin();
  }

  private async createDefaultAdmin(): Promise<void> {
    const result = await this.client.execute(
      "SELECT COUNT(*) as count FROM users",
    );
    const count = toNum((result.rows[0] as any).count);
    if (count === 0) {
      console.log("Creating default admin user...");
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
      const hashedPassword = await bcrypt.hash("admin123", saltRounds);
      await this.client.execute({
        sql: `INSERT INTO users (email, name, google_id, role, hashed_password, is_verified)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          "admin@proximiti.local",
          "Administrator",
          null,
          "admin",
          hashedPassword,
          1,
        ],
      });
      console.log(
        "Default admin created. Email: admin@proximiti.local Password: admin123",
      );
      console.log(
        "IMPORTANT: Change the admin password immediately after first login!",
      );
    }
  }

  // ─── User Methods ────────────────────────────────────────────────────────────

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
    try {
      const result = await this.client.execute({
        sql: `INSERT INTO users (email, name, google_id, role, hashed_password, is_verified)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          email,
          name,
          googleId ?? null,
          role,
          hashedPassword,
          isVerified ? 1 : 0,
        ],
      });
      return this.getUserById(toNum(result.lastInsertRowid));
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new Error("User with this email already exists");
      }
      throw error;
    }
  }

  async getUserById(id: number): Promise<User> {
    const result = await this.client.execute({
      sql: `SELECT id, email, name, google_id as googleId, role,
                   hashed_password as hashedPassword, is_verified as isVerified,
                   is_premium as isPremium, plan_type as planType,
                   plan_expires_at as planExpiresAt,
                   stripe_subscription_id as stripeSubscriptionId,
                   created_at as createdAt, updated_at as updatedAt
            FROM users WHERE id = ?`,
      args: [id],
    });
    if (!result.rows[0]) throw new Error("User not found");
    return mapUser(result.rows[0] as Record<string, unknown>);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.client.execute({
      sql: `SELECT id, email, name, google_id as googleId, role,
                   hashed_password as hashedPassword, is_verified as isVerified,
                   is_premium as isPremium, plan_type as planType,
                   plan_expires_at as planExpiresAt,
                   stripe_subscription_id as stripeSubscriptionId,
                   created_at as createdAt, updated_at as updatedAt
            FROM users WHERE email = ?`,
      args: [email],
    });
    if (!result.rows[0]) return null;
    return mapUser(result.rows[0] as Record<string, unknown>);
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const result = await this.client.execute({
      sql: `SELECT id, email, name, google_id as googleId, role,
                   hashed_password as hashedPassword, is_verified as isVerified,
                   is_premium as isPremium, plan_type as planType,
                   plan_expires_at as planExpiresAt,
                   stripe_subscription_id as stripeSubscriptionId,
                   created_at as createdAt, updated_at as updatedAt
            FROM users WHERE google_id = ?`,
      args: [googleId],
    });
    if (!result.rows[0]) return null;
    return mapUser(result.rows[0] as Record<string, unknown>);
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    const result = await this.client.execute({
      sql: `SELECT id, email, name, google_id as googleId, role,
                   hashed_password as hashedPassword, is_verified as isVerified,
                   is_premium as isPremium, plan_type as planType,
                   plan_expires_at as planExpiresAt,
                   stripe_subscription_id as stripeSubscriptionId,
                   created_at as createdAt, updated_at as updatedAt
            FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(mapUser);
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.hashedPassword) return null;
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    return isValid ? user : null;
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, "id">>,
  ): Promise<User> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | bigint | Date)[] = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
      }
    });
    if (fields.length === 0) throw new Error("No valid fields to update");
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await this.client.execute({
      sql: `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      args: values,
    });
    return this.getUserById(parseInt(id));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async setPremiumStatus(
    id: string,
    isPremium: boolean,
    planType: "basic" | "essential" | "enterprise" = "basic",
    planExpiresAt: string | null = null,
    stripeSubscriptionId: string | null = null,
  ): Promise<User> {
    await this.client.execute({
      sql: `UPDATE users
            SET is_premium = ?, plan_type = ?, plan_expires_at = ?,
                stripe_subscription_id = COALESCE(?, stripe_subscription_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        isPremium ? 1 : 0,
        planType,
        planExpiresAt,
        stripeSubscriptionId,
        id,
      ],
    });
    return this.getUserById(parseInt(id));
  }

  async setStripeSubscriptionId(
    id: string,
    subscriptionId: string | null,
  ): Promise<void> {
    await this.client.execute({
      sql: "UPDATE users SET stripe_subscription_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [subscriptionId, id],
    });
  }

  async clearPremiumStatus(id: string): Promise<User> {
    await this.client.execute({
      sql: `UPDATE users
            SET is_premium = 0, plan_type = 'basic', plan_expires_at = NULL,
                stripe_subscription_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [id],
    });
    return this.getUserById(parseInt(id));
  }

  // ─── Session Management ──────────────────────────────────────────────────────

  async createSession(
    userId: string,
    jti: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.client.execute({
      sql: "INSERT INTO sessions (user_id, jti, expires_at) VALUES (?, ?, datetime(?))",
      args: [userId, jti, expiresAt.toISOString()],
    });
  }

  async isSessionValid(jti: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "SELECT id FROM sessions WHERE jti = ? AND expires_at > datetime('now')",
      args: [jti],
    });
    return result.rows.length > 0;
  }

  async revokeSession(jti: string): Promise<void> {
    await this.client.execute({
      sql: "DELETE FROM sessions WHERE jti = ?",
      args: [jti],
    });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.client.execute({
      sql: "DELETE FROM sessions WHERE user_id = ?",
      args: [userId],
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    const result = await this.client.execute(
      "DELETE FROM sessions WHERE expires_at <= datetime('now')",
    );
    if (result.rowsAffected > 0)
      console.log(`Cleaned up ${result.rowsAffected} expired sessions`);
  }

  // ─── Review Methods ──────────────────────────────────────────────────────────

  async createReview(
    businessId: string,
    userId: string,
    rating: number,
    text: string,
  ): Promise<Review> {
    try {
      const result = await this.client.execute({
        sql: "INSERT INTO reviews (business_id, user_id, rating, text) VALUES (?, ?, ?, ?)",
        args: [businessId, userId, rating, text],
      });
      return this.getReviewById(toNum(result.lastInsertRowid));
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed")) {
        throw new Error("You have already reviewed this business");
      }
      throw error;
    }
  }

  async getReviewById(id: number, requestingUserId?: string): Promise<Review> {
    const result = await this.client.execute({
      sql: `SELECT r.id, r.business_id, r.user_id, u.name as user_name, u.email as user_email,
                   r.rating, r.text, r.helpful_count, r.created_at
            FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
      args: [id],
    });
    const row = result.rows[0] as any;
    if (!row) throw new Error("Review not found");
    let userFoundHelpful = false;
    if (requestingUserId) {
      const h = await this.client.execute({
        sql: "SELECT 1 FROM review_helpful WHERE review_id = ? AND user_id = ?",
        args: [id, requestingUserId],
      });
      userFoundHelpful = h.rows.length > 0;
    }
    return {
      id: String(row.id),
      businessId: row.business_id as string,
      userId: String(row.user_id),
      userName: row.user_name as string,
      userEmail: row.user_email as string,
      rating: toNum(row.rating),
      text: row.text as string,
      helpfulCount: toNum(row.helpful_count),
      userFoundHelpful,
      createdAt: row.created_at as string,
    };
  }

  async getReviewsForBusiness(
    businessId: string,
    limit = 10,
    offset = 0,
    requestingUserId?: string,
  ): Promise<{ reviews: Review[]; total: number }> {
    const countResult = await this.client.execute({
      sql: "SELECT COUNT(*) as count FROM reviews WHERE business_id = ?",
      args: [businessId],
    });
    const total = toNum((countResult.rows[0] as any).count);

    const rowsResult = await this.client.execute({
      sql: `SELECT r.id, r.business_id, r.user_id, u.name as user_name, u.email as user_email,
                   r.rating, r.text, r.helpful_count, r.created_at
            FROM reviews r JOIN users u ON u.id = r.user_id
            WHERE r.business_id = ?
            ORDER BY r.helpful_count DESC, r.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [businessId, limit, offset],
    });
    const rows = rowsResult.rows as any[];

    const helpfulSet = new Set<number>();
    if (requestingUserId && rows.length > 0) {
      const ids = rows.map((r) => r.id as number | bigint);
      const placeholders = ids.map(() => "?").join(",");
      const helpfulResult = await this.client.execute({
        sql: `SELECT review_id FROM review_helpful WHERE user_id = ? AND review_id IN (${placeholders})`,
        args: [requestingUserId, ...ids],
      });
      (helpfulResult.rows as any[]).forEach((h) =>
        helpfulSet.add(toNum(h.review_id)),
      );
    }

    const reviews: Review[] = rows.map((row) => ({
      id: String(row.id),
      businessId: row.business_id as string,
      userId: String(row.user_id),
      userName: row.user_name as string,
      userEmail: row.user_email as string,
      rating: toNum(row.rating),
      text: row.text as string,
      helpfulCount: toNum(row.helpful_count),
      userFoundHelpful: helpfulSet.has(toNum(row.id)),
      createdAt: row.created_at as string,
    }));

    return { reviews, total };
  }

  async getUserReviewForBusiness(
    businessId: string,
    userId: string,
  ): Promise<Review | null> {
    const result = await this.client.execute({
      sql: `SELECT r.id, r.business_id, r.user_id, u.name as user_name, u.email as user_email,
                   r.rating, r.text, r.helpful_count, r.created_at
            FROM reviews r JOIN users u ON u.id = r.user_id
            WHERE r.business_id = ? AND r.user_id = ?`,
      args: [businessId, userId],
    });
    const row = result.rows[0] as any;
    if (!row) return null;
    return {
      id: String(row.id),
      businessId: row.business_id as string,
      userId: String(row.user_id),
      userName: row.user_name as string,
      userEmail: row.user_email as string,
      rating: toNum(row.rating),
      text: row.text as string,
      helpfulCount: toNum(row.helpful_count),
      userFoundHelpful: false,
      createdAt: row.created_at as string,
    };
  }

  async getProximitiReviewCount(businessId: string): Promise<number> {
    const result = await this.client.execute({
      sql: "SELECT COUNT(*) as count FROM reviews WHERE business_id = ?",
      args: [businessId],
    });
    return toNum((result.rows[0] as any).count);
  }

  async toggleHelpful(reviewId: string, userId: string): Promise<boolean> {
    const existing = await this.client.execute({
      sql: "SELECT 1 FROM review_helpful WHERE review_id = ? AND user_id = ?",
      args: [reviewId, userId],
    });
    if (existing.rows.length > 0) {
      await this.client.batch(
        [
          {
            sql: "DELETE FROM review_helpful WHERE review_id = ? AND user_id = ?",
            args: [reviewId, userId],
          },
          {
            sql: "UPDATE reviews SET helpful_count = helpful_count - 1 WHERE id = ?",
            args: [reviewId],
          },
        ],
        "write",
      );
      return false;
    } else {
      await this.client.batch(
        [
          {
            sql: "INSERT INTO review_helpful (review_id, user_id) VALUES (?, ?)",
            args: [reviewId, userId],
          },
          {
            sql: "UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?",
            args: [reviewId],
          },
        ],
        "write",
      );
      return true;
    }
  }

  // ─── Photo Cache ─────────────────────────────────────────────────────────────

  async cachePhoto(key: string, photoUrl: string): Promise<void> {
    await this.client.execute({
      sql: "INSERT OR REPLACE INTO business_photos (cache_key, photo_url) VALUES (?, ?)",
      args: [key, photoUrl],
    });
  }

  async getCachedPhoto(key: string): Promise<string | null> {
    const result = await this.client.execute({
      sql: "SELECT photo_url FROM business_photos WHERE cache_key = ?",
      args: [key],
    });
    return result.rows.length > 0
      ? ((result.rows[0] as any).photo_url as string)
      : null;
  }

  // ─── Coupon Methods ──────────────────────────────────────────────────────────

  async createCoupon(couponData: {
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
  }): Promise<Coupon> {
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
    if (endDate <= startDate)
      throw new Error("End date must be after start date");
    if (discountValue <= 0) throw new Error("Discount value must be positive");
    if (discountType === "percentage" && discountValue > 100)
      throw new Error("Percentage discount cannot exceed 100%");
    try {
      const result = await this.client.execute({
        sql: `INSERT INTO coupons (
                business_id, title, description, discount_type, discount_value,
                coupon_code, start_date, end_date, usage_limit, is_premium_only
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
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
        ],
      });
      return this.getCouponById(toNum(result.lastInsertRowid));
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed"))
        throw new Error("Coupon code already exists");
      throw error;
    }
  }

  async getCouponById(id: number): Promise<Coupon> {
    const result = await this.client.execute({
      sql: `SELECT id, business_id as businessId, title, description,
                   discount_type as discountType, discount_value as discountValue,
                   coupon_code as couponCode, start_date as startDate,
                   end_date as endDate, usage_limit as usageLimit,
                   usage_count as usageCount, is_active as isActive,
                   is_premium_only as isPremiumOnly,
                   created_at as createdAt, updated_at as updatedAt
            FROM coupons WHERE id = ?`,
      args: [id],
    });
    if (!result.rows[0]) throw new Error("Coupon not found");
    return mapCoupon(result.rows[0] as Record<string, unknown>);
  }

  async getCouponByCode(couponCode: string): Promise<Coupon | null> {
    const result = await this.client.execute({
      sql: `SELECT id, business_id as businessId, title, description,
                   discount_type as discountType, discount_value as discountValue,
                   coupon_code as couponCode, start_date as startDate,
                   end_date as endDate, usage_limit as usageLimit,
                   usage_count as usageCount, is_active as isActive,
                   is_premium_only as isPremiumOnly,
                   created_at as createdAt, updated_at as updatedAt
            FROM coupons WHERE coupon_code = ?`,
      args: [couponCode.toUpperCase()],
    });
    if (!result.rows[0]) return null;
    return mapCoupon(result.rows[0] as Record<string, unknown>);
  }

  async getActiveCouponsForBusiness(businessId: string): Promise<Coupon[]> {
    const result = await this.client.execute({
      sql: `SELECT id, business_id as businessId, title, description,
                   discount_type as discountType, discount_value as discountValue,
                   coupon_code as couponCode, start_date as startDate,
                   end_date as endDate, usage_limit as usageLimit,
                   usage_count as usageCount, is_active as isActive,
                   is_premium_only as isPremiumOnly,
                   created_at as createdAt, updated_at as updatedAt
            FROM coupons
            WHERE business_id = ? AND is_active = 1
              AND datetime(start_date) <= datetime('now')
              AND datetime(end_date) >= datetime('now')
            ORDER BY end_date ASC`,
      args: [businessId],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(mapCoupon);
  }

  async getAllCouponsForBusiness(businessId: string): Promise<Coupon[]> {
    const result = await this.client.execute({
      sql: `SELECT id, business_id as businessId, title, description,
                   discount_type as discountType, discount_value as discountValue,
                   coupon_code as couponCode, start_date as startDate,
                   end_date as endDate, usage_limit as usageLimit,
                   usage_count as usageCount, is_active as isActive,
                   is_premium_only as isPremiumOnly,
                   created_at as createdAt, updated_at as updatedAt
            FROM coupons WHERE business_id = ? ORDER BY created_at DESC`,
      args: [businessId],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(mapCoupon);
  }

  async getAllCoupons(): Promise<Coupon[]> {
    const result = await this.client.execute({
      sql: `SELECT id, business_id as businessId, title, description,
                   discount_type as discountType, discount_value as discountValue,
                   coupon_code as couponCode, start_date as startDate,
                   end_date as endDate, usage_limit as usageLimit,
                   usage_count as usageCount, is_active as isActive,
                   is_premium_only as isPremiumOnly,
                   created_at as createdAt, updated_at as updatedAt
            FROM coupons ORDER BY created_at DESC`,
      args: [],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(mapCoupon);
  }

  async updateCoupon(
    id: string,
    updates: Partial<
      Omit<
        Coupon,
        "id" | "couponCode" | "usageCount" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<Coupon> {
    const fields: string[] = [];
    const values: (string | number | boolean | null | bigint | Date)[] = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        if (key === "startDate" || key === "endDate") {
          fields.push(`${dbKey} = ?`);
          values.push(new Date(value as string).toISOString());
        } else {
          fields.push(`${dbKey} = ?`);
          values.push(value);
        }
      }
    });
    if (fields.length === 0) throw new Error("No valid fields to update");
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await this.client.execute({
      sql: `UPDATE coupons SET ${fields.join(", ")} WHERE id = ?`,
      args: values,
    });
    return this.getCouponById(parseInt(id));
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: "DELETE FROM coupons WHERE id = ?",
      args: [id],
    });
    return result.rowsAffected > 0;
  }

  async redeemCoupon(
    couponCode: string,
  ): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    const coupon = await this.getCouponByCode(couponCode);
    if (!coupon) return { success: false, error: "Coupon not found" };
    if (!coupon.isActive)
      return { success: false, error: "Coupon is not active" };
    const now = new Date();
    if (now < new Date(coupon.startDate))
      return { success: false, error: "Coupon is not yet valid" };
    if (now > new Date(coupon.endDate))
      return { success: false, error: "Coupon has expired" };
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, error: "Coupon usage limit reached" };
    }
    await this.client.execute({
      sql: "UPDATE coupons SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [coupon.id],
    });
    const updatedCoupon = await this.getCouponById(parseInt(coupon.id));
    return { success: true, coupon: updatedCoupon };
  }

  async getActiveCouponCount(businessId: string): Promise<number> {
    const result = await this.client.execute({
      sql: `SELECT COUNT(*) as count FROM coupons
            WHERE business_id = ? AND is_active = 1
              AND datetime(start_date) <= datetime('now')
              AND datetime(end_date) >= datetime('now')`,
      args: [businessId],
    });
    return toNum((result.rows[0] as any).count);
  }

  /** Fetch active coupon counts for multiple businesses in a single query. */
  async getActiveCouponCounts(
    businessIds: string[],
  ): Promise<Record<string, number>> {
    if (businessIds.length === 0) return {};
    const placeholders = businessIds.map(() => "?").join(", ");
    const result = await this.client.execute({
      sql: `SELECT business_id, COUNT(*) as count FROM coupons
            WHERE business_id IN (${placeholders}) AND is_active = 1
              AND datetime(start_date) <= datetime('now')
              AND datetime(end_date) >= datetime('now')
            GROUP BY business_id`,
      args: businessIds,
    });
    const counts: Record<string, number> = {};
    for (const row of result.rows as unknown as Record<string, unknown>[]) {
      counts[row.business_id as string] = toNum(row.count);
    }
    return counts;
  }

  async expireOldCoupons(): Promise<number> {
    const result = await this.client.execute(
      "UPDATE coupons SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE is_active = 1 AND datetime(end_date) < datetime('now')",
    );
    if (result.rowsAffected > 0)
      console.log(`Auto-expired ${result.rowsAffected} coupons`);
    return result.rowsAffected;
  }

  // ─── Rideshare Methods ───────────────────────────────────────────────────────

  async createRideshare(data: {
    creatorId: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    maxPassengers: number;
    note?: string;
  }): Promise<Rideshare> {
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
    if (maxPassengers < 1 || maxPassengers > 4)
      throw new Error("Max passengers must be between 1 and 4");

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const generateCode = () =>
      Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");
    let shareCode = generateCode();
    while (true) {
      const existing = await this.client.execute({
        sql: "SELECT 1 FROM rideshares WHERE share_code = ?",
        args: [shareCode],
      });
      if (existing.rows.length === 0) break;
      shareCode = generateCode();
    }

    const result = await this.client.execute({
      sql: `INSERT INTO rideshares (
              creator_id, origin_name, origin_lat, origin_lng,
              destination_name, destination_lat, destination_lng,
              max_passengers, note, share_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
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
      ],
    });
    const rideshareId = toNum(result.lastInsertRowid);
    await this.client.execute({
      sql: "INSERT INTO rideshare_passengers (rideshare_id, user_id) VALUES (?, ?)",
      args: [rideshareId, creatorId],
    });
    return this.getRideshareById(rideshareId);
  }

  async getRideshareById(id: number): Promise<Rideshare> {
    const result = await this.client.execute({
      sql: `SELECT r.*, u1.name as creator_name, u2.name as driver_name,
                   (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
            FROM rideshares r
            JOIN users u1 ON u1.id = r.creator_id
            LEFT JOIN users u2 ON u2.id = r.driver_id
            WHERE r.id = ?`,
      args: [id],
    });
    if (!result.rows[0]) throw new Error("Rideshare not found");
    return mapRideshareRow(result.rows[0] as Record<string, unknown>);
  }

  async getRideshareByShareCode(code: string): Promise<Rideshare | null> {
    const result = await this.client.execute({
      sql: `SELECT r.*, u1.name as creator_name, u2.name as driver_name,
                   (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
            FROM rideshares r
            JOIN users u1 ON u1.id = r.creator_id
            LEFT JOIN users u2 ON u2.id = r.driver_id
            WHERE r.share_code = ?`,
      args: [code.toUpperCase()],
    });
    if (!result.rows[0]) return null;
    return mapRideshareRow(result.rows[0] as Record<string, unknown>);
  }

  async getActiveRideshares(): Promise<Rideshare[]> {
    const result = await this.client.execute({
      sql: `SELECT r.*, u1.name as creator_name, u2.name as driver_name,
                   (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
            FROM rideshares r
            JOIN users u1 ON u1.id = r.creator_id
            LEFT JOIN users u2 ON u2.id = r.driver_id
            WHERE r.status IN ('waiting', 'accepted')
            ORDER BY r.created_at DESC`,
      args: [],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(
      mapRideshareRow,
    );
  }

  async getAllRideshares(includeCompleted = false): Promise<Rideshare[]> {
    const where = includeCompleted
      ? ""
      : "WHERE r.status NOT IN ('completed', 'cancelled')";
    const result = await this.client.execute({
      sql: `SELECT r.*, u1.name as creator_name, u2.name as driver_name,
                   (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
            FROM rideshares r
            JOIN users u1 ON u1.id = r.creator_id
            LEFT JOIN users u2 ON u2.id = r.driver_id
            ${where}
            ORDER BY r.created_at DESC`,
      args: [],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(
      mapRideshareRow,
    );
  }

  async getUserRideshares(userId: string): Promise<Rideshare[]> {
    const result = await this.client.execute({
      sql: `SELECT DISTINCT r.*, u1.name as creator_name, u2.name as driver_name,
                   (SELECT COUNT(*) FROM rideshare_passengers WHERE rideshare_id = r.id) as current_passengers
            FROM rideshares r
            JOIN users u1 ON u1.id = r.creator_id
            LEFT JOIN users u2 ON u2.id = r.driver_id
            LEFT JOIN rideshare_passengers rp ON rp.rideshare_id = r.id
            WHERE r.creator_id = ? OR r.driver_id = ? OR rp.user_id = ?
            ORDER BY r.created_at DESC`,
      args: [userId, userId, userId],
    });
    return (result.rows as unknown as Record<string, unknown>[]).map(
      mapRideshareRow,
    );
  }

  async getRidesharePassengers(
    rideshareId: string,
  ): Promise<RidesharePassenger[]> {
    const result = await this.client.execute({
      sql: `SELECT rp.id, rp.rideshare_id, rp.user_id, u.name as user_name, rp.joined_at
            FROM rideshare_passengers rp
            JOIN users u ON u.id = rp.user_id
            WHERE rp.rideshare_id = ? ORDER BY rp.joined_at ASC`,
      args: [rideshareId],
    });
    return (result.rows as any[]).map((row) => ({
      id: String(row.id),
      rideshareId: String(row.rideshare_id),
      userId: String(row.user_id),
      userName: row.user_name as string,
      joinedAt: row.joined_at as string,
    }));
  }

  async joinRideshare(
    rideshareId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rideshare = await this.getRideshareById(parseInt(rideshareId));
    if (rideshare.status === "in_transit")
      return {
        success: false,
        error: "This ride is already in transit — lobby is closed",
      };
    if (rideshare.status === "completed" || rideshare.status === "cancelled")
      return { success: false, error: "This ride is no longer active" };
    if (rideshare.currentPassengers >= rideshare.maxPassengers)
      return { success: false, error: "This ride is full" };
    const existing = await this.client.execute({
      sql: "SELECT 1 FROM rideshare_passengers WHERE rideshare_id = ? AND user_id = ?",
      args: [rideshareId, userId],
    });
    if (existing.rows.length > 0)
      return { success: false, error: "You already joined this ride" };
    try {
      await this.client.batch(
        [
          {
            sql: "INSERT INTO rideshare_passengers (rideshare_id, user_id) VALUES (?, ?)",
            args: [rideshareId, userId],
          },
          {
            sql: "UPDATE rideshares SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [rideshareId],
          },
        ],
        "write",
      );
      return { success: true };
    } catch (error: any) {
      if (error.message?.includes("UNIQUE constraint failed"))
        return { success: false, error: "You already joined this ride" };
      throw error;
    }
  }

  async leaveRideshare(
    rideshareId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rideshare = await this.getRideshareById(parseInt(rideshareId));
    if (rideshare.status === "in_transit")
      return {
        success: false,
        error: "Cannot leave a ride that is in transit",
      };
    if (rideshare.creatorId === userId)
      return {
        success: false,
        error: "The creator cannot leave — cancel the ride instead",
      };
    const result = await this.client.execute({
      sql: "DELETE FROM rideshare_passengers WHERE rideshare_id = ? AND user_id = ?",
      args: [rideshareId, userId],
    });
    if (result.rowsAffected === 0)
      return { success: false, error: "You are not in this ride" };
    await this.client.execute({
      sql: "UPDATE rideshares SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [rideshareId],
    });
    return { success: true };
  }

  async acceptTransport(
    rideshareId: string,
    driverId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rideshare = await this.getRideshareById(parseInt(rideshareId));
    if (rideshare.status !== "waiting")
      return {
        success: false,
        error: "This ride already has a driver or is no longer waiting",
      };
    if (rideshare.creatorId === driverId)
      return { success: false, error: "The creator cannot also be the driver" };
    await this.client.execute({
      sql: "UPDATE rideshares SET driver_id = ?, status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [driverId, rideshareId],
    });
    return { success: true };
  }

  async startTransport(
    rideshareId: string,
    driverId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rideshare = await this.getRideshareById(parseInt(rideshareId));
    if (rideshare.driverId !== driverId)
      return {
        success: false,
        error: "Only the assigned driver can start the transport",
      };
    if (rideshare.status !== "accepted")
      return {
        success: false,
        error: "Transport must be accepted before starting",
      };
    await this.client.execute({
      sql: "UPDATE rideshares SET status = 'in_transit', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [rideshareId],
    });
    return { success: true };
  }

  async completeRideshare(
    rideshareId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rideshare = await this.getRideshareById(parseInt(rideshareId));
    if (rideshare.driverId !== userId && rideshare.creatorId !== userId)
      return {
        success: false,
        error: "Only the driver or creator can complete the ride",
      };
    if (rideshare.status !== "in_transit")
      return {
        success: false,
        error: "Can only complete a ride that is in transit",
      };
    await this.client.execute({
      sql: "UPDATE rideshares SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [rideshareId],
    });
    return { success: true };
  }

  async cancelRideshare(
    rideshareId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const rideshare = await this.getRideshareById(parseInt(rideshareId));
    if (rideshare.creatorId !== userId && rideshare.driverId !== userId)
      return { success: false, error: "Only the creator or driver can cancel" };
    if (rideshare.status === "completed")
      return { success: false, error: "Cannot cancel a completed ride" };
    await this.client.execute({
      sql: "UPDATE rideshares SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [rideshareId],
    });
    return { success: true };
  }

  async cleanupOldRideshares(): Promise<number> {
    const result = await this.client.execute(
      `DELETE FROM rideshares WHERE status IN ('completed', 'cancelled')
       AND datetime(updated_at) < datetime('now', '-24 hours')`,
    );
    if (result.rowsAffected > 0)
      console.log(`Cleaned up ${result.rowsAffected} old rideshares`);
    return result.rowsAffected;
  }

  close(): void {
    // No-op: @libsql/client remote connections close automatically.
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const db = new DatabaseManager();

setInterval(
  async () => {
    await db.cleanupExpiredSessions();
  },
  60 * 60 * 1000,
);
setInterval(
  async () => {
    await db.expireOldCoupons();
  },
  60 * 60 * 1000,
);
setInterval(
  async () => {
    await db.cleanupOldRideshares();
  },
  60 * 60 * 1000,
);

export default db;
