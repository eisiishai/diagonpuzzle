import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { configDefaults } from "vitest/config";

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

const version = gitVersion();

/**
 * Lays out the build as it is uploaded: the game in <outDir>/<version>/,
 * and <outDir>/index.html, a copy of its page whose <base> points into
 * that folder, so the site's main address plays the newest version while
 * older version folders stay online as snapshots. <outDir> is dist/, or
 * dist-e2e/ for the smoke tests, which so play through the main page as
 * players do. Clears <outDir> first, so it holds only this build.
 */
function versionFolder(): Plugin {
  let root = "";
  let gameDir = "";
  return {
    name: "version-folder",
    apply: "build",
    config(config) {
      const outDir = config.build?.outDir ?? "dist";
      return { build: { outDir: join(outDir, version) } };
    },
    configResolved(config) {
      gameDir = resolve(config.root, config.build.outDir);
      root = dirname(gameDir);
      // Never clear the project itself, or anything outside it.
      if (!root.startsWith(config.root + sep)) {
        throw new Error(`--outDir must be a folder inside the project`);
      }
    },
    buildStart() {
      rmSync(root, { recursive: true, force: true });
    },
    closeBundle() {
      const page = readFileSync(join(gameDir, "index.html"), "utf8");
      const base = `<base href="./${basename(gameDir)}/" />`;
      writeFileSync(
        join(root, "index.html"),
        page.replace(/<head>/, `<head>\n    ${base}`),
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs, so the built game works from any folder on a web host.
  base: "./",
  define: {
    __GAME_VERSION__: JSON.stringify(version),
  },
  plugins: [versionFolder()],
  server: {
    port: 8080,
    open: true,
  },
  test: {
    // Stryker's working copy of the project, while `npm run mutation` runs.
    exclude: [...configDefaults.exclude, ".stryker-tmp/**"],
    // `npm run coverage`: which code the unit tests run. See docs/WORKFLOW.md.
    coverage: {
      include: ["src/**/*.ts", "scripts/**/*.ts"],
      exclude: ["**/*.test.ts"],
      // The terminal table lists only files with uncovered code.
      reporter: [["text", { skipFull: true }], "html"],
    },
  },
});
