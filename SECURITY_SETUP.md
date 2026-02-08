# Proximiti Security & Authentication Setup Guide

## Overview
PROXIMITI has been secured with enterprise-grade authentication featuring:
- **Google OAuth 2.0** with Google Identity Services
- **JWT-based session handling** with secure HTTP-only cookies
- **SQLite database** with encrypted user storage
- **Role-based access control** (User/Admin roles)
- **Comprehensive security middleware** (rate limiting, CORS, helmet)

## Required Setup Steps
# 1. Configure Google OAuth 2.0

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. Create a new project or select existing one
3. **Enable Google Identity Services API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Identity" and enable it

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Add authorized origins:
     ```
     http://localhost:5173
     http://localhost:3001
     ```
   - Add authorized redirect URIs (if needed for future features):
     ```
     http://localhost:5173/auth/callback
     ```

5. **Update Environment Variables**:
   ```bash
   # In your .env file, replace these values:
   GOOGLE_CLIENT_ID=your-actual-client-id-from-google-cloud-console
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-from-google-cloud-console
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id-from-google-cloud-console
   ```

### 2. Generate Secure Secrets (IMPORTANT!)

Replace these placeholder secrets in your `.env` file with strong, randomly generated values:

```bash
# Generate strong secrets (use a password manager or online generator)
JWT_SECRET=generate-a-64-character-random-string-here
COOKIE_SECRET=generate-another-64-character-random-string-here  
SESSION_SECRET=generate-a-third-64-character-random-string-here
```

**You can generate secure secrets using:**
- Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Online generators (use reputable ones)
- Password managers

### 3. Database Setup

The SQLite database will be automatically created when you first start the server. It includes:
- **Users table** with Google OAuth and email/password support
- **Sessions table** for JWT token management
- **Default admin user**: `admin@proximiti.local` / `admin123`

**⚠️ Important**: Change the default admin password immediately after first login!

### 4. Start the Application

```bash
# Install dependencies (if not already done)
npm install

# Start the backend server
node server.js

# In another terminal, start the frontend
npm run dev
```

## 🔒 Security Features Implemented

### Backend Security
- ✅ **JWT Authentication** with refresh tokens
- ✅ **Google OAuth 2.0** verification
- ✅ **Secure HTTP-only cookies** (HTTPS-only in production)
- ✅ **Rate limiting** (100 requests/15min globally, 10 requests/15min for auth)
- ✅ **CORS protection** with specific origins
- ✅ **Security headers** (Helmet.js with CSP, HSTS, etc.)
- ✅ **Password hashing** with bcrypt (12 rounds)
- ✅ **SQL injection protection** with prepared statements
- ✅ **Input validation** and sanitization
- ✅ **Session management** with token blacklisting

### Database Security
- ✅ **SQLite** with proper schema constraints
- ✅ **Foreign key constraints** enabled
- ✅ **Indexed queries** for performance
- ✅ **No plaintext passwords** stored
- ✅ **Automatic session cleanup**
- ✅ **Role-based access control**

### Frontend Security
- ✅ **Google Identity Services** (latest security standards)
- ✅ **Protected routes** requiring authentication
- ✅ **Token management** with secure storage
- ✅ **Content Security Policy** headers
- ✅ **CSRF protection** via SameSite cookies

## 👥 Role-Based Access Control

### User Roles
- **User**: Standard access to business finder features
- **Admin**: Full access + user management panel

### Admin Features
- View all users
- Promote/demote user roles
- Security status dashboard
- System statistics

**Access the admin panel**: After logging in as admin, click the "Admin" button in the header.

## 🚀 API Endpoints

### Authentication Endpoints
```
POST /api/auth/google       - Google OAuth sign-in
POST /api/auth/login        - Email/password login
POST /api/auth/register     - Create new account
POST /api/auth/refresh      - Refresh access token
POST /api/auth/logout       - Logout (current session)
POST /api/auth/logout-all   - Logout from all devices
GET  /api/auth/me          - Get current user profile
```

### Protected Endpoints
```
GET  /api/businesses       - Get businesses (optional auth)
GET  /api/profile          - Get user profile (auth required)
PUT  /api/profile          - Update profile (auth required)
GET  /api/admin/users      - Get all users (admin only)
PUT  /api/admin/users/:id/role - Update user role (admin only)
```

## 🛡️ Security Best Practices Implemented

1. **Secure by Default**:
   - HTTPS-only cookies in production
   - SameSite=Strict cookie policy
   - Secure session management

2. **Defense in Depth**:
   - Multiple layers of authentication
   - Rate limiting at global and endpoint levels
   - Comprehensive input validation

3. **Zero Trust Architecture**:
   - Every request validated
   - Role-based authorization
   - Token expiration and rotation

4. **Monitoring & Logging**:
   - Error tracking
   - Security event logging
   - Session management

## 🔧 Production Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets (64+ characters)
- [ ] Configure proper domain for cookies
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure production database (PostgreSQL/MySQL recommended)
- [ ] Set up monitoring and logging
- [ ] Configure CSP headers for your domain
- [ ] Test Google OAuth with production domain
- [ ] Set up backup strategy for database

## 🆘 Troubleshooting

### Common Issues:

1. **Google Sign-In not working**:
   - Check GOOGLE_CLIENT_ID in both server and frontend env
   - Verify authorized origins in Google Cloud Console
   - Check browser console for errors

2. **Database errors**:
   - Ensure SQLite file permissions are correct
   - Check DATABASE_PATH in .env
   - Verify disk space availability

3. **Cookie/Authentication issues**:
   - Clear browser cookies and local storage
   - Check if running on HTTPS in production
   - Verify CORS settings match your frontend URL

4. **Admin access**:
   - Default admin: `admin@proximiti.local` / `admin123`
   - Change password immediately after first login
   - Create additional admin users through the admin panel

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Review server logs for detailed error information  
3. Verify all environment variables are set correctly
4. Ensure Google OAuth is configured properly

Your application is now secured with production-ready authentication! 🎉