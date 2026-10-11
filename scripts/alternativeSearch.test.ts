import { describe, expect, it } from "vitest";
import { withBonuses } from "../src/game/bonus";
import { playMoves, shotRows, solve } from "../src/game/solver";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import {
  alternativeSolutions,
  findAlternativeChanges,
  isEssential,
} from "./alternativeSearch";

describe("isEssential", () => {
  // Row 1 runs straight to the goal; row 2 exits after flipping (1, 1).
  const board = parseLevel(String.raw`
    . . G
    . / .
  `);

  it("accepts a solution with no wasted shot", () => {
    expect(isEssential(board, [0], 1)).toBe(true);
  });

  it("rejects a solution with a shot that can be left out", () => {
    expect(isEssential(board, [1, 0], 1)).toBe(false);
  });
});

describe("alternativeSolutions", () => {
  it("finds level 1's direct shot and its two-shot alternative", () => {
    // Row 4 reaches the goal; row 5 flips mirrors so that row 1 does too
    // (docs/DESIGN.md, level list).
    const board = withBonuses(parseLevel(LEVELS[0].grid));
    expect(alternativeSolutions(board, 2)).toEqual([[3], [4, 0]]);
  });
});

describe("findAlternativeChanges", () => {
  it("keeps par, the par solution and the bonus shots of level 9", () => {
    const level = LEVELS[8];
    const levelBoard = parseLevel(level.grid);
    const par = solve(withBonuses(levelBoard), level.minShots)!;
    const changes = findAlternativeChanges(levelBoard, {
      minShots: level.minShots,
      goalHits: 1,
      bonusShots: level.bonusShots,
      extraShots: 1,
      changes: 1,
    });
    expect(changes.length).toBeGreaterThan(0);
    for (const change of changes) {
      const board = withBonuses(change.board);
      expect(solve(board, level.minShots - 1)).toBeNull();
      const { shots } = playMoves(board, par);
      expect(shots[shots.length - 1].outcome).toBe("goal");
      expect(change.added.length).toBeGreaterThan(0);
    }
    // Changes that make par easier come last.
    const atPar = changes.map((change) => change.addedAtPar);
    expect(atPar).toEqual([...atPar].sort((a, b) => a - b));
    for (const change of changes) {
      const shots = change.added.map((moves) => shotRows(moves).length);
      expect(Math.min(...shots)).toBeGreaterThanOrEqual(level.minShots);
      expect(Math.max(...shots)).toBeLessThanOrEqual(level.minShots + 1);
    }
  });
});
