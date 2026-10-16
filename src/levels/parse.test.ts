import { describe, expect, it } from "vitest";
import type { CellType } from "../game/types";
import { CELL_SYMBOLS, formatLevel, parseLevel } from "./parse";

describe("parseLevel", () => {
  it("maps every symbol to its cell type", () => {
    const board = parseLevel(String.raw`. \ / # G`);
    expect(board.width).toBe(5);
    expect(board.height).toBe(1);
    expect(board.cells[0]).toEqual([
      "empty",
      "mirrorBackslash",
      "mirrorSlash",
      "wall",
      "goal",
    ]);
  });

  it("reads every cell type's symbol, and writes it back", () => {
    const types = Object.keys(CELL_SYMBOLS) as CellType[];
    // Portals come in pairs.
    const cells = [...types, "portal" as const];
    const grid = cells.map((type) => CELL_SYMBOLS[type]).join(" ");
    const board = parseLevel(grid);
    expect(board.cells[0]).toEqual(cells);
    expect(formatLevel(board)).toBe(grid);
    expect(new Set(Object.values(CELL_SYMBOLS)).size).toBe(types.length);
  });

  it("ignores indentation, spacing and blank lines", () => {
    const spaced = parseLevel(`

        .  .  G

        .  #  .
    `);
    expect(spaced).toEqual(parseLevel("..G\n.#."));
  });

  it("rejects rows of different lengths", () => {
    expect(() => parseLevel(". . G\n. .")).toThrow(
      "Line 2: expected 3 cells, found 2",
    );
  });

  it("rejects unknown symbols", () => {
    expect(() => parseLevel(". . G\n. x G")).toThrow(
      'Line 2, cell 2: unknown symbol "x"',
    );
  });

  it("rejects a level without a goal", () => {
    expect(() => parseLevel(". . .")).toThrow("no goal");
  });

  it("rejects a level with one portal or more than two", () => {
    expect(() => parseLevel(". O G")).toThrow("1 portals");
    expect(() => parseLevel("O O O G")).toThrow("3 portals");
    expect(parseLevel("O O G").cells[0]).toEqual(["portal", "portal", "goal"]);
  });

  it("rejects an empty level", () => {
    expect(() => parseLevel("  \n ")).toThrow("empty");
  });

  it("formats a board back into the same grid", () => {
    const grid = String.raw`
      . \ / G
      # . . .
    `;
    const text = formatLevel(parseLevel(grid), "  ");
    expect(text).toBe("  . \\ / G\n  # . . .");
    expect(parseLevel(text)).toEqual(parseLevel(grid));
    expect(formatLevel(parseLevel(grid))).toBe(". \\ / G\n# . . .");
  });
});
