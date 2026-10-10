import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs, so the built game works from any folder on a web host.
  base: "./",
  server: {
    port: 8080,
    open: true,
  },
});
