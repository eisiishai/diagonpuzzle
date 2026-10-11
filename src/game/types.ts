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
  | "empty"
  | "mirrorBackslash"
  | "mirrorSlash"
  | "wall"
  | "breakable"
  | "reflector"
  | "glassBackslash"
  | "glassSlash"
  | "goal"
  | "bonus";

/**
 * What turned the pellet at a bounce: a mirror (which flips), a reflector
 * (which sends it back) or a glass mirror (which shatters).
 */
export type BounceKind = "mirror" | "reflector" | "glass";

/** The two mirror cells, e.g. the kind of mirror a player may place. */
export type MirrorType = "mirrorBackslash" | "mirrorSlash";

export interface Board {
  readonly width: number;
  readonly height: number;
  /** Indexed as cells[y][x]. */
  readonly cells: readonly (readonly CellType[])[];
}
