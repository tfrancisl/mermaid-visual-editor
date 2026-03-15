/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    include: ["src/client/**/*.test.ts"],
  },

  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src/server/**"],
    },
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/ws": {
        target: "ws://127.0.0.1:3001",
        ws: true,
      },
    },
  },

  envPrefix: ["VITE_"],

  build: {
    target: "es2022",
  },
});
