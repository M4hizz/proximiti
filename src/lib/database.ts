import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  role: 'user' | 'admin';
  hashedPassword?: string;  // For non-Google users
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseUser extends Omit<User, 'id'> {
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
    this.db.pragma('foreign_keys = ON');
    
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

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(jti);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // Create the first admin user if no users exist
    this.createDefaultAdmin();
  }

  private createDefaultAdmin(): void {
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('Creating default admin user...');
      this.createUser({
        email: 'admin@proximiti.local',
        name: 'Administrator',
        role: 'admin',
        password: 'admin123', // Should be changed immediately
        isVerified: true
      });
      console.log('Default admin user created. Email: admin@proximiti.local, Password: admin123');
      console.log('IMPORTANT: Change the admin password immediately after first login!');
    }
  }

  async createUser(userData: {
    email: string;
    name: string;
    role?: 'user' | 'admin';
    password?: string;
    googleId?: string;
    isVerified?: boolean;
  }): Promise<User> {
    const { email, name, role = 'user', password, googleId, isVerified = false } = userData;
    
    let hashedPassword = undefined;
    if (password && !googleId) {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    const stmt = this.db.prepare(`
      INSERT INTO users (email, name, google_id, role, hashed_password, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(email, name, googleId, role, hashedPassword, isVerified);
      return this.getUserById(result.lastInsertRowid as number);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  getUserById(id: number): User {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role, 
             hashed_password as hashedPassword, is_verified as isVerified,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE id = ?
    `);
    const user = stmt.get(id) as DatabaseUser | undefined;
    if (!user) {
      throw new Error('User not found');
    }
    return { ...user, id: user.id.toString() };
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role,
             hashed_password as hashedPassword, is_verified as isVerified,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE email = ?
    `);
    const user = stmt.get(email) as DatabaseUser | undefined;
    return user ? { ...user, id: user.id.toString() } : null;
  }

  getUserByGoogleId(googleId: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role,
             hashed_password as hashedPassword, is_verified as isVerified,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE google_id = ?
    `);
    const user = stmt.get(googleId) as DatabaseUser | undefined;
    return user ? { ...user, id: user.id.toString() } : null;
  }

  getAllUsers(limit: number = 100, offset: number = 0): User[] {
    const stmt = this.db.prepare(`
      SELECT id, email, name, google_id as googleId, role,
             hashed_password as hashedPassword, is_verified as isVerified,
             created_at as createdAt, updated_at as updatedAt
      FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?
    `);
    const users = stmt.all(limit, offset) as DatabaseUser[];
    return users.map(user => ({ ...user, id: user.id.toString() }));
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = this.getUserByEmail(email);
    if (!user || !user.hashedPassword) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.hashedPassword);
    return isValid ? user : null;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id'>>): User {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.getUserById(parseInt(id));
  }

  deleteUser(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
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
    const stmt = this.db.prepare('DELETE FROM sessions WHERE jti = ?');
    stmt.run(jti);
  }

  revokeAllUserSessions(userId: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const stmt = this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')");
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired sessions`);
    }
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database.sqlite');
export const db = new DatabaseManager(dbPath);

// Cleanup expired sessions every hour
setInterval(() => {
  db.cleanupExpiredSessions();
}, 60 * 60 * 1000);

export default db;