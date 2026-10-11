// Code coverage of the browser smoke tests: `npm run e2e:coverage`. Each
// test's page records Chromium's JavaScript coverage (see the `game` fixture
// in game.ts), and the report maps it back to the TypeScript sources through
// the e2e build's source maps. See docs/WORKFLOW.md, "2. Check".

import type { CoverageReportOptions } from "monocart-coverage-reports";

// Node's process, without depending on @types/node.
declare const process: { env: Record<string, string | undefined> };

/** True when this run collects coverage. */
export const COVERAGE = process.env.E2E_COVERAGE === "1";

export const coverageOptions: CoverageReportOptions = {
  name: "Browser smoke test coverage",
  outputDir: "coverage-e2e",
  reports: [["console-details", { skipPercent: 100 }], "v8"],
  // The game's own code, not PixiJS or the other libraries.
  entryFilter: (entry) => entry.url.includes("/assets/"),
  sourceFilter: (sourcePath) =>
    sourcePath.startsWith("src/") && !sourcePath.endsWith(".test.ts"),
  sourcePath: (filePath) => filePath.replace(/^(\.\.\/)+/, ""),
};
