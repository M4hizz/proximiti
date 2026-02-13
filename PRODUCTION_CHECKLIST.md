# Production Deployment Checklist

Use this checklist when deploying Project Zero to production.

## Pre-Deployment

### Environment Configuration

- [ ] Copy `.env.example` to `.env` for production server
- [ ] Set `NODE_ENV=production`
- [ ] Update `PORT` if needed (default: 3001)
- [ ] Set `FRONTEND_URL` to your production frontend URL (e.g., `https://yourdomain.com`)
- [ ] Generate NEW production secrets (NEVER reuse development secrets!)
  ```bash
  npm run generate-secrets
  ```
- [ ] Update the following in `.env`:
  - [ ] `JWT_SECRET` - Unique random string (64+ characters)
  - [ ] `COOKIE_SECRET` - Unique random string (64+ characters)
  - [ ] `SESSION_SECRET` - Unique random string (64+ characters)
- [ ] Set `DATABASE_PATH` to absolute path (e.g., `/var/data/project-zero/database.sqlite`)
- [ ] Ensure database directory exists and has proper permissions
- [ ] Set `BCRYPT_ROUNDS=12` (or higher for more security, but slower)

### Google OAuth Configuration

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Select your project
- [ ] Go to **APIs & Services** → **Credentials**
- [ ] Edit your OAuth 2.0 Client ID
- [ ] Add production URLs to **Authorized JavaScript origins**:
  - `https://yourdomain.com`
  - `https://api.yourdomain.com` (if backend is on subdomain)
- [ ] Add production URLs to **Authorized redirect URIs**:
  - `https://yourdomain.com`
  - `https://yourdomain.com/auth/callback` (if you have a callback route)
- [ ] Update `.env`:
  - [ ] `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
  - [ ] `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
  - [ ] `VITE_GOOGLE_CLIENT_ID` - Same as GOOGLE_CLIENT_ID
- [ ] If app is public, publish OAuth consent screen:
  - Go to **OAuth consent screen**
  - Click **Publish App**
  - Complete verification process if required

### Optional: Cookie Domain (for subdomains)

- [ ] If using subdomains (e.g., api.yourdomain.com), set `COOKIE_DOMAIN=.yourdomain.com`
- [ ] Note: Include the leading dot (.) for subdomain support

### Security Checklist

- [ ] All placeholder values replaced in `.env`
- [ ] `.env` file is NOT committed to git (check `.gitignore`)
- [ ] Secrets are stored securely (use a password manager or secrets service)
- [ ] HTTPS is enabled and enforced
- [ ] SSL/TLS certificates are valid and up to date
- [ ] Firewall rules configured correctly
- [ ] Database file permissions set correctly (read/write for app user only)

### Validate Environment

```bash
npm run validate-env
```

- [ ] All validation checks pass
- [ ] No errors or critical warnings

### Build and Test

- [ ] Run production build locally:
  ```bash
  npm run build
  ```
- [ ] Test build output:
  ```bash
  npm run preview
  ```
- [ ] Verify all features work in production mode

## Deployment

### Server Setup

- [ ] Node.js installed (version 18+ recommended)
- [ ] npm installed
- [ ] Git installed (for deployment)
- [ ] Process manager installed (PM2, systemd, etc.)

### Deploy Application

- [ ] Upload/clone code to production server
- [ ] Copy `.env` file to server (securely)
- [ ] Install dependencies:
  ```bash
  npm install --production
  ```
- [ ] Run database migrations (if any)
- [ ] Build frontend:
  ```bash
  npm run build
  ```

### Start Services

#### Option 1: Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start server.ts --name "project-zero-api" --interpreter tsx

# Start frontend (if serving with Node)
pm2 start "npm run preview" --name "project-zero-frontend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Option 2: Using systemd

Create service files for backend and frontend, then:

```bash
sudo systemctl enable project-zero-api
sudo systemctl start project-zero-api
```

### Configure Reverse Proxy

#### Nginx Example

```nginx
# Backend API
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /path/to/project-zero/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Post-Deployment

### Verification

- [ ] Visit your production URL
- [ ] Test Google Sign-In
- [ ] Create a test account
- [ ] Test all major features
- [ ] Check browser console for errors
- [ ] Review server logs for errors

### Monitoring

- [ ] Set up log monitoring (PM2 logs, systemd journal, etc.)
- [ ] Configure error alerting
- [ ] Set up uptime monitoring
- [ ] Configure database backups
- [ ] Set up SSL certificate auto-renewal

### DNS & SSL

- [ ] DNS records point to production server
- [ ] SSL certificates installed and valid
- [ ] HTTP to HTTPS redirect configured
- [ ] HTTPS enforcement enabled

### Performance

- [ ] Enable gzip compression (nginx/apache)
- [ ] Configure caching headers
- [ ] Enable CDN (if applicable)
- [ ] Test load times
- [ ] Monitor server resources (CPU, RAM, disk)

## Maintenance

### Regular Tasks

- [ ] Monitor logs regularly
- [ ] Check for security updates
- [ ] Update dependencies monthly
- [ ] Backup database regularly
- [ ] Rotate secrets annually
- [ ] Review and update Google OAuth settings
- [ ] Monitor SSL certificate expiration
- [ ] Review server resource usage
- [ ] Test backup restoration process

### Security Updates

When updating secrets:

1. Generate new secrets
2. Update `.env` file
3. Restart services
4. Invalidate ALL existing user sessions
5. Notify users to log in again

### Scaling Considerations

- [ ] Monitor request volume
- [ ] Consider load balancing if needed
- [ ] Consider database migration to PostgreSQL/MySQL
- [ ] Implement Redis for session storage (if high traffic)
- [ ] Set up horizontal scaling (if needed)

## Rollback Plan

If deployment fails:

1. Note the error from logs
2. Restore previous code version
3. Restore `.env` file backup
4. Restart services
5. Verify rollback success
6. Debug issue in development

## Support Contacts

- **Frontend Issues**: Check [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Backend Issues**: Check server logs
- **Google OAuth Issues**: [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

## Environment Variables Reference

See [SETUP_GUIDE.md](SETUP_GUIDE.md#environment-variables) for complete environment variable documentation.

---

**Last Updated**: Check repository for latest version
**Deployment Date**: ********\_********
**Deployed By**: ********\_********
**Production URL**: ********\_********
