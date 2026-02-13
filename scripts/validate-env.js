#!/usr/bin/env node

/**
 * Environment Variables Validator
 *
 * This script validates that all required environment variables are set
 * and provides helpful warnings for development vs production.
 *
 * Usage: node scripts/validate-env.js
 */

import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const requiredVars = [
  {
    name: "JWT_SECRET",
    placeholder: "your-super-secure-jwt-secret-key-change-in-production",
  },
  {
    name: "COOKIE_SECRET",
    placeholder: "your-super-secure-cookie-secret-change-in-production",
  },
  {
    name: "SESSION_SECRET",
    placeholder: "your-super-secure-session-secret-change-in-production",
  },
  { name: "NODE_ENV", placeholder: null },
];

const optionalVars = [
  {
    name: "GOOGLE_CLIENT_ID",
    placeholder: "your-google-client-id",
    description: "Required for Google Sign-In",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    placeholder: "your-google-client-secret",
    description: "Required for Google Sign-In",
  },
  {
    name: "VITE_GOOGLE_CLIENT_ID",
    placeholder: "your-google-client-id",
    description: "Required for Google Sign-In (frontend)",
  },
  {
    name: "VITE_API_URL",
    placeholder: null,
    description: "Backend API URL (defaults to http://localhost:3001/api)",
  },
  {
    name: "FRONTEND_URL",
    placeholder: null,
    description: "Required for production CORS",
  },
  {
    name: "COOKIE_DOMAIN",
    placeholder: null,
    description: "Optional for production (if using subdomains)",
  },
];

const developmentVars = [
  { name: "PORT", default: "3001" },
  { name: "DATABASE_PATH", default: "./database.sqlite" },
  { name: "JWT_EXPIRES_IN", default: "7d" },
  { name: "JWT_REFRESH_EXPIRES_IN", default: "30d" },
  { name: "BCRYPT_ROUNDS", default: "12" },
];

let hasErrors = false;
let hasWarnings = false;

console.log(
  "\n" +
    colors.bright +
    colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset,
);
console.log(
  colors.bright +
    colors.blue +
    "           🔍 Environment Validation 🔍" +
    colors.reset,
);
console.log(
  colors.bright +
    colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset +
    "\n",
);

