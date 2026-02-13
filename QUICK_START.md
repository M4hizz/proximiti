# Quick Start - Environment Setup

## 🚀 Get Started in 3 Steps

### 1️⃣ Generate Secure Secrets

```bash
npm run generate-secrets
```

Copy the output and paste into your `.env` file.

### 2️⃣ Set Up Google OAuth (Required for Sign-In)

**What you need:** A Google Cloud account (free)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID** → **Web application**
5. Add these **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `http://localhost:3001`
6. Copy your **Client ID** and **Client Secret**
7. Update your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   VITE_GOOGLE_CLIENT_ID=your-client-id-here
   ```

📖 **Detailed instructions:** See [SETUP_GUIDE.md](SETUP_GUIDE.md)

### 3️⃣ Start Your App

```bash
# Terminal 1 - Start backend
npm run server

# Terminal 2 - Start frontend
npm run dev
```

Visit: http://localhost:5173

---

## ✅ Checklist

Before you can run the app, make sure:

- [ ] `.env` file exists (copy from `.env.example` if needed)
- [ ] Generated secure secrets for `JWT_SECRET`, `COOKIE_SECRET`, `SESSION_SECRET`
- [ ] Set up Google OAuth credentials (if you want Google Sign-In)
- [ ] Both backend and frontend servers are running

---

## 🛠️ Available Commands

| Command                    | Description                    |
| -------------------------- | ------------------------------ |
| `npm run dev`              | Start frontend dev server      |
| `npm run server`           | Start backend server           |
| `npm run generate-secrets` | Generate secure random secrets |
| `npm run build`            | Build for production           |
| `npm run lint`             | Run ESLint                     |

---

## 🔍 Troubleshooting

**Google Sign-In button doesn't appear?**

- Check that `VITE_GOOGLE_CLIENT_ID` is set in `.env`
- Make sure it's not the placeholder value
- Restart both servers

**JWT_SECRET error?**

- Run `npm run generate-secrets` and update `.env`
- Restart the backend server

**CORS errors?**

- Make sure both servers are running
- Check that `FRONTEND_URL=http://localhost:5173` in `.env`

---

## 📚 More Help

- **Full setup guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Security info:** [SECURITY_SETUP.md](SECURITY_SETUP.md)
- **Google OAuth:** [Detailed Steps in SETUP_GUIDE.md](SETUP_GUIDE.md#google-oauth-setup)
