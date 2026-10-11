import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS } from "../audio/music";
import { bonusPositions, withBonuses } from "../game/bonus";
import { setupRoutes, solve, solveBonus } from "../game/solver";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";

// Levels that can be solved in one shot, but also by a two-shot route where
// the first shot sets up the board for the second.
const LEVELS_WITH_SETUP_ROUTE = ["first-light", "up-and-over"];

it.each(LEVELS_WITH_SETUP_ROUTE)("%s has a two-shot setup route", (id) => {
  const level = LEVELS.find((candidate) => candidate.id === id);
  expect(level).toBeDefined();
  const board = withBonuses(parseLevel(level!.grid));
  expect(setupRoutes(board).length).toBeGreaterThan(0);
});

// Levels built around breakable walls: with every breakable wall solid,
// par is out of reach (levels 11-14 can't be solved at all that way; a
// player mirror makes a longer way round possible on levels 17-18).
const LEVELS_NEEDING_BREAKS = [
  "breakthrough",
  "stone-by-stone",
  "crack-and-double",
  "rubble-run",
  "clear-the-way",
  "rebuild",
];

it.each(LEVELS_NEEDING_BREAKS)("%s needs a breakable wall broken", (id) => {
  const level = LEVELS.find((candidate) => candidate.id === id);
  expect(level).toBeDefined();
  const board = withBonuses(parseLevel(level!.grid));
  const solid = {
    ...board,
    cells: board.cells.map((row) =>
      row.map((cell) => (cell === "breakable" ? "wall" : cell)),
    ),
  };
  const { goalHits = 1, playerMirror } = level!;
  expect(solve(board, level!.minShots, goalHits, playerMirror)).not.toBeNull();
  expect(solve(solid, level!.minShots, goalHits, playerMirror)).toBeNull();
});

// Levels that give the player a mirror are built around it: without it,
// par is out of reach (a longer way round may exist).
it.each(LEVELS.filter((level) => level.playerMirror).map((level) => level.id))(
  "%s needs the player's mirror",
  (id) => {
    const level = LEVELS.find((candidate) => candidate.id === id)!;
    const board = withBonuses(parseLevel(level.grid));
    expect(solve(board, level.minShots, level.goalHits ?? 1)).toBeNull();
  },
);

it("gives every level an existing music track", () => {
  for (const level of LEVELS) {
    expect(MUSIC_TRACKS[level.music]).toBeDefined();
  }
});

it("has unique level ids", () => {
  const ids = LEVELS.map((level) => level.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(LEVELS.map((level, index) => ({ ...level, number: index + 1 })))(
  "level $number ($name)",
  ({ grid, minShots, goalHits = 1, bonusShots, playerMirror, number }) => {
    it("parses", () => {
      expect(() => parseLevel(grid)).not.toThrow();
    });

    // Bonus targets are hidden until the level is completed at par, so par
    // is checked without them.
    it(`needs exactly ${minShots} shot(s) at best`, () => {
      const solution = solve(
        withBonuses(parseLevel(grid)),
        minShots,
        goalHits,
        playerMirror,
      );
      expect(solution).not.toBeNull();
      expect(solution).toHaveLength(minShots);
    });

    const bonuses = bonusPositions(parseLevel(grid));
    // Saved progress and bonusShots assume at most one per level for now.
    it("has at most one bonus target", () => {
      expect(bonuses.length).toBeLessThanOrEqual(1);
    });

    if (bonuses.length > 0) {
      it(`hits the bonus target in exactly ${bonusShots} shot(s) at best`, () => {
        expect(bonusShots).toBeDefined();
        const solution = solveBonus(
          parseLevel(grid),
          bonuses[0],
          bonusShots,
          goalHits,
          playerMirror,
        );
        expect(solution).not.toBeNull();
        expect(solution).toHaveLength(bonusShots!);
      });

      // A bonus target is a harder puzzle on top of the level; only the
      // first level's may take as few shots as par.
      it("needs more shots for the bonus target than par", () => {
        const minimum = number === 1 ? minShots : minShots + 1;
        expect(bonusShots).toBeGreaterThanOrEqual(minimum);
      });

      it("can still be completed at par with the bonus target showing", () => {
        const solution = solve(
          parseLevel(grid),
          minShots,
          goalHits,
          playerMirror,
        );
        expect(solution).toHaveLength(minShots);
      });
    } else {
      it("declares no bonusShots without a bonus target", () => {
        expect(bonusShots).toBeUndefined();
      });
    }
  },
);
