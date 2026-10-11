import { describe, expect, it } from "vitest";
import { fire } from "../src/game/simulate";
import { parseLevel } from "../src/levels/parse";
import { describeShot, rowList } from "./levelAnalysis";

describe("describeShot", () => {
  it("tells the outcome and counts flipped mirrors", () => {
    expect(describeShot(fire(parseLevel(". G"), 0))).toBe(
      "goal, flips 0 mirrors",
    );
    // Row 0 turns down at the "\", flipping it, and leaves the board.
    const one = parseLevel(String.raw`
      \ G
      . .
    `);
    expect(describeShot(fire(one, 0))).toBe("exit, flips 1 mirror");
    // Row 0 turns down at the "\" and left at the "/", flipping both.
    const two = parseLevel(String.raw`
      \ .
      / G
    `);
    expect(describeShot(fire(two, 0))).toBe("exit, flips 2 mirrors");
  });

  it("tells when a shot breaks a wall, but not when it stops at one", () => {
    expect(describeShot(fire(parseLevel(". %\n. G"), 0))).toBe(
      "blocked, breaks a wall, flips 0 mirrors",
    );
    expect(describeShot(fire(parseLevel(". #\n. G"), 0))).toBe(
      "blocked, flips 0 mirrors",
    );
  });
});

describe("rowList", () => {
  it("counts rows and cells from 1, as the player does", () => {
    expect(rowList([3, { x: 2, y: 0, mirror: "mirrorSlash" }, 0])).toBe(
      "4 → / at (3,1) → 1",
    );
  });
});
