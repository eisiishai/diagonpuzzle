// Global setup and teardown of `npm run e2e:coverage` (see coverage.ts):
// clears the coverage the last run left, then writes the report from what
// every test added.

import MCR from "monocart-coverage-reports";
import { coverageOptions } from "./coverage";

export default async function setup(): Promise<() => Promise<void>> {
  MCR(coverageOptions).cleanCache();
  return async () => {
    await MCR(coverageOptions).generate();
  };
}
