# Project Zero - Environment Setup Guide

This guide will help you configure your development and production environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Variables](#environment-variables)
3. [Google OAuth Setup](#google-oauth-setup)
4. [Security Configuration](#security-configuration)
5. [Production Deployment](#production-deployment)

---

## Quick Start

### 1. Copy Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

### 2. Generate Secure Secrets

Run this command to generate secure random secrets:

```bash
node scripts/generate-secrets.js
```

This will output secure random strings that you should copy into your `.env` file for:

- `JWT_SECRET`
- `COOKIE_SECRET`
- `SESSION_SECRET`

### 3. Set Up Google OAuth

See [Google OAuth Setup](#google-oauth-setup) section below.

### 4. Install Dependencies & Start

```bash
# Install dependencies
npm install

# Start the development server (backend)
npm run server

# In another terminal, start the frontend
npm run dev
```

---

## Environment Variables

### Server Configuration

| Variable   | Description             | Default     | Required |
| ---------- | ----------------------- | ----------- | -------- |
| `PORT`     | Port for Express server | 3001        | No       |
| `NODE_ENV` | Environment mode        | development | Yes      |

### Database Configuration

| Variable        | Description               | Default           | Required |
| --------------- | ------------------------- | ----------------- | -------- |
| `DATABASE_PATH` | SQLite database file path | ./database.sqlite | Yes      |

### JWT Configuration

| Variable                 | Description                   | Default | Required |
| ------------------------ | ----------------------------- | ------- | -------- |
| `JWT_SECRET`             | Secret for signing JWT tokens | -       | **Yes**  |
| `JWT_EXPIRES_IN`         | Access token expiration       | 7d      | No       |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration      | 30d     | No       |

⚠️ **IMPORTANT**: `JWT_SECRET` must be a strong random string. Use `generate-secrets.js` to create one.

### Google OAuth Configuration

| Variable                | Description                               | Required  |
| ----------------------- | ----------------------------------------- | --------- |
| `GOOGLE_CLIENT_ID`      | Google OAuth Client ID                    | **Yes\*** |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth Client Secret                | **Yes\*** |
| `VITE_GOOGLE_CLIENT_ID` | Frontend Google Client ID (same as above) | **Yes\*** |

\* Required only if you want to enable Google Sign-In

### Cookie & Session Configuration

| Variable         | Description                | Required |
| ---------------- | -------------------------- | -------- |
| `COOKIE_SECRET`  | Secret for signing cookies | **Yes**  |
| `SESSION_SECRET` | Session encryption secret  | **Yes**  |
| `COOKIE_DOMAIN`  | Cookie domain (production) | No       |

### Security Configuration

| Variable        | Description             | Default | Required |
| --------------- | ----------------------- | ------- | -------- |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12      | No       |

### CORS Configuration

| Variable       | Description           | Default               | Required         |
| -------------- | --------------------- | --------------------- | ---------------- |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 | Yes (production) |

---

## Google OAuth Setup

### Prerequisites

- A Google Cloud account (free tier available)
- Your application must be served over HTTPS in production

### Step-by-Step Instructions

#### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name (e.g., "Project Zero")
4. Click "Create"

#### 2. Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

#### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have Google Workspace)
3. Fill in the required fields:
   - **App name**: Project Zero (or your app name)
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click "Save and Continue"
5. Skip "Scopes" (or add email and profile scopes)
6. Add test users (your email) for development
7. Click "Save and Continue"

#### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Project Zero Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for development)
     - `http://localhost:3001` (for backend)
     - Add your production URL when deploying
   - **Authorized redirect URIs**:
     - `http://localhost:5173` (for development)
     - Add your production URL when deploying
5. Click "Create"
6. **Copy the Client ID and Client Secret** (you'll need these!)

#### 5. Update Environment Variables

1. Open your `.env` file
2. Replace the placeholder values:

   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id-here
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here
   ```

   **Note**: `VITE_GOOGLE_CLIENT_ID` should be the same as `GOOGLE_CLIENT_ID`

#### 6. Restart Your Application

After updating the `.env` file:

```bash
# Restart the backend server
# Stop the current server (Ctrl+C) and run:
npm run server

# Restart the frontend
# Stop the current dev server (Ctrl+C) and run:
npm run dev
```

### Testing Google Sign-In

1. Navigate to your login page
2. Click the "Sign in with Google" button
3. You should see the Google sign-in popup
4. Sign in with a test user account you added

### Troubleshooting

**Error: "Access blocked: This app's request is invalid"**

- Make sure you've added your email as a test user in OAuth consent screen
- Verify the authorized JavaScript origins match your current URL

**Error: "Invalid client"**

- Double-check your Client ID and Client Secret
- Make sure you've set all three environment variables
- Restart both frontend and backend servers

**Google button doesn't appear**

- Check browser console for errors
- Verify `VITE_GOOGLE_CLIENT_ID` is set correctly
- Make sure it's not set to the placeholder value

---

## Security Configuration

### Generating Secure Secrets

You need to generate strong random secrets for production. You have several options:

#### Option 1: Use the provided script

```bash
node scripts/generate-secrets.js
```

#### Option 2: Use Node.js directly

```bash
# Generate a 64-byte random hex string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Option 3: Use OpenSSL

```bash
# Generate a random base64 string
openssl rand -base64 64
```

### What Secrets Do I Need?

You need to generate **three different** secure random strings for:

1. `JWT_SECRET` - Used to sign authentication tokens
2. `COOKIE_SECRET` - Used to sign cookies
3. `SESSION_SECRET` - Used for session encryption

⚠️ **NEVER** commit these secrets to version control!
⚠️ **NEVER** use the placeholder values in production!
⚠️ **Use different secrets** for each environment (dev, staging, production)

---

## Production Deployment

### Environment Variables Checklist

Before deploying to production, ensure:

- [ ] `NODE_ENV=production`
- [ ] Strong random secrets generated for ALL secret variables
- [ ] Google OAuth credentials updated with production URLs
- [ ] `FRONTEND_URL` set to your production frontend URL
- [ ] `COOKIE_DOMAIN` set (if using subdomains)
- [ ] Database path configured correctly
- [ ] All placeholder values replaced

### Security Considerations

1. **HTTPS Only**: Your production app MUST use HTTPS
2. **Secure Cookies**: Cookies will automatically be secure in production
3. **CORS**: Update `FRONTEND_URL` to match your production domain
4. **Rate Limiting**: Already configured (100 requests per 15 minutes)
5. **CSP Headers**: Already configured with helmet.js

### Recommended Production Settings

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
DATABASE_PATH=/var/data/project-zero/database.sqlite
BCRYPT_ROUNDS=12
```

### Google OAuth Production Setup

1. Go back to Google Cloud Console
2. Update OAuth credentials:
   - Add production URLs to **Authorized JavaScript origins**
   - Add production URLs to **Authorized redirect URIs**
3. If your app is public, publish the OAuth consent screen:
   - Go to "OAuth consent screen"
   - Click "Publish App"

---

## Common Issues

### Issue: "JWT_SECRET environment variable is required"

**Solution**: Make sure `JWT_SECRET` is set in your `.env` file and the server has been restarted.

### Issue: Google Sign-In not working

**Solution**:

1. Check that all three Google OAuth variables are set correctly
2. Verify authorized origins in Google Cloud Console
3. Restart both frontend and backend servers
4. Clear browser cache and cookies

### Issue: CORS errors

**Solution**:

1. Make sure `FRONTEND_URL` includes the protocol (`http://` or `https://`)
2. Don't include a trailing slash
3. Restart the backend server

### Issue: Database errors

**Solution**:

1. Check that `DATABASE_PATH` directory exists and is writable
2. SQLite file will be created automatically on first run

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## Need Help?

If you encounter issues not covered in this guide:

1. Check the browser console for frontend errors
2. Check the server terminal for backend errors
3. Verify all environment variables are set correctly
4. Make sure you've restarted both servers after changes

Good luck! 🚀
