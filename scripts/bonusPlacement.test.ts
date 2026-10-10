import { describe, expect, it } from "vitest";
import { fire } from "../src/game/simulate";
import { solve, solveBonus } from "../src/game/solver";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import { findPlacements, firstEntries } from "./bonusPlacement";

describe("firstEntries", () => {
  it("finds the first shot reaching each cell, and in how many ways", () => {
    // Row 1 runs straight to the goal; row 2 turns up at the mirror and
    // crosses row 1 at (1, 0), so two shots reach that cell.
    const board = parseLevel(String.raw`
      . . G
      . / .
    `);
    const entries = firstEntries(board, 2, 1);
    expect(entries.get("0,0")).toEqual({ shots: 1, routes: 1 });
    expect(entries.get("1,0")).toEqual({ shots: 1, routes: 2 });
    expect(entries.has("2,1")).toBe(false);
  });
});

describe("findPlacements", () => {
  it.each([
    [3, 0],
    [13, 1],
  ])(
    "level %i (%i board changes) keeps par and the bonus shots",
    (n, changes) => {
      const level = LEVELS[n - 1];
      const goalHits = level.goalHits ?? 1;
      const bonusShots = level.minShots + 1;
      const placements = findPlacements(parseLevel(level.grid), {
        minShots: level.minShots,
        goalHits,
        bonusShots,
        changes,
      });
      expect(placements.length).toBeGreaterThan(0);
      for (const placement of placements.slice(0, 20)) {
        const { board, bonus } = placement;
        expect(placement.changes.length).toBeLessThanOrEqual(changes);
        expect(placement.route).toHaveLength(bonusShots);
        expect(solveBonus(board, bonus, bonusShots, goalHits)).toEqual(
          placement.route,
        );
        expect(solve(board, level.minShots, goalHits)).toHaveLength(
          level.minShots,
        );
        // The route really ends on the bonus target.
        let current = board;
        for (const row of placement.route.slice(0, -1)) {
          current = fire(current, row).board;
        }
        expect(fire(current, placement.route[bonusShots - 1]).outcome).toBe(
          "bonus",
        );
      }
      expect(placements[0].routes).toBeLessThanOrEqual(
        placements[1]?.routes ?? Infinity,
      );
    },
  );
});
