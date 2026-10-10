import { describe, expect, it } from "vitest";
import { level01 } from "../levels/level01";
import { parseLevel } from "../levels/parse";
import { CELL_BEHAVIORS } from "./cells";
import { fire } from "./simulate";
import type { Direction } from "./types";

/** Compact path notation: "x,y" for each cell entered. */
function cells(board: string, row: number): string[] {
  return fire(parseLevel(board), row).path.map(({ x, y }) => `${x},${y}`);
}

describe("mirror behaviors", () => {
  const turns = (cell: "mirrorBackslash" | "mirrorSlash") =>
    Object.fromEntries(
      (["right", "down", "left", "up"] as Direction[]).map((d) => {
        const effect = CELL_BEHAVIORS[cell](d);
        return [d, effect.kind === "pass" ? effect.direction : effect.kind];
      }),
    );

  it("turns the pellet 90° on a backslash mirror", () => {
    expect(turns("mirrorBackslash")).toEqual({
      right: "down",
      down: "right",
      left: "up",
      up: "left",
    });
  });

  it("turns the pellet 90° on a slash mirror", () => {
    expect(turns("mirrorSlash")).toEqual({
      right: "up",
      up: "right",
      left: "down",
      down: "left",
    });
  });
});

describe("fire", () => {
  it("reaches a goal straight ahead", () => {
    expect(fire(parseLevel(". . . G"), 0).outcome).toBe("goal");
  });

  it("passes straight through empty cells and exits on the right", () => {
    const board = String.raw`
      . . .
      . . G
    `;
    expect(fire(parseLevel(board), 0).outcome).toBe("exit");
    expect(cells(board, 0)).toEqual(["0,0", "1,0", "2,0"]);
  });

  it("turns down on a backslash mirror when moving right", () => {
    const board = String.raw`
      . \ .
      . . .
      . G .
    `;
    const result = fire(parseLevel(board), 0);
    expect(result.outcome).toBe("goal");
    expect(cells(board, 0)).toEqual(["0,0", "1,0", "1,1", "1,2"]);
    expect(result.path[1]).toMatchObject({
      directionIn: "right",
      directionOut: "down",
    });
  });

  it("turns up on a slash mirror when moving right", () => {
    const board = String.raw`
      . G .
      . . .
      . / .
    `;
    expect(fire(parseLevel(board), 2).outcome).toBe("goal");
    expect(cells(board, 2)).toEqual(["0,2", "1,2", "1,1", "1,0"]);
  });

  it("exits through the top or bottom edge", () => {
    const board = String.raw`
      . / G
      . \ .
    `;
    expect(fire(parseLevel(board), 0).outcome).toBe("exit");
    expect(fire(parseLevel(board), 1).outcome).toBe("exit");
  });

  it("stops at a wall, including the wall cell in the path", () => {
    const board = ". # G";
    const result = fire(parseLevel(board), 0);
    expect(result.outcome).toBe("blocked");
    expect(result.path[result.path.length - 1]).toMatchObject({ x: 1, y: 0 });
  });

  it("rejects rows outside the board", () => {
    const board = parseLevel(". G");
    expect(() => fire(board, -1)).toThrow(RangeError);
    expect(() => fire(board, 1)).toThrow(RangeError);
  });
});

describe("level 1", () => {
  it("is solvable only from row 3", () => {
    const board = parseLevel(level01);
    const outcomes = Array.from(
      { length: board.height },
      (_, row) => fire(board, row).outcome,
    );
    expect(outcomes).toEqual(["exit", "blocked", "blocked", "goal", "exit"]);
  });
});
