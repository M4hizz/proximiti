#!/usr/bin/env node

/**
 * Generate Secure Secrets for Environment Variables
 *
 * This script generates cryptographically secure random strings
 * to be used for JWT_SECRET, COOKIE_SECRET, and SESSION_SECRET
 *
 * Usage: node scripts/generate-secrets.js
 */

import crypto from "crypto";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString("hex");
}

console.log(
  "\n" +
    colors.bright +
    colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset,
);
console.log(
  colors.bright +
    colors.cyan +
    "           🔐 Secure Secret Generator 🔐" +
    colors.reset,
);
console.log(
  colors.bright +
    colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset +
    "\n",
);

console.log(colors.yellow + "⚠️  IMPORTANT SECURITY NOTES:" + colors.reset);
console.log(
  "   • Use DIFFERENT secrets for each environment (dev, staging, production)",
);
console.log("   • NEVER commit these secrets to version control");
console.log("   • Store production secrets securely (use a password manager)");
console.log("   • Rotate secrets periodically\n");

console.log(
  colors.bright +
    "Copy the following values into your .env file:" +
    colors.reset,
);
console.log(
  colors.blue +
    "─────────────────────────────────────────────────────────────────" +
    colors.reset +
    "\n",
);

const jwtSecret = generateSecret(64);
const cookieSecret = generateSecret(64);
const sessionSecret = generateSecret(64);

console.log(colors.green + "JWT_SECRET" + colors.reset + "=" + jwtSecret);
console.log(colors.green + "COOKIE_SECRET" + colors.reset + "=" + cookieSecret);
console.log(
  colors.green + "SESSION_SECRET" + colors.reset + "=" + sessionSecret,
);

console.log(
  "\n" +
    colors.blue +
    "─────────────────────────────────────────────────────────────────" +
    colors.reset,
);

console.log("\n" + colors.bright + "📋 Next Steps:" + colors.reset);
console.log("   1. Open your .env file");
console.log("   2. Replace the placeholder values with the secrets above");
console.log("   3. Save the file");
console.log("   4. Restart your server\n");

console.log(
  colors.yellow +
    "💡 Tip: " +
    colors.reset +
    "To generate a single secret, run:",
);
console.log(
  colors.cyan +
    "   node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"" +
    colors.reset +
    "\n",
);

console.log(
  colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset +
    "\n",
);
