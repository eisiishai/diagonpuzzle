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

describe("portals", () => {
  it("send the pellet on from the other portal, moving the same way", () => {
    // Into the portal at (1,0), out of the one at (0,1), on right to the
    // goal; the portals don't change.
    const grid = String.raw`
      . O #
      O . G
    `;
    expect(CELL_BEHAVIORS.portal("up")).toEqual({ kind: "teleport" });
    const result = fire(parseLevel(grid), 0);
    expect(result.outcome).toBe("goal");
    expect(cells(grid, 0)).toEqual(["0,0", "1,0", "0,1", "1,1", "2,1"]);
    expect(result.path[2]).toEqual({
      x: 0,
      y: 1,
      cell: "portal",
      directionIn: "right",
      directionOut: "right",
      throughPortal: true,
    });
    expect(result.path[1].throughPortal).toBeUndefined();
    expect(result.board.cells).toEqual(parseLevel(grid).cells);
  });

  it("work both ways, after mirrors turn the pellet into them", () => {
    // Row 2 turns up at the "/" and left at the "\" above it, enters the
    // right portal moving left and comes out of the left one, moving left
    // off the board.
    const grid = String.raw`
      O . . O \
      . . . . /
      # . . . G
    `;
    const result = fire(parseLevel(grid), 1);
    expect(result.outcome).toBe("exit");
    expect(cells(grid, 1)).toEqual([
      "0,1",
      "1,1",
      "2,1",
      "3,1",
      "4,1",
      "4,0",
      "3,0",
      "0,0",
    ]);
  });

  it("need a partner", () => {
    const lone = { width: 2, height: 1, cells: [["portal", "goal"]] } as const;
    expect(() =>
      fire({ ...lone, cells: lone.cells.map((row) => [...row]) }, 0),
    ).toThrow("two portals");
  });
});

describe("glass mirrors", () => {
  it("turn the pellet like mirrors, then shatter", () => {
    for (const [glass, mirror] of [
      ["glassBackslash", "mirrorBackslash"],
      ["glassSlash", "mirrorSlash"],
    ] as const) {
      for (const d of ["right", "down", "left", "up"] as Direction[]) {
        expect(CELL_BEHAVIORS[glass](d)).toEqual({
          ...CELL_BEHAVIORS[mirror](d),
          becomes: "empty",
        });
      }
    }
    const board = parseLevel(String.raw`
      . N .
      . . G
    `);
    const first = fire(board, 0);
    expect(first.outcome).toBe("exit");
    expect(first.board.cells[0][1]).toBe("empty");
    expect(fire(first.board, 0).outcome).toBe("exit");
  });

  it("are gone if the pellet comes back to them in the same shot", () => {
    // Down off the glass, back up from the reflector, straight through.
    const grid = String.raw`
      . N G
      . @ .
    `;
    expect(cells(grid, 0)).toEqual(["0,0", "1,0", "1,1", "1,0"]);
  });
});

describe("fixed mirrors", () => {
  it("turn the pellet like mirrors, and never change", () => {
    for (const [fixed, mirror] of [
      ["fixedBackslash", "mirrorBackslash"],
      ["fixedSlash", "mirrorSlash"],
    ] as const) {
      for (const d of ["right", "down", "left", "up"] as Direction[]) {
        const { becomes, ...turn } = CELL_BEHAVIORS[mirror](d) as {
          becomes?: string;
        };
        expect(becomes).toBeDefined();
        expect(CELL_BEHAVIORS[fixed](d)).toEqual(turn);
      }
    }
  });

  it("turn every shot the same way", () => {
    const board = parseLevel(String.raw`
      . L .
      . . G
    `);
    const first = fire(board, 0);
    expect(first.outcome).toBe("exit");
    expect(first.board.cells).toEqual(board.cells);
    expect(
      cells(
        String.raw`
      . L .
      . . G
    `,
        0,
      ),
    ).toEqual(["0,0", "1,0", "1,1"]);
  });

  it("turn a pellet coming back the same way, unlike a mirror", () => {
    // Up into the reflector and back down: the fixed "/" turns the pellet
    // left on its way back, where a flipped mirror would turn it right.
    expect(
      cells(
        String.raw`
      . @ .
      . J G
    `,
        1,
      ),
    ).toEqual(["0,1", "1,1", "1,0", "1,1", "0,1"]);
    expect(
      cells(
        String.raw`
      . @ .
      . / G
    `,
        1,
      ),
    ).toEqual(["0,1", "1,1", "1,0", "1,1", "2,1"]);
  });
});

describe("one-way gates", () => {
  it("let the pellet through the way they point, and never change", () => {
    const board = parseLevel(". > G");
    const result = fire(board, 0);
    expect(result.outcome).toBe("goal");
    expect(result.board.cells).toEqual(board.cells);
  });

  it("stop it like a wall from any other side", () => {
    // Head-on (row 0), and from the side (row 1, turned down by the "\"
    // into a gate pointing right).
    const grid = String.raw`
      . < G
      \ . G
      > . .
    `;
    const result = fire(parseLevel(grid), 0);
    expect(result.outcome).toBe("blocked");
    expect(result.board.cells[0][1]).toBe("gateLeft");
    expect(cells(grid, 0)).toEqual(["0,0", "1,0"]);
    expect(cells(grid, 1)).toEqual(["0,1", "0,2"]);
    expect(fire(parseLevel(grid), 1).outcome).toBe("blocked");
  });

  it("stop a pellet a reflector sends back through them", () => {
    // Through the gate to the reflector, and back into the gate's back.
    expect(cells(". > @ G", 0)).toEqual(["0,0", "1,0", "2,0", "1,0"]);
    expect(fire(parseLevel(". > @ G"), 0).outcome).toBe("blocked");
  });
});

describe("path steps", () => {
  it("name each cell as the pellet found it, before the hit changed it", () => {
    const result = fire(
      parseLevel(String.raw`
      . \ . %
      . @ . G
    `),
      0,
    );
    expect(result.path.map(({ cell, becomes }) => [cell, becomes])).toEqual([
      ["empty", undefined],
      ["mirrorBackslash", "mirrorSlash"],
      ["reflector", undefined],
      // Back into the mirror, which has flipped to "/".
      ["mirrorSlash", "mirrorBackslash"],
      ["empty", undefined],
      ["breakable", "empty"],
    ]);
  });
});

describe("shots on the game's levels", () => {
  // Every step can be traced back uniquely (docs/DESIGN.md, Outcomes), so
  // no shot loops, reflectors included. Random play checks it on every
  // level: 40 shots from the start, a fixed sequence per level.
  it.each(LEVELS.map((level, i) => [i + 1, level] as const))(
    "never loop on level %i",
    (_, level) => {
      let board = withBonuses(parseLevel(level.grid));
      let seed = level.id.length * 7919;
      for (let shot = 0; shot < 40; shot++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        const result = fire(board, seed % board.height);
        expect(result.outcome).not.toBe("loop");
        board = result.board;
      }
    },
  );
});
