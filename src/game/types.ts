export type Direction = "up" | "down" | "left" | "right";

export interface Position {
  /** Column, 0 = leftmost. */
  x: number;
  /** Row, 0 = top. */
  y: number;
}

export const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export type CellType =
  "empty" | "mirrorBackslash" | "mirrorSlash" | "wall" | "goal" | "bonus";

export interface Board {
  readonly width: number;
  readonly height: number;
  /** Indexed as cells[y][x]. */
  readonly cells: readonly (readonly CellType[])[];
}
