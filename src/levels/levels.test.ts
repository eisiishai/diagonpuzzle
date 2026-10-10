import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS } from "../audio/music";
import { setupRoutes, solve } from "../game/solver";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";

// Levels that can be solved in one shot, but also by a two-shot route where
// the first shot sets up the board for the second.
const LEVELS_WITH_SETUP_ROUTE = ["first-light", "up-and-over"];

it.each(LEVELS_WITH_SETUP_ROUTE)("%s has a two-shot setup route", (id) => {
  const level = LEVELS.find((candidate) => candidate.id === id);
  expect(level).toBeDefined();
  expect(setupRoutes(parseLevel(level!.grid)).length).toBeGreaterThan(0);
});

it("gives every level an existing music track", () => {
  for (const level of LEVELS) {
    expect(MUSIC_TRACKS[level.music]).toBeDefined();
  }
});

it("has unique level ids", () => {
  const ids = LEVELS.map((level) => level.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(LEVELS.map((level, index) => ({ ...level, number: index + 1 })))(
  "level $number ($name)",
  ({ grid, minShots, goalHits = 1 }) => {
    it("parses", () => {
      expect(() => parseLevel(grid)).not.toThrow();
    });

    it(`needs exactly ${minShots} shot(s) at best`, () => {
      const solution = solve(parseLevel(grid), minShots, goalHits);
      expect(solution).not.toBeNull();
      expect(solution).toHaveLength(minShots);
    });
  },
);
