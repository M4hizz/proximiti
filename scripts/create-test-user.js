/**
 * Script to create a test user account
 * Run with: node scripts/create-test-user.js
 */

import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same database path as the server
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");
const db = new Database(dbPath);

console.log(`Using database: ${dbPath}\n`);

async function createTestUser() {
  try {
    // Test user credentials
    const testUser = {
      email: "test@proximiti.local",
      name: "Test User",
      password: "test123",
      role: "user",
    };

    console.log("🧪 Creating test user account...\n");

    // Check if user already exists
    const existing = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(testUser.email);

    if (existing) {
      console.log("⚠️  Test user already exists!");
      console.log(`   Email: ${testUser.email}`);
      console.log(`   You can login with password: ${testUser.password}\n`);
      db.close();
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
    const hashedPassword = await bcrypt.hash(testUser.password, saltRounds);

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (email, name, google_id, role, hashed_password, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      testUser.email,
      testUser.name,
      null, // no google_id
      testUser.role,
      hashedPassword,
      1 // verified
    );

    console.log("✅ Test user created successfully!\n");
    console.log("📧 Login credentials:");
    console.log(`   Email:    ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log(`   Role:     ${testUser.role}\n`);
    console.log("🔗 You can now login at: http://localhost:5173\n");

    db.close();
  } catch (error) {
    console.error("❌ Error creating test user:", error.message);
    db.close();
    process.exit(1);
  }
}

createTestUser();
