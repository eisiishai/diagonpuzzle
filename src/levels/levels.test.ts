import { describe, expect, it } from "vitest";
import { solve } from "../game/solver";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";

it("has unique level ids", () => {
  const ids = LEVELS.map((level) => level.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(LEVELS.map((level, index) => ({ ...level, number: index + 1 })))(
  "level $number ($name)",
  ({ grid, minShots }) => {
    it("parses", () => {
      expect(() => parseLevel(grid)).not.toThrow();
    });

    it(`needs exactly ${minShots} shot(s) at best`, () => {
      const solution = solve(parseLevel(grid), minShots);
      expect(solution).not.toBeNull();
      expect(solution).toHaveLength(minShots);
    });
  },
);
