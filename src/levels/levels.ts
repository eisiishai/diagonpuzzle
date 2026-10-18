import type { MusicTrackId } from "../audio/music";
import type { MirrorType } from "../game/types";

export interface LevelDefinition {
  /** Stable identifier used for saved progress; never change it once released. */
  id: string;
  name: string;
  /**
   * Fewest shots that solve the level, as designed. Tests check it with the
   * solver, so a level that is accidentally easier or harder fails.
   */
  minShots: number;
  /**
   * How many times the goal must be hit to complete the level, each by a
   * separate shot (the goal stops the beam). Default 1.
   */
  goalHits?: number;
  /**
   * Fewest shots that hit the level's bonus target (`*` in the grid), from
   * the starting board, without completing the level first. Required when
   * the level has a bonus target; tests check it with the solver.
   */
  bonusShots?: number;
  /**
   * A mirror the player may place once, on any empty cell, between shots
   * (see docs/DESIGN.md, Player-placed mirror). Tests check that par needs it.
   */
  playerMirror?: MirrorType;
  /** Background music while playing the level. */
  music: MusicTrackId;
  /** Text grid, format in docs/DESIGN.md. */
  grid: string;
}

// String.raw keeps "\" literal; in a plain template string "\ " is just a space.
export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
    name: "First light",
    minShots: 1,
    bonusShots: 1,
    music: "afterglow",
    grid: String.raw`
      . . . \ . .
      # . / . . G
      . . . . # .
      . . / \ . *
      . . . / . .
    `,
  },
  {
    id: "up-and-over",
    name: "Up and over",
    minShots: 1,
    bonusShots: 2,
    music: "afterglow",
    grid: String.raw`
      . . \ . * . \
      . . . / . . G
      . . . . . # .
      . \ . . . . .
      . . . / . . .
      . . \ . \ . .
    `,
  },
  {
    id: "second-try",
    name: "Second try",
    minShots: 2,
    bonusShots: 3,
    music: "afterglow",
    grid: String.raw`
      . . / . . \ .
      / . / . . . G
      . # . . . . .
      \ . / . . . .
      . . / . . . *
    `,
  },
  {
    id: "set-the-stage",
    name: "Set the stage",
    minShots: 2,
    bonusShots: 3,
    music: "afterglow",
    grid: String.raw`
      / \ . . \ . . *
      . . . . \ . # .
      / \ . / . . . .
      . . . / . . . G
      . \ . . / . . .
      . . . # . . . .
    `,
  },
  {
    id: "down-and-around",
    name: "Down and around",
    minShots: 2,
    bonusShots: 3,
    music: "afterglow",
    grid: String.raw`
      # . . . * . . .
      / # . . / . / G
      . . \ . . / . .
      . . . . / . . .
      . . \ . . . . \
      / . . . . . / .
    `,
  },
  {
    id: "double-take",
    name: "Double take",
    minShots: 2,
    goalHits: 2,
    bonusShots: 3,
    music: "glassGarden",
    grid: String.raw`
      . . \ . *
      . . / . G
      . . / # .
      . . . . .
    `,
  },
  {
    id: "encore",
    name: "Warm-up",
    minShots: 3,
    goalHits: 2,
    bonusShots: 4,
    music: "glassGarden",
    grid: String.raw`
      . . . . \ *
      / . . . / G
      . . . . \ /
      \ . . . # .
    `,
  },
  {
    id: "third-time-lucky",
    name: "Third time lucky",
    minShots: 3,
    bonusShots: 4,
    music: "glassGarden",
    grid: String.raw`
      \ / . . . . / .
      \ . . # . . . .
      . . . . . . . .
      . . \ . . . . .
      . . . . . . \ G
      \ / . . . . . *
      \ . . . . / . .
    `,
  },
  {
    id: "back-and-forth",
    name: "Back and forth",
    minShots: 3,
    bonusShots: 4,
    music: "glassGarden",
    grid: String.raw`
      # . # . . . . . .
      . . . . . \ . . *
      \ # . / . / \ / .
      . . . \ . . . . .
      . . . . . \ . \ .
      . . . \ . . \ \ G
      . . . . . . . . .
    `,
  },
  {
    id: "two-step",
    name: "Two-step",
    minShots: 4,
    bonusShots: 6,
    music: "glassGarden",
    grid: String.raw`
      . \ . . \ . . . .
      . . . . . . . / G
      . . . \ . / . . .
      . . . . . \ / . .
      . . . \ . . \ / .
      . . . . # . / . .
      . . . . . \ . . .
      . # . . . . . * .
    `,
  },
  {
    id: "breakthrough",
    name: "Breakthrough",
    minShots: 3,
    bonusShots: 4,
    music: "prism",
    grid: String.raw`
      / . . / \ . . .
      . . % . \ . . .
      / . / . . . . .
      . # * . . . . .
      # . . \ / . . G
      . . . . % . / .
    `,
  },
  {
    id: "trapdoor",
    name: "Trapdoor",
    minShots: 4,
    bonusShots: 5,
    music: "prism",
    grid: String.raw`
      . . . \ / . .
      \ / . . . . .
      % . . . \ \ .
      . . . / # * .
      \ . . . . % G
    `,
  },
  {
    id: "stone-by-stone",
    name: "Stone by stone",
    minShots: 4,
    bonusShots: 5,
    music: "prism",
    grid: String.raw`
      . / . . . \ . . .
      \ % # . . . . % .
      . . / / . . . . .
      . . . . / \ \ . .
      \ . / . . . / . .
      . \ . . . % . . G
      . \ . . . # * . .
    `,
  },
  {
    id: "crack-and-double",
    name: "Crack and double",
    minShots: 3,
    goalHits: 2,
    bonusShots: 4,
    music: "prism",
    grid: String.raw`
      \ / . # . .
      . \ . \ . .
      . . . \ . .
      / / . % . G
      . / . . * .
    `,
  },
  {
    id: "rubble-run",
    name: "Rubble run",
    minShots: 5,
    goalHits: 2,
    bonusShots: 6,
    music: "prism",
    grid: String.raw`
      / . . . # . .
      / . . \ . . G
      . . % \ . . .
      / . / . % . .
      . . . \ . . .
      / # / . . * .
    `,
  },
  {
    id: "your-move",
    name: "Your move",
    minShots: 1,
    bonusShots: 2,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      \ . * . G
      . . # / .
      / . . # .
      . . . . .
    `,
  },
  {
    id: "hairpin",
    name: "Hairpin",
    minShots: 2,
    bonusShots: 3,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      . # * . . .
      . \ # . / .
      . / . . . .
      . . . / . .
      . . . . / G
    `,
  },
  {
    id: "double-duty",
    name: "Double duty",
    minShots: 3,
    bonusShots: 4,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      . . . / . .
      . / . . \ \
      . . # \ . .
      . . . . # *
      . \ / . . G
    `,
  },
  {
    id: "clear-the-way",
    name: "Clear the way",
    minShots: 3,
    goalHits: 2,
    bonusShots: 4,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      % . \ . G
      . . \ . .
      . . # . .
      . . / / *
      % . / \ .
    `,
  },
  {
    id: "rebuild",
    name: "Rebuild",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    playerMirror: "mirrorSlash",
    music: "photon",
    grid: String.raw`
      # . % * / .
      \ . # / % \
      . . . \ . G
      \ . . . . .
      . . . % \ .
    `,
  },
  {
    id: "return-trip",
    name: "Return trip",
    minShots: 1,
    bonusShots: 2,
    music: "return",
    grid: String.raw`
      . \ / . .
      . @ * # .
      . / . . G
      . \ . . .
    `,
  },
  {
    id: "there-and-back",
    name: "There and back",
    minShots: 2,
    bonusShots: 3,
    music: "return",
    grid: String.raw`
      \ . . . \ *
      . / . . . .
      \ . . @ . .
      . . # . @ .
      . / . / . G
    `,
  },
  {
    id: "ricochet",
    name: "Ricochet",
    minShots: 3,
    bonusShots: 4,
    music: "return",
    grid: String.raw`
      . \ @ . . .
      / . . % * .
      \ # . . . .
      . . . % . .
      \ . / % . G
    `,
  },
  {
    id: "mirror-image",
    name: "Mirror image",
    minShots: 3,
    bonusShots: 4,
    playerMirror: "mirrorBackslash",
    music: "return",
    grid: String.raw`
      . . \ . . .
      . / . \ / *
      . . . @ . G
      . / . . . .
      . . # . . .
    `,
  },
  {
    id: "double-back",
    name: "Double back",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    music: "return",
    grid: String.raw`
      / . / . . .
      \ . . / / .
      . . . \ . G
      @ . / . . .
      . # * . . .
      . . . . . .
    `,
  },
  {
    id: "glass-house",
    name: "Glass house",
    minShots: 2,
    bonusShots: 4,
    music: "glassHarp",
    grid: String.raw`
      \ . \ . .
      . . Z . G
      / \ * . .
      . . . # .
    `,
  },
  {
    id: "clean-break",
    name: "Clean break",
    minShots: 3,
    bonusShots: 4,
    music: "glassHarp",
    grid: String.raw`
      . . . / . .
      . / . . N *
      . . / . Z G
      . \ . # . .
      . . / . . .
    `,
  },
  {
    id: "glass-echo",
    name: "Glass echo",
    minShots: 3,
    bonusShots: 4,
    music: "glassHarp",
    grid: String.raw`
      . # \ N . *
      / . . / . .
      / . . . . .
      / . \ . . .
      @ . . Z . G
    `,
  },
  {
    id: "double-glazing",
    name: "Double glazing",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    music: "glassHarp",
    grid: String.raw`
      . . . \ . G
      . . Z \ . .
      . . / # . .
      \ . . . . .
      / Z . * . .
    `,
  },
  {
    id: "glass-and-stone",
    name: "Glass and stone",
    minShots: 4,
    bonusShots: 5,
    music: "glassHarp",
    grid: String.raw`
      \ . . . . .
      % . . / % G
      N . . / Z *
      . . . \ . .
      \ . . . . .
      . . . \ . .
    `,
  },
  {
    id: "bolted-down",
    name: "Bolted down",
    minShots: 2,
    bonusShots: 3,
    music: "anchor",
    grid: String.raw`
      . \ . \ G
      . . \ . *
      . . . J .
      . / \ # .
    `,
  },
  {
    id: "cold-steel",
    name: "Cold steel",
    minShots: 3,
    bonusShots: 4,
    music: "anchor",
    grid: String.raw`
      \ . . . \ .
      . \ . J \ /
      . \ . . / .
      / . # / L G
      . . # . * .
    `,
  },
  {
    id: "strike-twice",
    name: "Strike twice",
    minShots: 4,
    goalHits: 2,
    bonusShots: 5,
    music: "anchor",
    grid: String.raw`
      . . / L . .
      . . . / \ *
      / . . . / .
      J . / . . G
      # . . . . .
    `,
  },
  {
    id: "steel-echo",
    name: "Steel echo",
    minShots: 3,
    bonusShots: 5,
    music: "anchor",
    grid: String.raw`
      / . / . \ .
      . / / # . .
      / @ . . . .
      L . . . % G
      \ L / . * .
    `,
  },
  {
    id: "true-north",
    name: "True north",
    minShots: 3,
    bonusShots: 4,
    playerMirror: "mirrorBackslash",
    music: "anchor",
    grid: String.raw`
      . . # . . G
      N . . J / .
      . . L . . .
      . / . . / *
      \ . . \ . .
    `,
  },
  {
    id: "other-side",
    name: "Other side",
    minShots: 1,
    bonusShots: 3,
    music: "wormhole",
    grid: String.raw`
      \ . . # . .
      . O . . . .
      / . . . \ \
      . / * # O G
      \ . . . . .
    `,
  },
  {
    id: "shortcut",
    name: "Shortcut",
    minShots: 2,
    bonusShots: 3,
    music: "wormhole",
    grid: String.raw`
      O . . . . G
      # . . . . .
      # . / . . .
      / . . / \ *
      \ . . O / .
    `,
  },
  {
    id: "knock-first",
    name: "Knock first",
    minShots: 3,
    bonusShots: 4,
    music: "wormhole",
    grid: String.raw`
      \ . O . / .
      . # . . . .
      . . . \ . *
      . O . / # .
      / . . % . G
    `,
  },
  {
    id: "boomerang",
    name: "Boomerang",
    minShots: 4,
    bonusShots: 5,
    music: "wormhole",
    grid: String.raw`
      . . \ \ / .
      / / . . . G
      \ O . * O .
      . / / # . .
      . . # . @ .
    `,
  },
  {
    id: "looking-glass",
    name: "Looking glass",
    minShots: 4,
    bonusShots: 5,
    music: "wormhole",
    grid: String.raw`
      # . . . . .
      / / . . . G
      \ . . . . .
      N . / * . .
      O J / . O .
    `,
  },
  {
    id: "one-way",
    name: "One way",
    minShots: 2,
    bonusShots: 3,
    music: "current",
    grid: String.raw`
      . . \ . *
      . > . / .
      . . . / G
      . . ^ / .
      . . \ . .
    `,
  },
  {
    id: "no-way-back",
    name: "No way back",
    minShots: 3,
    bonusShots: 4,
    music: "current",
    grid: String.raw`
      . \ . / . G
      . / . \ # .
      . ^ \ . . *
      . \ ^ / . .
      . . \ . . .
    `,
  },
  {
    id: "echo-chamber",
    name: "Echo chamber",
    minShots: 3,
    bonusShots: 5,
    music: "current",
    grid: String.raw`
      \ . > . \ G
      @ . . / . .
      % . . . / .
      . . . v / *
      . . . . . .
    `,
  },
  {
    id: "double-crossing",
    name: "Double crossing",
    minShots: 4,
    goalHits: 2,
    bonusShots: 6,
    music: "current",
    grid: String.raw`
      . \ . / . .
      . ^ . * . .
      O . > . . G
      . \ . . O .
      . \ \ . . .
    `,
  },
  {
    id: "last-light",
    name: "Last light",
    minShots: 5,
    bonusShots: 6,
    playerMirror: "mirrorBackslash",
    music: "current",
    grid: String.raw`
      \ / . / . *
      v . . . . G
      / . N . . .
      . . \ . / .
      . < . . . .
    `,
  },
  // The secret chapter, shown once every bonus target above is found (see
  // docs/DESIGN.md, Secret chapter). Harder levels combining earlier
  // pieces, with no bonus targets of their own.
  {
    id: "long-game",
    name: "Long game",
    minShots: 5,
    music: "wormhole",
    grid: String.raw`
      . . \ . \ G
      # . . . . .
      . . N / . .
      O . . / / .
      / . O . \ .
    `,
  },
  {
    id: "headwind",
    name: "Headwind",
    minShots: 5,
    goalHits: 2,
    music: "anchor",
    grid: String.raw`
      . / . < . .
      . / . > \ .
      . / \ . J .
      . . / . . G
      . . . . . .
    `,
  },
  {
    id: "aftershock",
    name: "Aftershock",
    minShots: 5,
    music: "return",
    grid: String.raw`
      . \ . \ \ G
      . \ . % \ .
      . . # . % .
      . . \ / . .
      . . @ . . .
    `,
  },
  {
    id: "far-corner",
    name: "Far corner",
    minShots: 5,
    playerMirror: "mirrorBackslash",
    music: "photon",
    grid: String.raw`
      / / \ . . .
      \ / O \ . G
      \ . . # . .
      . . / . . .
      . . . O . .
    `,
  },
  {
    id: "full-circle",
    name: "Full circle",
    minShots: 5,
    goalHits: 2,
    music: "afterglow",
    grid: String.raw`
      Z . \ . . .
      . # . . . .
      O . J \ . G
      \ . \ . . .
      \ . . \ O .
    `,
  },
];

