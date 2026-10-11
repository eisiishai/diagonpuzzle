import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import {
  cellPositions,
  getCell,
  isInside,
  step,
  withCell,
  withCells,
} from "./board";

const BOARD = parseLevel(String.raw`
  . \ #
  / . G
`);

describe("isInside and getCell", () => {
  it("read cells inside the board and nothing outside it", () => {
    expect(isInside(BOARD, { x: 2, y: 1 })).toBe(true);
    expect(getCell(BOARD, { x: 1, y: 0 })).toBe("mirrorBackslash");
    for (const position of [
      { x: -1, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 2 },
    ]) {
      expect(isInside(BOARD, position)).toBe(false);
      expect(getCell(BOARD, position)).toBeUndefined();
    }
  });
});

describe("step", () => {
  it("moves one cell in each direction", () => {
    const from = { x: 1, y: 1 };
    expect(step(from, "up")).toEqual({ x: 1, y: 0 });
    expect(step(from, "down")).toEqual({ x: 1, y: 2 });
    expect(step(from, "left")).toEqual({ x: 0, y: 1 });
    expect(step(from, "right")).toEqual({ x: 2, y: 1 });
  });
});

describe("withCells", () => {
  it("returns a changed copy, leaving the given board alone", () => {
    const changed = withCells(BOARD, [
      { x: 0, y: 0, cell: "wall" },
      { x: 2, y: 0, cell: "empty" },
    ]);
    expect(changed.cells).toEqual([
      ["wall", "mirrorBackslash", "empty"],
      ["mirrorSlash", "empty", "goal"],
    ]);
    expect(changed.width).toBe(3);
    expect(changed.height).toBe(2);
    expect(BOARD.cells[0][0]).toBe("empty");
    expect(BOARD.cells[0][2]).toBe("wall");
  });

  it("returns the board as it is when there are no changes", () => {
    expect(withCells(BOARD, [])).toBe(BOARD);
  });

  it("changes one cell with withCell", () => {
    const changed = withCell(BOARD, { x: 1, y: 1, cell: "reflector" });
    expect(changed.cells[1]).toEqual(["mirrorSlash", "reflector", "goal"]);
    expect(BOARD.cells[1][1]).toBe("empty");
  });
});

describe("cellPositions", () => {
  it("lists the matching cells in reading order", () => {
    expect(cellPositions(BOARD, (cell) => cell === "empty")).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(cellPositions(BOARD, (_, { x }) => x === 2)).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ]);
  });
});
