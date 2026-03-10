import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Prevent vite from obscuring Rust errors
  clearScreen: false,

  server: {
    port: 5173,
    // Tauri expects a fixed port; fail if it's already in use
    strictPort: true,
    // Reload on src-tauri changes not needed from the frontend
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  // Env vars accessible in the frontend must start with VITE_ or TAURI_
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    // Tauri supports ES2021+ and Chromium-based webviews
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
