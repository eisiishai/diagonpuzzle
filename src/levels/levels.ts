export interface LevelDefinition {
  /** Stable identifier used for saved progress; never change it once released. */
  id: string;
  name: string;
  /** Text grid, format in docs/DESIGN.md. */
  grid: string;
}

// String.raw keeps "\" literal; in a plain template string "\ " is just a space.
export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
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
    id: "up-and-over",
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
    id: "staircase",
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
    id: "long-way-round",
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
