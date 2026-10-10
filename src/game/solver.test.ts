import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { fire } from "./simulate";
import { setupRoutes, solve, solveBonus } from "./solver";

describe("solve", () => {
  it("finds a one-shot solution", () => {
    expect(solve(parseLevel(". . G\n. . ."))).toEqual([0]);
  });

  it("finds a solution that needs a mirror flipped first", () => {
    // Row 0 first goes up and out, flipping its mirror to "\"; the second
    // shot from row 0 then goes down and is turned right into the goal.
    const board = parseLevel(String.raw`
      / .
      \ G
    `);
    expect(fire(board, 0).outcome).toBe("exit");
    expect(fire(board, 1).outcome).toBe("exit");
    expect(solve(board)).toEqual([0, 0]);
  });

  it("counts goal hits, one per shot, when the goal needs several", () => {
    expect(solve(parseLevel(". G"), 6, 2)).toEqual([0, 0]);
    // The first hit flips the mirror, so row 0 then misses (flipping it
    // back); the other rows are walled off. Two hits take three shots.
    const board = parseLevel(String.raw`
      . \ .
      # . .
      # G .
    `);
    expect(fire(board, 0).outcome).toBe("goal");
    expect(solve(board, 6, 2)).toEqual([0, 0, 0]);
  });

  it("returns null when there is no solution within the shot limit", () => {
    expect(solve(parseLevel("# G"))).toBeNull();
  });
});

describe("setupRoutes", () => {
  it("finds a miss that sets up a winning second shot", () => {
    // Same board as above: row 0 misses but flips its mirror, then row 0
    // wins. Row 1 never wins, before or after either shot.
    const board = parseLevel(String.raw`
      / .
      \ G
    `);
    expect(setupRoutes(board)).toEqual([[0, 0]]);
  });

  it("ignores second shots that would win anyway", () => {
    // Row 1 always wins straight ahead, whatever row 0 changed.
    const board = parseLevel(String.raw`
      / .
      . G
    `);
    expect(setupRoutes(board)).toEqual([]);
  });
});

describe("solveBonus", () => {
  it("finds the shortest way to hit a bonus target", () => {
    // The first shot from row 0 flips the mirror; the second goes down into
    // the bonus target.
    const board = parseLevel(String.raw`
      . / G
      # * .
    `);
    expect(solveBonus(board, { x: 1, y: 1 })).toEqual([0, 0]);
  });

  it("does not complete the level on the way", () => {
    // Row 1 turns up into the goal, flipping its mirror; only then does it
    // turn down into the bonus target. That needs a goal hit that does not
    // complete the level.
    const board = parseLevel(String.raw`
      . G
      . /
      # *
    `);
    expect(solveBonus(board, { x: 1, y: 2 }, 6, 1)).toBeNull();
    expect(solveBonus(board, { x: 1, y: 2 }, 6, 2)).toEqual([1, 1]);
  });
});
