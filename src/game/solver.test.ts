import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { fire } from "./simulate";
import { solve } from "./solver";

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

  it("returns null when there is no solution within the shot limit", () => {
    expect(solve(parseLevel("# G"))).toBeNull();
  });
});
