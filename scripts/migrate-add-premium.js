/**
 * Migration script to add is_premium_only column to coupons table
 * Run with: node scripts/migrate-add-premium.js
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

console.log("🔧 Running migration: Add is_premium_only column...\n");

try {
  // Check if column exists
  const tableInfo = db.prepare("PRAGMA table_info(coupons)").all();
  const hasColumn = tableInfo.some(col => col.name === 'is_premium_only');
  
  if (hasColumn) {
    console.log("✅ Column is_premium_only already exists. No migration needed.");
  } else {
    // Add the column
    db.exec(`
      ALTER TABLE coupons 
      ADD COLUMN is_premium_only BOOLEAN DEFAULT 0
    `);
    console.log("✅ Successfully added is_premium_only column to coupons table");
  }
  
  // Verify the column was added
  const updatedTableInfo = db.prepare("PRAGMA table_info(coupons)").all();
  console.log("\nCurrent coupons table structure:");
  updatedTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  console.log("\n🎉 Migration complete!");
  
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
}

db.close();
