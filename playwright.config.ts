import { defineConfig, devices } from "@playwright/test";

// Browser smoke tests (e2e/): `npm run e2e` for the quick set (also run
// before commits that change the game), `npm run e2e:full` adding every
// level played through, and `npm run screenshots`. See docs/WORKFLOW.md.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  // The browser draws in software (no GPU): more browsers at once slow
  // each one down until frames drop and the game's time runs slow.
  workers: 4,
  reporter: "list",
  // Shots animate at their normal speed; the longest take a few seconds.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:4173",
    // Skips the build-in, transitions and ambient motion; the game
    // respects the player's setting.
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: ["phone.e2e.ts", "levels.e2e.ts", "screenshots.e2e.ts"],
      use: { ...devices["Desktop Chrome"] },
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
  // A build of its own, so dist/ (what gets deployed) is left alone.
  webServer: {
    command:
      "vite build --outDir dist-e2e --emptyOutDir --logLevel warn && vite preview --outDir dist-e2e --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
  },
});
