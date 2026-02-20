import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Downgrade no-explicit-any to a warning – the codebase uses `any` for
      // third-party API response types which would require extensive generics.
      "@typescript-eslint/no-explicit-any": "warn",
      // Both setState-in-effect usages in this project are valid patterns
      // (initialising error/loading state on mount, not causing infinite loops).
      "react-hooks/set-state-in-effect": "off",
      // Allow exporting utility constants (e.g. buttonVariants) and context
      // hooks (useAuth, useTheme) alongside components from the same file.
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
]);
