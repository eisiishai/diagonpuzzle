import type { BounceKind, CellType, Direction, MirrorType } from "./types";

/**
 * What happens to a pellet that enters a cell. `becomes` is set when the hit
 * changes the cell itself; the change takes effect immediately, so a pellet
 * returning to the cell later in the same shot meets the new cell.
 */
export type CellEffect =
  | { kind: "pass"; direction: Direction; becomes?: CellType }
  | { kind: "stop"; reason: "blocked" | "goal" | "bonus"; becomes?: CellType };

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

const REVERSED: Record<Direction, Direction> = {
  right: "left",
  left: "right",
  up: "down",
  down: "up",
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
  // Mirrors flip between "\" and "/" every time they are hit.
  mirrorBackslash: (direction) => ({
    kind: "pass",
    direction: BACKSLASH_TURNS[direction],
    becomes: "mirrorSlash",
  }),
  mirrorSlash: (direction) => ({
    kind: "pass",
    direction: SLASH_TURNS[direction],
    becomes: "mirrorBackslash",
  }),
  // Glass mirrors turn the pellet like mirrors, once: then they shatter.
  glassBackslash: (direction) => ({
    kind: "pass",
    direction: BACKSLASH_TURNS[direction],
    becomes: "empty",
  }),
  glassSlash: (direction) => ({
    kind: "pass",
    direction: SLASH_TURNS[direction],
    becomes: "empty",
  }),
  wall: () => ({ kind: "stop", reason: "blocked" }),
  // A reflector sends the pellet straight back the way it came; it never
  // changes, but the mirrors behind it may have flipped on the way in.
  reflector: (direction) => ({ kind: "pass", direction: REVERSED[direction] }),
  // A cracked wall stops the pellet and breaks: the next shot passes through.
  breakable: () => ({ kind: "stop", reason: "blocked", becomes: "empty" }),
  goal: () => ({ kind: "stop", reason: "goal" }),
  // An optional bonus target stops the pellet and is collected: it is gone
  // for the rest of the level.
  bonus: () => ({ kind: "stop", reason: "bonus", becomes: "empty" }),
};

/** The mirrors, which flip between "\\" and "/" when hit. */
export const MIRRORS: readonly MirrorType[] = [
  "mirrorBackslash",
  "mirrorSlash",
];

/** The glass mirrors, which turn the pellet once and then shatter. */
export const GLASS_MIRRORS: readonly CellType[] = [
  "glassBackslash",
  "glassSlash",
];

export function isMirror(cell: CellType): cell is MirrorType {
  return MIRRORS.includes(cell as MirrorType);
}

export function isGlassMirror(cell: CellType): boolean {
  return GLASS_MIRRORS.includes(cell);
}

/**
 * What turns the pellet in each cell type that can (for its sound and the
 * beam's drawing); null for the others. Every cell type needs an entry.
 */
const BOUNCE_KINDS: Record<CellType, BounceKind | null> = {
  empty: null,
  mirrorBackslash: "mirror",
  mirrorSlash: "mirror",
  glassBackslash: "glass",
  glassSlash: "glass",
  reflector: "reflector",
  wall: null,
  breakable: null,
  goal: null,
  bonus: null,
};

/** What kind of bounce a pellet turned by `cell` makes; null if it can't turn it. */
export function bounceKind(cell: CellType): BounceKind | null {
  return BOUNCE_KINDS[cell];
}
