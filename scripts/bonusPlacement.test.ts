import { describe, expect, it } from "vitest";
import { withBonuses } from "../src/game/bonus";
import {
  playMoves,
  shotRows,
  solve,
  solveBonus,
  solveBonusMoves,
  solveMoves,
} from "../src/game/solver";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import {
  findPlacements,
  firstEntries,
  withBonusNeeding,
} from "./bonusPlacement";
import { withWalls } from "./pieces";

describe("firstEntries", () => {
  it("finds the first shot reaching each cell, and in how many ways", () => {
    // Row 1 runs straight to the goal; row 2 turns up at the mirror and
    // crosses row 1 at (1, 0), so two shots reach that cell.
    const board = parseLevel(String.raw`
      . . G
      . / .
    `);
    const entries = firstEntries(board, 2, 1);
    expect(entries.get("0,0")).toEqual({ shots: 1, routes: 1 });
    expect(entries.get("1,0")).toEqual({ shots: 1, routes: 2 });
    expect(entries.has("2,1")).toBe(false);
  });
});

describe("findPlacements", () => {
  it("refuses a level with no solution within par", () => {
    expect(() =>
      findPlacements(parseLevel(". #\n# G"), {
        minShots: 1,
        goalHits: 1,
        bonusShots: 2,
        changes: 0,
      }),
    ).toThrow("no solution within 1 shots");
  });

  it.each([
    ["second-try", 0],
    ["crack-and-double", 1],
    ["hairpin", 0],
  ] as const)(
    "%s (%i board changes) keeps par and the bonus shots",
    (id, changes) => {
      const level = LEVELS.find((candidate) => candidate.id === id)!;
      const goalHits = level.goalHits ?? 1;
      const bonusShots = level.minShots + 1;
      const placements = findPlacements(parseLevel(level.grid), {
        minShots: level.minShots,
        goalHits,
        bonusShots,
        changes,
        playerMirror: level.playerMirror,
      });
      expect(placements.length).toBeGreaterThan(0);
      for (const placement of placements.slice(0, 20)) {
        const { board, bonus } = placement;
        expect(placement.changes.length).toBeLessThanOrEqual(changes);
        expect(shotRows(placement.route)).toHaveLength(bonusShots);
        expect(
          solveBonusMoves(board, bonus, {
            maxShots: bonusShots,
            goalHits,
            playerMirror: level.playerMirror,
          }),
        ).toEqual(placement.route);
        expect(
          solve(board, level.minShots, goalHits, level.playerMirror),
        ).toHaveLength(level.minShots);
        // The route really ends on the bonus target.
        const { shots } = playMoves(board, placement.route);
        expect(shots[shots.length - 1].outcome).toBe("bonus");
      }
      expect(placements[0].routes).toBeLessThanOrEqual(
        placements[1]?.routes ?? Infinity,
      );
    },
  );

  it("never changes a cell the par solution reaches", () => {
    // Return trip's par shot turns at (2,3) and the reflector; removing the
    // mirror at (2,3) used to pass, as row 3 still reached the goal.
    const level = LEVELS.find((candidate) => candidate.id === "return-trip")!;
    const board = parseLevel(level.grid);
    const par = solveMoves(withBonuses(board), { maxShots: 1, goalHits: 1 })!;
    const reached = new Set(
      playMoves(withBonuses(board), par).shots.flatMap((shot) =>
        shot.path.map(({ x, y }) => `${x},${y}`),
      ),
    );
    const placements = findPlacements(board, {
      minShots: 1,
      goalHits: 1,
      bonusShots: 2,
      changes: 1,
    });
    expect(placements.length).toBeGreaterThan(0);
    for (const { changes } of placements) {
      for (const { x, y } of changes) {
        expect(reached.has(`${x},${y}`)).toBe(false);
      }
    }
  });

  it("keeps only routes through the pieces asked for", () => {
    const level = LEVELS.find((candidate) => candidate.id === "return-trip")!;
    const options = { minShots: 1, goalHits: 1, bonusShots: 2, changes: 0 };
    const all = findPlacements(parseLevel(level.grid), options);
    const through = findPlacements(parseLevel(level.grid), {
      ...options,
      uses: ["reflector"],
    });
    expect(through.length).toBeGreaterThan(0);
    expect(through.length).toBeLessThanOrEqual(all.length);
    // The level has no cracked walls, so no route passes one.
    expect(
      findPlacements(parseLevel(level.grid), {
        ...options,
        uses: ["breakable"],
      }),
    ).toEqual([]);
    for (const { board, route } of through) {
      const cells = playMoves(board, route).shots.flatMap((shot) =>
        shot.path.map(({ x, y }) => board.cells[y][x]),
      );
      expect(cells).toContain("reflector");
    }
  });

  it("keeps only bonus targets that need the pieces asked for", () => {
    // Knock first's bonus target needs its portals (the search removes it
    // first and finds its cell again).
    const level = LEVELS.find((candidate) => candidate.id === "knock-first")!;
    const options = { minShots: 3, goalHits: 1, bonusShots: 4, changes: 0 };
    const needing = findPlacements(parseLevel(level.grid), {
      ...options,
      needs: ["portal"],
    });
    expect(needing.length).toBeGreaterThan(0);
    for (const { board, bonus } of needing) {
      expect(
        solveBonus(withWalls(board, "portal"), bonus, Infinity, 1),
      ).toBeNull();
    }
    expect(
      findPlacements(parseLevel(level.grid), options).length,
    ).toBeGreaterThanOrEqual(needing.length);
  });

  it("keeps only bonus targets out of reach without the player's mirror", () => {
    // Hairpin's bonus target in the top row is reached off the player's
    // mirror placed beside it.
    const level = LEVELS.find((candidate) => candidate.id === "hairpin")!;
    const board = parseLevel(level.grid);
    const options = {
      minShots: level.minShots,
      goalHits: 1,
      bonusShots: level.minShots + 1,
      changes: 0,
      playerMirror: level.playerMirror,
    };
    const needing = findPlacements(board, {
      ...options,
      needs: ["playerMirror"],
    });
    expect(needing.length).toBeGreaterThan(0);
    for (const { board: withBonus, bonus, route } of needing) {
      expect(route.some((move) => typeof move !== "number")).toBe(true);
      expect(solveBonus(withBonus, bonus, Infinity, 1)).toBeNull();
    }
    // Your move's targets can all be hit without it.
    const yourMove = LEVELS.find((candidate) => candidate.id === "your-move")!;
    expect(
      findPlacements(parseLevel(yourMove.grid), {
        ...options,
        minShots: yourMove.minShots,
        bonusShots: yourMove.minShots + 1,
        playerMirror: yourMove.playerMirror,
        needs: ["playerMirror"],
      }),
    ).toEqual([]);
  });
});

describe("withBonusNeeding", () => {
  // Shortcut without its bonus target, as the generator would find it.
  const level = LEVELS.find((candidate) => candidate.id === "shortcut")!;
  const candidate = {
    board: withBonuses(parseLevel(level.grid)),
    solutions: [[3, 3]],
    rowsHittingAtStart: 0,
    setupRoutes: [],
  };
  const options = { shots: 2, goalHits: 1 };

  it("adds a bonus target that needs the pieces, par + 1 or + 2 away", () => {
    const [kept] = withBonusNeeding([candidate], options, ["portal"]);
    expect(kept.bonus).toBeDefined();
    const { board, bonus, shots } = kept.bonus!;
    expect([3, 4]).toContain(shots);
    expect(solveBonus(board, bonus, shots, 1)).toHaveLength(shots);
    // Out of reach without the portals, however many shots are fired.
    expect(
      solveBonus(withWalls(board, "portal"), bonus, Infinity, 1),
    ).toBeNull();
  });

  it("drops boards without one", () => {
    // The level has no cracked wall, so no target can need one.
    expect(withBonusNeeding([candidate], options, ["breakable"])).toEqual([]);
  });
});
