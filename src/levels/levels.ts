export interface LevelDefinition {
  /** Stable identifier used for saved progress; never change it once released. */
  id: string;
  name: string;
  /**
   * Fewest shots that solve the level, as designed. Tests check it with the
   * solver, so a level that is accidentally easier or harder fails.
   */
  minShots: number;
  /** Text grid, format in docs/DESIGN.md. */
  grid: string;
}

// String.raw keeps "\" literal; in a plain template string "\ " is just a space.
export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
    name: "First light",
    minShots: 1,
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
];