export interface ChapterDefinition {
  /** Shown in the title screen's level list, in capitals. */
  name: string;
  /** The id of the chapter's first level; it runs up to the next chapter's. */
  firstLevel: string;
  /**
   * Hidden from the level list until every bonus target of the chapters
   * before it is found. Secret chapters come last.
   */
  secret?: boolean;
}

/**
 * The level list's chapters, one per mechanic (they follow the music
 * groups, see docs/DESIGN.md, Sound). A new level joins the chapter it is
 * placed in; a new mechanic starts a new chapter.
 */
export const CHAPTERS: readonly ChapterDefinition[] = [
  { name: "Basics", firstLevel: "first-light" },
  { name: "Flip tricks", firstLevel: "double-take" },
  { name: "Breakable walls", firstLevel: "breakthrough" },
  { name: "Your mirror", firstLevel: "your-move" },
  { name: "Reflectors", firstLevel: "return-trip" },
  { name: "Glass mirrors", firstLevel: "glass-house" },
  { name: "Fixed mirrors", firstLevel: "bolted-down" },
  { name: "Portals", firstLevel: "other-side" },
  { name: "One-way gates", firstLevel: "one-way" },
  { name: "Prism", firstLevel: "long-game", secret: true },
];

/** A chapter's levels: indices `start` up to, not including, `end`. */
export interface ChapterRange {
  name: string;
  start: number;
  end: number;
  secret?: boolean;
}

