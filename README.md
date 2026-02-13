# Project Zero

A full-stack business discovery platform built with React, TypeScript, Express, and SQLite.

## Features

- 🔐 **Secure Authentication**: JWT-based auth with Google OAuth integration
- 🗺️ **Interactive Maps**: Business location mapping with Leaflet
- 🎨 **Modern UI**: Built with React, TailwindCSS, and Radix UI
- 🔒 **Security First**: Helmet, CORS, rate limiting, and secure cookies
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 👥 **Role-Based Access**: User and admin roles with protected routes

## Tech Stack

**Frontend:**

- React 19 + TypeScript
- Vite for blazing-fast development
- TailwindCSS for styling
- React Router for navigation
- Leaflet for maps

**Backend:**

- Express.js
- SQLite with better-sqlite3
- JWT authentication
- Google OAuth 2.0
- bcrypt for password hashing

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud account (for OAuth - free tier)

### Setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd project-zero
   npm install
   ```

2. **Configure environment**

   ```bash
   # Copy example environment file
   cp .env.example .env

   # Generate secure secrets
   npm run generate-secrets

   # Copy the output into your .env file
   ```

3. **Set up Google OAuth** (required for sign-in)
   - See [QUICK_START.md](QUICK_START.md) for step-by-step instructions
   - Or check the detailed guide: [SETUP_GUIDE.md](SETUP_GUIDE.md#google-oauth-setup)

4. **Start the application**

   ```bash
   # Terminal 1 - Start backend
   npm run server

   # Terminal 2 - Start frontend
   npm run dev
   ```

5. **Open in browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 3 steps
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Comprehensive setup guide
- **[SECURITY_SETUP.md](SECURITY_SETUP.md)** - Security configuration
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Production deployment guide

## Available Scripts

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `npm run dev`              | Start Vite dev server (frontend)   |
| `npm run server`           | Start Express server (backend)     |
| `npm run build`            | Build for production               |
| `npm run preview`          | Preview production build           |
| `npm run lint`             | Run ESLint                         |
| `npm run generate-secrets` | Generate secure random secrets     |
| `npm run validate-env`     | Validate environment configuration |

## Environment Variables

See [SETUP_GUIDE.md](SETUP_GUIDE.md#environment-variables) for complete documentation.

Required variables:

- `JWT_SECRET` - JWT signing secret
- `COOKIE_SECRET` - Cookie signing secret
- `SESSION_SECRET` - Session encryption secret
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Secret
- `VITE_GOOGLE_CLIENT_ID` - Frontend Google Client ID

## Project Structure

```
project-zero/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and API
│   │   ├── routes/     # API routes
│   │   ├── auth.ts     # Authentication logic
│   │   ├── database.ts # Database operations
│   │   └── ...
│   └── assets/         # Static assets
├── scripts/            # Utility scripts
├── server.ts          # Express server
├── .env.example       # Environment template
└── docs/              # Documentation

```

## Security

This project implements multiple security layers:

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - DDoS protection
- **JWT** - Secure token-based auth
- **bcrypt** - Password hashing
- **Secure Cookies** - HttpOnly, SameSite
- **Input Validation** - Request sanitization

⚠️ **Important**: Never commit `.env` files or secrets to version control!

## Development

### Adding New Features

1. Frontend components go in `src/components/`
2. API routes go in `src/lib/routes/`
3. Database operations go in `src/lib/database.ts`
4. Update types as needed

### Code Style

- TypeScript strict mode enabled
- ESLint configured
- Follow existing patterns

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
