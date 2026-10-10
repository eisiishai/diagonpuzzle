export interface LevelDefinition {
  name: string;
  /** Text grid, format in docs/DESIGN.md. */
  grid: string;
}

// String.raw keeps "\" literal; in a plain template string "\ " is just a space.
export const LEVELS: readonly LevelDefinition[] = [
  {
    name: "First light",
    grid: String.raw`
      . . . \ . .
      # . / . . G
      . . . . # .
      . . / . . .
      . . . / . .
    `,
  },
  {
    name: "Up and over",
    grid: String.raw`
      . . \ . . . .
      . . . / . . G
      . . . . . # .
      . \ . . . . .
      . . . / . . .
      . . . . \ . .
    `,
  },
  {
    name: "Staircase",
    grid: String.raw`
      . . \ . . . . .
      . . . . # . . .
      . . \ . . \ . .
      . . . . . . / G
      . . . . . \ / .
      . / . . . . . .
    `,
  },
  {
    name: "Long way round",
    grid: String.raw`
      . . . / . . \ . .
      . \ . . . . . . .
      . . . . . # . . .
      . . . . . / . . .
      . \ . / . . . # .
      . . . . . . \ . G
      . . / . . . . . .
    `,
  },
];
