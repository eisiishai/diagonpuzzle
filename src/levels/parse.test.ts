import { describe, expect, it } from "vitest";
import { formatLevel, parseLevel } from "./parse";

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
    expect(() => parseLevel(". x G")).toThrow('unknown symbol "x"');
  });

  it("rejects a level without a goal", () => {
    expect(() => parseLevel(". . .")).toThrow("no goal");
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
  });
});
