import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Allow ngrok / any external host to reach the Vite dev server
    allowedHosts: "all",
    // Proxy /api/* → backend so a single ngrok tunnel covers both frontend + API
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        cookieDomainRewrite: "",
      },
    },
  },
});
