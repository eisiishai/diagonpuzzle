import { describe, expect, it } from "vitest";
import { LEVELS } from "../levels/levels";
import { parseLevel } from "../levels/parse";
import { withBonuses } from "./bonus";
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
    expect(() => fire(board, 1)).toThrow("Row 1 is outside the board (0-0)");
  });
});

describe("mirror flipping", () => {
  it("flips each mirror the pellet bounces off, in the returned board", () => {
    const board = parseLevel(String.raw`
      . \ .
      . \ G
    `);
    const result = fire(board, 0);
    expect(result.outcome).toBe("goal");
    expect(result.path[1]).toMatchObject({
      x: 1,
      y: 0,
      becomes: "mirrorSlash",
    });
    expect(result.path[2]).toMatchObject({
      x: 1,
      y: 1,
      becomes: "mirrorSlash",
    });
    expect(result.board.cells).toEqual([
      ["empty", "mirrorSlash", "empty"],
      ["empty", "mirrorSlash", "goal"],
    ]);
  });

  it("does not modify the board passed in", () => {
    const board = parseLevel(String.raw`. \ G`);
    fire(board, 0);
    expect(board.cells[0][1]).toBe("mirrorBackslash");
  });

  it("leaves cells the pellet only passes through unchanged", () => {
    const result = fire(parseLevel(". # G"), 0);
    expect(result.path.every((step) => step.becomes === undefined)).toBe(true);
  });

  it("makes a second shot from the same row take a different path", () => {
    const board = parseLevel(String.raw`
      / . G
      . . .
    `);
    const first = fire(board, 0);
    expect(first.outcome).toBe("exit");
    const second = fire(first.board, 0);
    expect(second.path.map(({ x, y }) => `${x},${y}`)).toEqual(["0,0", "0,1"]);
    expect(second.path[0].directionOut).toBe("down");
    expect(second.outcome).toBe("exit");
  });

  it("applies a flip immediately when the same shot returns to a mirror", () => {
    // Row 0 goes round the 2x2 block of mirrors and re-enters (0,0) moving
    // left. Flipped to "/" by the first hit, it now turns the pellet down;
    // the original "\" would have sent it up and out of the top.
    const board = parseLevel(String.raw`
      \ \ .
      \ / .
      . . G
    `);
    const result = fire(board, 0);
    const visits = result.path.map(({ x, y }) => `${x},${y}`);
    expect(visits).toEqual(["0,0", "0,1", "1,1", "1,0", "0,0", "0,1"]);
    expect(result.path[4]).toMatchObject({
      directionIn: "left",
      directionOut: "down",
    });
    expect(result.outcome).toBe("exit");
  });
});

describe("level 1", () => {
  it("is solvable only from row 3", () => {
    const board = withBonuses(parseLevel(LEVELS[0].grid));
    const outcomes = Array.from(
      { length: board.height },
      (_, row) => fire(board, row).outcome,
    );
    expect(outcomes).toEqual(["exit", "blocked", "blocked", "goal", "exit"]);
  });
});

describe("breakable walls", () => {
  it("stop the pellet and break, so the next shot passes", () => {
    const board = parseLevel(". % G");
    const first = fire(board, 0);
    expect(first.outcome).toBe("blocked");
    expect(first.path[first.path.length - 1]).toMatchObject({
      x: 1,
      y: 0,
      becomes: "empty",
    });
    expect(first.board.cells[0][1]).toBe("empty");
    expect(fire(first.board, 0).outcome).toBe("goal");
  });
});

describe("reflectors", () => {
  it("send the pellet back the way it came, unchanged", () => {
    for (const d of ["right", "down", "left", "up"] as Direction[]) {
      const effect = CELL_BEHAVIORS.reflector(d);
      expect(effect).toEqual({
        kind: "pass",
        direction: { right: "left", left: "right", up: "down", down: "up" }[d],
      });
    }
    const result = fire(parseLevel(". @ G"), 0);
    expect(result.outcome).toBe("exit");
    expect(result.path.map(({ x }) => x)).toEqual([0, 1, 0]);
  });

  it("send it back into mirrors it flipped, which turn it somewhere new", () => {
    // Right into "\" (which flips to "/"), down to the reflector, back up
    // into the "/", which turns it right into the goal.
    const grid = String.raw`
      . \ G
      . @ .
    `;
    expect(cells(grid, 0)).toEqual(["0,0", "1,0", "1,1", "1,0", "2,0"]);
    expect(fire(parseLevel(grid), 0).outcome).toBe("goal");
  });
});
