import { describe, expect, it } from "vitest";
import { parseLevel } from "../src/levels/parse";
import { parseMoves, traceMoves } from "./shotTrace";

describe("parseMoves", () => {
  it("reads rows and mirror cells counted from 1", () => {
    expect(parseMoves(["4", "5,3", "1"], "mirrorBackslash")).toEqual([
      3,
      { x: 4, y: 2, mirror: "mirrorBackslash" },
      0,
    ]);
  });

  it("rejects other words, and cells with no mirror to place", () => {
    expect(() => parseMoves(["up"])).toThrow('"up" is neither a row');
    expect(() => parseMoves(["2,2"])).toThrow("there is none to place");
  });
});

describe("traceMoves", () => {
  it("describes each shot cell by cell, with the board after it", () => {
    // Right into "\" (which flips), down to the reflector, back up into the
    // "/" it became, and right into the goal.
    const board = parseLevel(String.raw`
      . \ G
      . @ .
    `);
    expect(traceMoves(board, [0])).toEqual([
      "row 1: goal, flips 2 mirrors",
      "  (1,1) (2,1) (2,2) (2,1) (3,1)",
      "    . \\ G\n    . @ .",
    ]);
  });

  it("places the player's mirror, and refuses a cell it can't go on", () => {
    const board = parseLevel(". . G\n. . .");
    expect(
      traceMoves(board, [{ x: 1, y: 1, mirror: "mirrorSlash" }, 1]),
    ).toEqual([
      "mirror placed at (2,2)",
      "row 2: exit, flips 1 mirror",
      "  (1,2) (2,2) (2,1)",
      "    . . G\n    . \\ .",
    ]);
    expect(() =>
      traceMoves(board, [{ x: 2, y: 0, mirror: "mirrorSlash" }]),
    ).toThrow("can't go at (3,1)");
    expect(() => traceMoves(board, [5])).toThrow("No row 6");
  });
});
