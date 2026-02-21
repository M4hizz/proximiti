/**
 * Seed script to add sample coupons to the database
 * Run with: node scripts/seed-coupons.js
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "src", "database.sqlite");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

console.log("🎟️  Seeding coupon data...\n");

// Create coupons table if it doesn't exist
db.exec(`
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

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(coupon_code);
  CREATE INDEX IF NOT EXISTS idx_coupons_business ON coupons(business_id);
  CREATE INDEX IF NOT EXISTS idx_coupons_end_date ON coupons(end_date);
  CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
`);

// Sample coupons
const sampleCoupons = [
  {
    businessId: "1", // The Green Kitchen
    title: "Spring Special",
    description: "Enjoy 20% off your entire order this spring season!",
    discountType: "percentage",
    discountValue: 20,
    couponCode: "SPRING20",
    startDate: "2026-02-01",
    endDate: "2026-05-31",
    usageLimit: 100,
  },
  {
    businessId: "1", // The Green Kitchen
    title: "New Customer Welcome",
    description: "First time at The Green Kitchen? Get $15 off your order!",
    discountType: "fixed",
    discountValue: 15,
    couponCode: "WELCOME15",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    usageLimit: null,
    isPremiumOnly: true, // Premium exclusive
  },
  {
    businessId: "2", // Urban Brews Coffee
    title: "Coffee Lover's Deal",
    description: "Get $5 off any purchase over $10!",
    discountType: "fixed",
    discountValue: 5,
    couponCode: "COFFEE5",
    startDate: "2026-02-01",
    endDate: "2026-03-31",
    usageLimit: 200,
  },
  {
    businessId: "2", // Urban Brews Coffee
    title: "Morning Rush Special",
    description: "15% off all morning orders before 10 AM!",
    discountType: "percentage",
    discountValue: 15,
    couponCode: "MORNING15",
    startDate: "2026-02-15",
    endDate: "2026-04-30",
    usageLimit: 150,
  },
  {
    businessId: "3", // Tech Haven Electronics
    title: "Tech Tuesday",
    description: "Every Tuesday get 10% off all electronics!",
    discountType: "percentage",
    discountValue: 10,
    couponCode: "TECHTUESDAY",
    startDate: "2026-02-01",
    endDate: "2026-12-31",
    usageLimit: null,
  },
  {
    businessId: "4", // Zen Fitness Studio
    title: "New Member Special",
    description: "Join Zen Fitness and get 25% off your first month!",
    discountType: "percentage",
    discountValue: 25,
    couponCode: "ZENFIT25",
    startDate: "2026-02-01",
    endDate: "2026-06-30",
    usageLimit: 50,
  },
  {
    businessId: "5", // Mario's Pizza
    title: "Pizza Party Deal",
    description: "Order 2 large pizzas and get $10 off!",
    discountType: "fixed",
    discountValue: 10,
    couponCode: "PIZZA10",
    startDate: "2026-02-20",
    endDate: "2026-03-20",
    usageLimit: 100,
  },
  {
    businessId: "6", // Sunset Diner
    title: "Weekend Brunch Special",
    description: "15% off all brunch items on weekends!",
    discountType: "percentage",
    discountValue: 15,
    couponCode: "BRUNCH15",
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    usageLimit: null,
  },
  {
    businessId: "7", // BookNook
    title: "Bookworm Bonus",
    description: "Buy 2 books, get $5 off!",
    discountType: "fixed",
    discountValue: 5,
    couponCode: "BOOK5",
    startDate: "2026-02-01",
    endDate: "2026-12-31",
    usageLimit: null,
  },
  {
    businessId: "8", // QuickCuts Salon
    title: "First Haircut Free",
    description: "New clients get their first haircut free!",
    discountType: "percentage",
    discountValue: 100,
    couponCode: "FIRSTCUT",
    startDate: "2026-02-01",
    endDate: "2026-12-31",
    usageLimit: 30,
    isPremiumOnly: true, // Premium exclusive
  },
  {
    businessId: "1", // The Green Kitchen - Limited Time
    title: "🔥 Flash Weekend Sale",
    description: "This weekend only - 30% off everything!",
    discountType: "percentage",
    discountValue: 30,
    couponCode: "FLASH30",
    startDate: "2026-02-20",
    endDate: "2026-02-23",
    usageLimit: 50,
    isPremiumOnly: true, // Premium exclusive
  },
];

const insertStmt = db.prepare(`
  INSERT INTO coupons (
    business_id, title, description, discount_type, discount_value,
    coupon_code, start_date, end_date, usage_limit, is_premium_only
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;
let skipped = 0;

for (const coupon of sampleCoupons) {
  try {
    insertStmt.run(
      coupon.businessId,
      coupon.title,
      coupon.description,
      coupon.discountType,
      coupon.discountValue,
      coupon.couponCode,
      new Date(coupon.startDate).toISOString(),
      new Date(`${coupon.endDate}T23:59:59`).toISOString(),
      coupon.usageLimit,
      coupon.isPremiumOnly ? 1 : 0
    );
    console.log(`✅ Added: ${coupon.couponCode} - ${coupon.title}${coupon.isPremiumOnly ? ' (Premium)' : ''}`);
    inserted++;
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      console.log(`⏭️  Skipped (already exists): ${coupon.couponCode}`);
      skipped++;
    } else {
      console.error(`❌ Error adding ${coupon.couponCode}:`, error.message);
    }
  }
}

console.log(`\n🎉 Seeding complete!`);
console.log(`   Inserted: ${inserted} coupons`);
console.log(`   Skipped: ${skipped} coupons`);
console.log(`\n💡 Restart your server to see the coupons in action!`);

db.close();
