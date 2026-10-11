import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { fire } from "./simulate";
import {
  playMoves,
  setupRoutes,
  solve,
  solveBonus,
  solveBonusMoves,
  solveMoves,
} from "./solver";

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

  it("ignores a first shot that already wins", () => {
    // Row 0 wins, and on its way flips mirrors so that row 1 wins after
    // it; but a winning shot is no setup.
    const board = parseLevel(String.raw`
      . \ G
      . \ /
    `);
    expect(setupRoutes(board)).toEqual([]);
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

describe("player-placed mirror", () => {
  it("places the mirror when the solution needs it, taking no shot", () => {
    const board = parseLevel(String.raw`
      . . .
      # G .
    `);
    expect(solve(board)).toBeNull();
    expect(solveMoves(board, { playerMirror: "mirrorBackslash" })).toEqual([
      { x: 1, y: 0, mirror: "mirrorBackslash" },
      0,
    ]);
    expect(solve(board, 6, 1, "mirrorBackslash")).toEqual([0]);
  });

  it("places the mirror only after a shot that needs the cell empty", () => {
    // Row 0 must first flip the mirror at (2, 0) to "/"; a "/" placed
    // below it then turns row 1 up into it and on to the goal.
    const board = parseLevel(String.raw`
      . . \ G
      . . . #
    `);
    const moves = solveMoves(board, { playerMirror: "mirrorSlash" });
    expect(moves).toEqual([0, { x: 2, y: 1, mirror: "mirrorSlash" }, 1]);
    const { shots } = playMoves(board, moves!);
    expect(shots.map((shot) => shot.outcome)).toEqual(["exit", "goal"]);
  });

  it("solves a bonus target with the placed mirror", () => {
    const board = parseLevel(String.raw`
      # . * G
      . . . .
    `);
    expect(
      solveBonusMoves(board, { x: 2, y: 0 }, { playerMirror: "mirrorSlash" }),
    ).toEqual([{ x: 2, y: 1, mirror: "mirrorSlash" }, 1]);
    expect(solveBonus(board, { x: 2, y: 0 })).toBeNull();
  });
});
