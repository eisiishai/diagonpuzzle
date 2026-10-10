import type { MusicTrackId } from "../audio/music";

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
    music: "pulse",
    grid: String.raw`
      . . . \ . .
      # . / . . G
      . . . . # .
      . . / \ . .
      . . . / . .
    `,
  },
  {
    id: "up-and-over",
    name: "Up and over",
    minShots: 1,
    music: "pulse",
    grid: String.raw`
      . . \ . . . \
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
    music: "pulse",
    grid: String.raw`
      . . . . . \ .
      / . / . . . G
      . # . . . . .
      \ . / . . . .
      . . . . . . .
    `,
  },
  {
    id: "set-the-stage",
    name: "Set the stage",
    minShots: 2,
    music: "pulse",
    grid: String.raw`
      / \ . . . . . .
      . . . . \ . # .
      / \ . / . . . .
      . . . / . . . G
      . . . . . . . .
      . . . # . . . .
    `,
  },
  {
    id: "down-and-around",
    name: "Down and around",
    minShots: 2,
    music: "glassGarden",
    grid: String.raw`
      # . . . . . . .
      / # . . . . / G
      . . . . . / . .
      . . . . / . . .
      . . \ . . . . .
      / . . . . . / .
    `,
  },
  {
    id: "third-time-lucky",
    name: "Third time lucky",
    minShots: 3,
    music: "glassGarden",
    grid: String.raw`
      . / . . . . / .
      \ . . # . . . .
      . . . . . . . .
      . . \ . . . . .
      . . . . . . \ G
      \ / . . . . . .
      # . . . . / . .
    `,
  },
  {
    id: "back-and-forth",
    name: "Back and forth",
    minShots: 3,
    music: "glassGarden",
    grid: String.raw`
      # . # . . . . . .
      . . . . . . . . .
      \ # . . . / \ / .
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
    music: "glassGarden",
    grid: String.raw`
      . \ . . \ . . . .
      . . . . . . . / G
      . . . \ . / . . .
      . . . . . \ / . .
      . . . \ . . \ / .
      . . . . # . / . .
      . . . . . # . . .
      . # . . . . . . .
    `,
  },
  {
    id: "double-take",
    name: "Double take",
    minShots: 2,
    goalHits: 2,
    music: "nightLab",
    grid: String.raw`
      . . \ . .
      . . / . G
      . . / # .
      . . . . .
    `,
  },
  {
    id: "encore",
    name: "Encore",
    minShots: 3,
    goalHits: 2,
    music: "nightLab",
    grid: String.raw`
      . . . . \ .
      . . . . / G
      . . . . \ .
      \ . . . # .
    `,
  },
];