// Check if .env file exists
if (!fs.existsSync(".env")) {
  console.log(colors.red + "❌ ERROR: .env file not found!" + colors.reset);
  console.log("   Create one by copying .env.example:");
  console.log(colors.yellow + "   cp .env.example .env" + colors.reset + "\n");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

console.log(
  colors.bright +
    `Environment: ${isProduction ? "🚀 PRODUCTION" : "🛠️  DEVELOPMENT"}` +
    colors.reset +
    "\n",
);

// Check required variables
console.log(colors.bright + "Required Variables:" + colors.reset);
for (const { name, placeholder } of requiredVars) {
  const value = process.env[name];

  if (!value) {
    console.log(colors.red + `  ❌ ${name}: NOT SET` + colors.reset);
    hasErrors = true;
  } else if (placeholder && value === placeholder) {
    console.log(
      colors.red +
        `  ❌ ${name}: Using placeholder value (INSECURE!)` +
        colors.reset,
    );
    hasErrors = true;
  } else if (placeholder && value.length < 32) {
    console.log(
      colors.yellow +
        `  ⚠️  ${name}: Value seems too short (should be 32+ characters)` +
        colors.reset,
    );
    hasWarnings = true;
  } else {
    console.log(colors.green + `  ✓ ${name}: Set` + colors.reset);
  }
}

// Check optional variables
console.log("\n" + colors.bright + "Optional Variables:" + colors.reset);
for (const { name, placeholder, description } of optionalVars) {
  const value = process.env[name];

  if (!value) {
    console.log(colors.yellow + `  ⚠️  ${name}: NOT SET` + colors.reset);
    console.log(`     ${description}`);
    if (name.includes("GOOGLE")) {
      hasWarnings = true;
    }
  } else if (placeholder && value === placeholder) {
    console.log(
      colors.yellow + `  ⚠️  ${name}: Using placeholder value` + colors.reset,
    );
    console.log(`     ${description}`);
    hasWarnings = true;
  } else {
    console.log(colors.green + `  ✓ ${name}: Set` + colors.reset);
  }
}

// Check development variables with defaults
console.log(
  "\n" + colors.bright + "Configuration (with defaults):" + colors.reset,
);
for (const { name, default: defaultValue } of developmentVars) {
  const value = process.env[name];

  if (!value) {
    console.log(
      colors.blue +
        `  ℹ ${name}: Using default (${defaultValue})` +
        colors.reset,
    );
  } else {
    console.log(colors.green + `  ✓ ${name}: ${value}` + colors.reset);
  }
}

// Production-specific checks
if (isProduction) {
  console.log(
    "\n" + colors.bright + "🔒 Production Security Checks:" + colors.reset,
  );

  if (!process.env.FRONTEND_URL) {
    console.log(
      colors.red +
        "  ❌ FRONTEND_URL not set (CORS will not work properly)" +
        colors.reset,
    );
    hasErrors = true;
  }

  if (process.env.DATABASE_PATH === "./database.sqlite") {
    console.log(
      colors.yellow +
        "  ⚠️  Using default database path (consider using absolute path)" +
        colors.reset,
    );
    hasWarnings = true;
  }

  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
  if (bcryptRounds < 12) {
    console.log(
      colors.yellow +
        `  ⚠️  BCRYPT_ROUNDS is ${bcryptRounds} (recommended: 12+)` +
        colors.reset,
    );
    hasWarnings = true;
  }
}

// Google OAuth check
const hasGoogleClientId =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== "your-google-client-id";
const hasGoogleSecret =
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret";
const hasViteGoogleId =
  process.env.VITE_GOOGLE_CLIENT_ID &&
  process.env.VITE_GOOGLE_CLIENT_ID !== "your-google-client-id";

if (
  (hasGoogleClientId || hasGoogleSecret || hasViteGoogleId) &&
  !(hasGoogleClientId && hasGoogleSecret && hasViteGoogleId)
) {
  console.log(
    "\n" +
      colors.yellow +
      "⚠️  Google OAuth Configuration Incomplete:" +
      colors.reset,
  );
  if (!hasGoogleClientId) console.log("  • GOOGLE_CLIENT_ID not properly set");
  if (!hasGoogleSecret)
    console.log("  • GOOGLE_CLIENT_SECRET not properly set");
  if (!hasViteGoogleId)
    console.log("  • VITE_GOOGLE_CLIENT_ID not properly set");
  console.log("  Google Sign-In will NOT work until all three are configured.");
  hasWarnings = true;
}

// Summary
console.log(
  "\n" +
    colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset,
);

if (hasErrors) {
  console.log(
    colors.red +
      "\n❌ Validation FAILED - Please fix the errors above" +
      colors.reset,
  );
  console.log("\n" + colors.bright + "Quick fixes:" + colors.reset);
  console.log(
    "  1. Run: " + colors.green + "npm run generate-secrets" + colors.reset,
  );
  console.log("  2. Copy the generated secrets into your .env file");
  console.log("  3. Restart your server\n");
  process.exit(1);
} else if (hasWarnings) {
  console.log(
    colors.yellow + "\n⚠️  Validation passed with WARNINGS" + colors.reset,
  );
  console.log("   Your app will run, but some features may not work.\n");
  console.log(
    "   See " + colors.blue + "SETUP_GUIDE.md" + colors.reset + " for help.\n",
  );
} else {
  console.log(
    colors.green +
      "\n✅ All environment variables are properly configured!" +
      colors.reset +
      "\n",
  );
}

console.log(
  colors.blue +
    "═══════════════════════════════════════════════════════════════" +
    colors.reset +
    "\n",
);
