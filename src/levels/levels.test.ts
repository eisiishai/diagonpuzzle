import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS } from "../audio/music";
import { bonusPositions, withBonuses } from "../game/bonus";
import { setupRoutes, solve, solveBonus } from "../game/solver";
import { CHAPTERS, LEVELS, chapterRanges } from "./levels";
import type { CellType } from "../game/types";
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

/** The level's starting board with every `from` cell made `to`. */
function replaced(
  id: string,
  from: CellType[],
  to: (cell: CellType) => CellType,
) {
  const level = LEVELS.find((candidate) => candidate.id === id)!;
  const board = withBonuses(parseLevel(level.grid));
  return {
    level,
    board: {
      ...board,
      cells: board.cells.map((row) =>
        row.map((cell) => (from.includes(cell) ? to(cell) : cell)),
      ),
    },
  };
}
const idsWith = (...cells: CellType[]) =>
  LEVELS.filter((level) =>
    cells.some((cell) => parseLevel(level.grid).cells.flat().includes(cell)),
  ).map((level) => level.id);

// Levels with breakable walls are built around them: with every breakable
// wall solid, par is out of reach (levels 11-15 can't be solved at all that
// way; a player mirror makes a longer way round possible on levels 19-20).
it.each(idsWith("breakable"))("%s needs a breakable wall broken", (id) => {
  const { level, board } = replaced(id, ["breakable"], () => "wall");
  const { minShots, goalHits = 1, playerMirror } = level;
  expect(solve(board, minShots, goalHits, playerMirror)).toBeNull();
});

// Levels with reflectors are built around them: with every reflector a
// wall, par is out of reach.
it.each(idsWith("reflector"))("%s needs a reflector", (id) => {
  const { level, board } = replaced(id, ["reflector"], () => "wall");
  const { minShots, goalHits = 1, playerMirror } = level;
  expect(solve(board, minShots, goalHits, playerMirror)).toBeNull();
});

// Levels with glass mirrors are built around their shattering: with every
// glass mirror an ordinary one, par is out of reach.
it.each(idsWith("glassBackslash", "glassSlash"))(
  "%s needs a glass mirror shattered",
  (id) => {
    const { level, board } = replaced(
      id,
      ["glassBackslash", "glassSlash"],
      (cell) => (cell === "glassBackslash" ? "mirrorBackslash" : "mirrorSlash"),
    );
    const { minShots, goalHits = 1, playerMirror } = level;
    expect(solve(board, minShots, goalHits, playerMirror)).toBeNull();
  },
);

// Levels with fixed mirrors are built around their staying put: with every
// fixed mirror an ordinary one, which flips, par is out of reach.
it.each(idsWith("fixedBackslash", "fixedSlash"))(
  "%s needs a fixed mirror to stay fixed",
  (id) => {
    const { level, board } = replaced(
      id,
      ["fixedBackslash", "fixedSlash"],
      (cell) => (cell === "fixedBackslash" ? "mirrorBackslash" : "mirrorSlash"),
    );
    const { minShots, goalHits = 1, playerMirror } = level;
    expect(solve(board, minShots, goalHits, playerMirror)).toBeNull();
  },
);

// Levels with portals are built around them: with both portals walls, par
// is out of reach.
it.each(idsWith("portal"))("%s needs its portals", (id) => {
  const { level, board } = replaced(id, ["portal"], () => "wall");
  const { minShots, goalHits = 1, playerMirror } = level;
  expect(solve(board, minShots, goalHits, playerMirror)).toBeNull();
});

// Their bonus targets need the portals too: with both portals walls, the
// bonus target is out of reach in its shots.
it.each(idsWith("portal"))(
  "%s needs its portals for the bonus target",
  (id) => {
    const { level, board } = replaced(id, ["portal"], () => "wall");
    const { bonusShots, goalHits = 1, playerMirror } = level;
    const [bonus] = bonusPositions(parseLevel(level.grid));
    expect(
      solveBonus(board, bonus, bonusShots, goalHits, playerMirror),
    ).toBeNull();
  },
);

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

describe("chapterRanges", () => {
  const levels = ["a", "b", "c", "d"].map((id) => ({ id }));

  it("runs each chapter up to the next one's first level", () => {
    const chapters = [
      { name: "One", firstLevel: "a" },
      { name: "Two", firstLevel: "c" },
    ];
    expect(chapterRanges(levels, chapters)).toEqual([
      { name: "One", start: 0, end: 2 },
      { name: "Two", start: 2, end: 4 },
    ]);
  });

  it("rejects a missing level, a late first chapter or a wrong order", () => {
    const named = (...ids: string[]) =>
      ids.map((firstLevel, i) => ({ name: `C${i}`, firstLevel }));
    expect(() => chapterRanges(levels, named("a", "x"))).toThrow();
    expect(() => chapterRanges(levels, named("b"))).toThrow();
    expect(() => chapterRanges(levels, named("a", "c", "b"))).toThrow();
  });

  // The title screen shows a chapter's levels as one row of tiles.
  it("splits the game's levels into chapters of 1 to 6 levels", () => {
    for (const { start, end } of chapterRanges(LEVELS, CHAPTERS)) {
      expect(end - start).toBeGreaterThanOrEqual(1);
      expect(end - start).toBeLessThanOrEqual(6);
    }
  });
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
