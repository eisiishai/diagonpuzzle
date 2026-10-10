import { execSync } from "node:child_process";
import { defineConfig } from "vite";

/**
 * The version of the code being built, from the git version tags: "v0.9" on
 * a tagged commit, "v0.9-dirty" with uncommitted changes, and
 * "v0.9-2-g1a2b3c4" two commits after v0.9. See docs/WORKFLOW.md.
 */
function gitVersion(): string {
  try {
    return execSync("git describe --tags --dirty --always", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs, so the built game works from any folder on a web host.
  base: "./",
  define: {
    __GAME_VERSION__: JSON.stringify(gitVersion()),
  },
  server: {
    port: 8080,
    open: true,
  },
});
