import type { CellType, Direction } from "./types";

/** What happens to a pellet that enters a cell. */
export type CellEffect =
  | { kind: "pass"; direction: Direction }
  | { kind: "stop"; reason: "blocked" | "goal" };

const BACKSLASH_TURNS: Record<Direction, Direction> = {
  right: "down",
  down: "right",
  left: "up",
  up: "left",
};

const SLASH_TURNS: Record<Direction, Direction> = {
  right: "up",
  up: "right",
  left: "down",
  down: "left",
};

/**
 * Behavior of each cell type, given the direction the pellet is moving when
 * it enters the cell. New block types are added here.
 */
export const CELL_BEHAVIORS: Record<
  CellType,
  (direction: Direction) => CellEffect
> = {
  empty: (direction) => ({ kind: "pass", direction }),
  mirrorBackslash: (direction) => ({
    kind: "pass",
    direction: BACKSLASH_TURNS[direction],
  }),
  mirrorSlash: (direction) => ({
    kind: "pass",
    direction: SLASH_TURNS[direction],
  }),
  wall: () => ({ kind: "stop", reason: "blocked" }),
  goal: () => ({ kind: "stop", reason: "goal" }),
};
