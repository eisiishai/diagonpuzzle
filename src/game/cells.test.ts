import { describe, expect, it } from "vitest";
import { CELL_SYMBOLS, parseLevel } from "../levels/parse";
import { boardHas } from "./board";
import { bounceKind, isGlassMirror, isMirror } from "./cells";
import type { CellType } from "./types";

const ALL_CELLS = Object.keys(CELL_SYMBOLS) as CellType[];

describe("cell groups", () => {
  it("tell mirrors and glass mirrors apart from the other cells", () => {
    expect(ALL_CELLS.filter(isMirror).sort()).toEqual([
      "mirrorBackslash",
      "mirrorSlash",
    ]);
    expect(ALL_CELLS.filter(isGlassMirror).sort()).toEqual([
      "glassBackslash",
      "glassSlash",
    ]);
  });

  it("name what turns the pellet in each cell that can", () => {
    expect(
      Object.fromEntries(
        ALL_CELLS.filter((cell) => bounceKind(cell) !== null).map((cell) => [
          cell,
          bounceKind(cell),
        ]),
      ),
    ).toEqual({
      mirrorBackslash: "mirror",
      mirrorSlash: "mirror",
      glassBackslash: "glass",
      glassSlash: "glass",
      reflector: "reflector",
    });
  });
});

describe("boardHas", () => {
  it("is true when any cell is one of those given", () => {
    const board = parseLevel(". N G");
    expect(boardHas(board, ["glassBackslash", "glassSlash"])).toBe(true);
    expect(boardHas(board, ["reflector"])).toBe(false);
    expect(boardHas(board, [])).toBe(false);
  });
});
