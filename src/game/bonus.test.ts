import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { bonusPositions, withBonuses } from "./bonus";

// Saved progress identifies a collected bonus target by its index in
// bonusPositions(), so the order must stay row by row, left to right.
const BOARD = parseLevel(String.raw`
  . * . *
  * . . G
`);

describe("bonusPositions", () => {
  it("lists bonus targets in reading order", () => {
    expect(bonusPositions(BOARD)).toEqual([
      { x: 1, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 1 },
    ]);
  });
});

describe("withBonuses", () => {
  it("keeps only the bonus targets asked for, by index", () => {
    const board = withBonuses(BOARD, (index) => index === 1);
    expect(bonusPositions(board)).toEqual([{ x: 3, y: 0 }]);
    expect(board.cells[0][1]).toBe("empty");
    expect(BOARD.cells[0][1]).toBe("bonus");
  });

  it("removes all of them by default", () => {
    expect(bonusPositions(withBonuses(BOARD))).toEqual([]);
  });

  it("returns a board without bonus targets as it is", () => {
    const board = parseLevel(". G");
    expect(withBonuses(board)).toBe(board);
  });
});
