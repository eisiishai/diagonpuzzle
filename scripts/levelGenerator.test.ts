import { describe, expect, it } from "vitest";
import { GATE_CELLS } from "../src/game/cells";
import { fire } from "../src/game/simulate";
import { playMoves, shotRows, solve } from "../src/game/solver";
import { parseLevel } from "../src/levels/parse";
import {
  createRandom,
  findCandidates,
  portalDistance,
  randomBoard,
  returnsThroughPortals,
  shortestSolutions,
  withAlternatives,
} from "./levelGenerator";
import {
  gatesBlock,
  withClosedGates,
  withFlippingMirrors,
  withSolidGlass,
  withSolidWalls,
  withWalls,
} from "./pieces";
import type { GeneratorOptions } from "./levelGenerator";

const OPTIONS: GeneratorOptions = {
  width: 5,
  height: 4,
  mirrors: 4,
  walls: 1,
  breakable: 0,
  reflectors: 0,
  glass: 0,
  fixed: 0,
  portals: false,
  gates: 0,
  placeLater: false,
  shots: 2,
  goalHits: 1,
  tries: 300,
  seed: 7,
  requireSetup: false,
  noRepeat: false,
  portalGap: 0,
  variedRows: false,
  returnTrip: false,
};

describe("createRandom", () => {
  it("repeats the same numbers for the same seed, in [0, 1)", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const numbers = Array.from({ length: 100 }, () => a());
    expect(numbers).toEqual(Array.from({ length: 100 }, () => b()));
    expect(numbers.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it("works from seed 0, which xorshift alone would keep at 0", () => {
    const random = createRandom(0);
    const numbers = Array.from({ length: 10 }, () => random());
    expect(new Set(numbers).size).toBe(10);
  });
});

describe("randomBoard", () => {
  it("places the goal in the rightmost column and the asked pieces", () => {
    const board = randomBoard(OPTIONS, createRandom(3));
    const cells = board.cells.flat();
    const count = (pred: (cell: string) => boolean) =>
      cells.filter(pred).length;
    expect(board.cells.filter((row) => row[4] === "goal")).toHaveLength(1);
    expect(count((cell) => cell === "goal")).toBe(1);
    expect(count((cell) => cell.startsWith("mirror"))).toBe(4);
    expect(count((cell) => cell === "wall")).toBe(1);
    const breakable = randomBoard(
      { ...OPTIONS, breakable: 2 },
      createRandom(3),
    );
    expect(
      breakable.cells.flat().filter((c) => c === "breakable"),
    ).toHaveLength(2);
  });

  it("refuses more pieces than fit left of the goal column", () => {
    expect(() =>
      randomBoard(
        {
          width: 2,
          height: 2,
          mirrors: 2,
          walls: 1,
          breakable: 0,
          reflectors: 0,
          glass: 0,
          fixed: 0,
          portals: false,
          gates: 0,
        },
        Math.random,
      ),
    ).toThrow("Too many");
  });
});

describe("shortestSolutions", () => {
  it("lists every solution of exactly the given length", () => {
    // Row 0 misses but flips its mirror, then row 0 wins (see solver tests).
    const board = parseLevel(String.raw`
      / .
      \ G
    `);
    expect(shortestSolutions(board, 2)).toEqual([[0, 0]]);
    expect(shortestSolutions(board, 1)).toEqual([]);
  });

  it("counts separate goal hits", () => {
    expect(shortestSolutions(parseLevel(". G"), 2, 2)).toEqual([[0, 0]]);
  });

  it("includes the player's mirror, counting the same play once", () => {
    // Row 1 hits the goal whether or not the mirror is placed somewhere
    // else first; row 0 needs it at (1, 0).
    const board = parseLevel(String.raw`
      . . .
      . G .
    `);
    expect(shortestSolutions(board, 1, 1, "mirrorBackslash")).toEqual([
      [1],
      [{ x: 1, y: 0, mirror: "mirrorBackslash" }, 0],
    ]);
  });
});

describe("findCandidates", () => {
  it("returns only boards whose par is the asked shots, unique ones first", () => {
    const candidates = findCandidates(OPTIONS);
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board, solutions } of candidates) {
      expect(solve(board, 6)).toHaveLength(2);
      expect(solutions.length).toBeGreaterThan(0);
    }
    const counts = candidates.map((c) => c.solutions.length);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it("applies the setup and no-repeat filters", () => {
    for (const c of findCandidates({
      ...OPTIONS,
      shots: 1,
      requireSetup: true,
    })) {
      expect(c.setupRoutes.length).toBeGreaterThan(0);
    }
    for (const c of findCandidates({ ...OPTIONS, noRepeat: true })) {
      for (const rows of c.solutions) {
        expect(rows[0]).not.toBe(rows[1]);
      }
    }
  });

  it("keeps only boards that need a breakable wall broken for par", () => {
    const candidates = findCandidates({ ...OPTIONS, breakable: 2 });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board } of candidates) {
      expect(solve(withSolidWalls(board), 2)).toBeNull();
    }
  });

  it("keeps only boards that need a reflector for par", () => {
    const candidates = findCandidates({ ...OPTIONS, reflectors: 1 });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board } of candidates) {
      expect(board.cells.flat()).toContain("reflector");
      expect(solve(withWalls(board, "reflector"), 2)).toBeNull();
    }
  });

  it("keeps only boards that need a glass mirror shattered for par", () => {
    const candidates = findCandidates({ ...OPTIONS, glass: 2 });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board } of candidates) {
      expect(solve(withSolidGlass(board), 2)).toBeNull();
    }
  });

  it("keeps only boards that need a fixed mirror to stay fixed for par", () => {
    const candidates = findCandidates({ ...OPTIONS, fixed: 2 });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board } of candidates) {
      const fixed = board.cells
        .flat()
        .filter((c) => c === "fixedBackslash" || c === "fixedSlash");
      expect(fixed).toHaveLength(2);
      const flipping = withFlippingMirrors(board);
      expect(flipping.cells.flat()).not.toContain("fixedBackslash");
      expect(flipping.cells.flat()).not.toContain("fixedSlash");
      expect(solve(flipping, 2)).toBeNull();
    }
  });

  it("keeps only boards that need their pair of portals for par", () => {
    const candidates = findCandidates({ ...OPTIONS, portals: true });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board } of candidates) {
      expect(board.cells.flat().filter((c) => c === "portal")).toHaveLength(2);
      expect(solve(withWalls(board, "portal"), 2)).toBeNull();
    }
  });

  it("keeps only boards whose gates are passed and block another way", () => {
    const candidates = findCandidates({
      ...OPTIONS,
      height: 5,
      mirrors: 5,
      walls: 0,
      gates: 2,
      tries: 4000,
    });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board } of candidates) {
      expect(
        board.cells.flat().filter((c) => GATE_CELLS.includes(c)),
      ).toHaveLength(2);
      expect(solve(withClosedGates(board), 2)).toBeNull();
      expect(gatesBlock(board, 2)).toBe(true);
    }
  });

  it("keeps portals apart and solutions firing more than one row", () => {
    const options = { ...OPTIONS, portals: true, portalGap: 2 };
    const apart = findCandidates(options);
    expect(apart.length).toBeGreaterThan(0);
    for (const { board } of apart) {
      expect(portalDistance(board)).toBeGreaterThanOrEqual(2);
    }
    // Some boards in the same search have them touching.
    expect(
      findCandidates({ ...options, portalGap: 0 }).some(
        ({ board }) => portalDistance(board) === 1,
      ),
    ).toBe(true);
    const varied = findCandidates({ ...OPTIONS, variedRows: true });
    expect(varied.length).toBeGreaterThan(0);
    for (const { solutions } of varied) {
      for (const moves of solutions) {
        expect(new Set(shotRows(moves)).size).toBeGreaterThan(1);
      }
    }
  });

  it("keeps only boards whose solution comes back through the portals", () => {
    const candidates = findCandidates({
      ...OPTIONS,
      width: 6,
      height: 5,
      mirrors: 5,
      portals: true,
      reflectors: 1,
      returnTrip: true,
      tries: 2000,
    });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board, solutions } of candidates) {
      for (const moves of solutions) {
        expect(playMoves(board, moves).shots.some(returnsThroughPortals)).toBe(
          true,
        );
      }
    }
  });

  it("keeps only boards that need the player's mirror, later if asked", () => {
    const candidates = findCandidates({
      ...OPTIONS,
      playerMirror: "mirrorSlash",
      placeLater: true,
    });
    expect(candidates.length).toBeGreaterThan(0);
    for (const { board, solutions } of candidates) {
      expect(solve(board, 2)).toBeNull();
      expect(solve(board, 2, 1, "mirrorSlash")).toHaveLength(2);
      for (const moves of solutions) {
        expect(typeof moves[0]).toBe("number");
      }
    }
  });
});

