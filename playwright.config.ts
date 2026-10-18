import { defineConfig, devices } from "@playwright/test";
import { CI } from "./e2e/ci";
import { COVERAGE } from "./e2e/coverage";

// Node's process, without depending on @types/node.
declare const process: { env: Record<string, string> };

// Browser smoke tests (e2e/): `npm run e2e` for the quick set (also run
// before commits that change the game), `npm run e2e:full` adding every
// level played through, and `npm run screenshots`. See docs/WORKFLOW.md.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  // The browser draws in software (no GPU): more browsers at once slow
  // each one down, to about 3 frames a second on GitHub's 4 cores.
  workers: 4,
  reporter: "list",
  // The longest tests play a level twice and take about 30 s locally,
  // where a trace is recorded for every test. GitHub's machines are about
  // four times slower: the longest took over 60 s there, and tests that
  // travel the whole level list grow with it. The limit is only for a
  // test that gets stuck; watch the slowest tests' times instead (see
  // docs/WORKFLOW.md, Browser tests as on GitHub).
  timeout: CI ? 180_000 : 60_000,
  // On GitHub (CI is set) a failed test runs once more, recording a trace.
  retries: CI ? 1 : 0,
  // Shots animate at their normal speed; the longest take a few seconds.
  expect: { timeout: CI ? 30_000 : 15_000 },
  use: {
    baseURL: "http://localhost:4173",
    // Skips the build-in, transitions and ambient motion; the game
    // respects the player's setting.
    reducedMotion: "reduce",
    // Recording a trace makes every look at the page about three times
    // slower, which on GitHub's 4 cores is enough to time tests out, so
    // there only a retry records one.
    trace: CI ? "on-first-retry" : "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: ["phone.e2e.ts", "levels.e2e.ts", "screenshots.e2e.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // The desktop tests in WebKit, Safari's engine (not Safari itself).
      // Not phone.e2e.ts: its swipes use Chromium's own input events.
      name: "webkit",
      testIgnore: ["phone.e2e.ts", "levels.e2e.ts", "screenshots.e2e.ts"],
      use: {
        ...devices["Desktop Safari"],
        // Chromium is started muted; WebKit has no such switch, so its
        // sound server is one that doesn't exist (in WSL it would play
        // through the computer's speakers).
        launchOptions: {
          env: { ...process.env, PULSE_SERVER: "unix:/nonexistent" },
        },
      },
    },
    {
      name: "levels",
      testMatch: "levels.e2e.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "phone",
      testMatch: "phone.e2e.ts",
      // Layout is in CSS pixels, so it is the same at any pixel density;
      // the phone's real density (2.6) makes software rendering several
      // times slower.
      use: { ...devices["Pixel 7"], deviceScaleFactor: 1 },
    },
    {
      name: "screenshots",
      testMatch: "screenshots.e2e.ts",
    },
  ],
  // `npm run e2e:coverage` (e2e/coverage.ts) clears and writes the report.
  globalSetup: COVERAGE ? "./e2e/coverageSetup.ts" : undefined,
  // A build of its own, so dist/ (what gets deployed) is left alone. Its
  // source maps let the coverage report show the TypeScript sources.
  webServer: {
    command:
      "vite build --outDir dist-e2e --emptyOutDir --sourcemap --logLevel warn && vite preview --outDir dist-e2e --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
  },
});
