/**
 * Script to clear all coupons from the database
 * Run with: node scripts/clear-coupons.js
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same database path as the server (matches database.ts)
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");
const db = new Database(dbPath);

console.log(`Using database: ${dbPath}`);

console.log("🗑️  Clearing all coupons...\n");

try {
  const result = db.prepare("DELETE FROM coupons").run();
  console.log(`✅ Deleted ${result.changes} coupons`);
  console.log("\n💡 Run 'node scripts/seed-coupons.js' to add fresh coupon data");
} catch (error) {
  console.error("❌ Error:", error.message);
}

db.close();