/**
 * Where each chapter's levels are in `levels`. Throws if a chapter's first
 * level is missing, the first chapter doesn't start at the first level,
 * the chapters are out of order, or a secret chapter is followed by one
 * that isn't.
 */
export function chapterRanges(
  levels: readonly Pick<LevelDefinition, "id">[],
  chapters: readonly ChapterDefinition[],
): ChapterRange[] {
  const starts = chapters.map(({ firstLevel }) => {
    const index = levels.findIndex((level) => level.id === firstLevel);
    if (index < 0) {
      throw new Error(`No level "${firstLevel}" to start a chapter`);
    }
    return index;
  });
  if (starts[0] !== 0) {
    throw new Error("The first chapter must start at the first level");
  }
  starts.forEach((start, i) => {
    if (i > 0 && start <= starts[i - 1]) {
      throw new Error(`Chapter "${chapters[i].name}" is out of order`);
    }
  });
  chapters.forEach(({ name, secret }, i) => {
    if (i > 0 && chapters[i - 1].secret && !secret) {
      throw new Error(`Chapter "${name}" comes after a secret chapter`);
    }
  });
  return chapters.map(({ name, secret }, i) => ({
    name,
    start: starts[i],
    end: starts[i + 1] ?? levels.length,
    ...(secret ? { secret } : {}),
  }));
}

/** Whether each level, in order, is in a secret chapter. */
export function secretLevels(chapters: readonly ChapterRange[]): boolean[] {
  return chapters.flatMap(({ start, end, secret = false }) =>
    Array.from({ length: end - start }, () => secret),
  );
}
