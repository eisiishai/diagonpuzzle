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
    id: "down-and-around",
    name: "Down and around",
    minShots: 2,
    bonusShots: 3,
    music: "glassGarden",
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
];