describe("withAlternatives", () => {
  it("keeps candidates in order that have a solution a shot or two above par", () => {
    const candidates = findCandidates(OPTIONS);
    const kept = withAlternatives(candidates, OPTIONS, 2, 3);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThanOrEqual(3);
    const order = kept.map((kept) =>
      candidates.findIndex((candidate) => candidate.board === kept.board),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const { alternative } of kept) {
      const shots = shotRows(alternative!).length;
      expect(shots).toBeGreaterThan(OPTIONS.shots);
      expect(shots).toBeLessThanOrEqual(OPTIONS.shots + 2);
    }
  });
});

describe("portalDistance", () => {
  it("counts a diagonal step as one, and is null without portals", () => {
    expect(portalDistance(parseLevel("O . G\n. O ."))).toBe(1);
    expect(portalDistance(parseLevel("O . O G"))).toBe(2);
    expect(portalDistance(parseLevel(". G"))).toBeNull();
  });
});

describe("returnsThroughPortals", () => {
  it("is true for a shot through the portals, off a reflector and back", () => {
    // Into the left portal, out of the right one, back off the reflector
    // through both portals and out at the launcher.
    expect(returnsThroughPortals(fire(parseLevel(". O O @ G"), 0))).toBe(true);
    // Through the portals, but not back.
    expect(returnsThroughPortals(fire(parseLevel(". O . O G"), 0))).toBe(false);
    // Off a reflector, without portals.
    expect(returnsThroughPortals(fire(parseLevel(". @ G"), 0))).toBe(false);
  });
});
