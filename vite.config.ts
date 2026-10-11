import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import type {} from "vitest/config";

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
 * Lays out dist/ as it is uploaded: the game in dist/<version>/, and
 * dist/index.html, a copy of its page whose <base> points into that folder,
 * so the site's main address plays the newest version while older version
 * folders stay online as snapshots. Clears dist/ first, so it holds only
 * this build. Builds to another --outDir (the smoke tests) are left as is.
 */
function versionFolder(): Plugin {
  let outDir = "";
  let dist = "";
  return {
    name: "version-folder",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      dist = resolve(config.root, "dist");
    },
    buildStart() {
      if (dirname(outDir) === dist) {
        rmSync(dist, { recursive: true, force: true });
      }
    },
    closeBundle() {
      if (dirname(outDir) !== dist) {
        return;
      }
      const page = readFileSync(join(outDir, "index.html"), "utf8");
      const base = `<base href="./${basename(outDir)}/" />`;
      writeFileSync(
        join(dist, "index.html"),
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
  build: {
    outDir: `dist/${version}`,
  },
  plugins: [versionFolder()],
  server: {
    port: 8080,
    open: true,
  },
  test: {
    // `npm run coverage`: which code the unit tests run. See docs/WORKFLOW.md.
    coverage: {
      include: ["src/**/*.ts", "scripts/**/*.ts"],
      exclude: ["**/*.test.ts"],
      // The terminal table lists only files with uncovered code.
      reporter: [["text", { skipFull: true }], "html"],
    },
  },
});
