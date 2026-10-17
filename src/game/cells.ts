import type { BounceKind, CellType, Direction, MirrorType } from "./types";

/**
 * What happens to a pellet that enters a cell. `becomes` is set when the hit
 * changes the cell itself; the change takes effect immediately, so a pellet
 * returning to the cell later in the same shot meets the new cell. A
 * `teleport` sends the pellet on from the board's other portal, moving the
 * same way.
 */
export type CellEffect =
  | { kind: "pass"; direction: Direction; becomes?: CellType }
  | { kind: "stop"; reason: "blocked" | "goal" | "bonus"; becomes?: CellType }
  | { kind: "teleport" };

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

function gate(direction: Direction, through: Direction): CellEffect {
  return direction === through
    ? { kind: "pass", direction }
    : { kind: "stop", reason: "blocked" };
}

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
  // Fixed mirrors turn the pellet like mirrors, and never flip.
  fixedBackslash: (direction) => ({
    kind: "pass",
    direction: BACKSLASH_TURNS[direction],
  }),
  fixedSlash: (direction) => ({
    kind: "pass",
    direction: SLASH_TURNS[direction],
  }),
  wall: () => ({ kind: "stop", reason: "blocked" }),
  // A reflector sends the pellet straight back the way it came; it never
  // changes, but the mirrors behind it may have flipped on the way in.
  reflector: (direction) => ({ kind: "pass", direction: REVERSED[direction] }),
  // A portal sends the pellet on from its partner, the board's other
  // portal, moving the same way; it never changes.
  portal: () => ({ kind: "teleport" }),
  // A one-way gate lets the pellet through moving the way its arrow
  // points, and stops it like a wall from any other side.
  gateRight: (direction) => gate(direction, "right"),
  gateLeft: (direction) => gate(direction, "left"),
  gateUp: (direction) => gate(direction, "up"),
  gateDown: (direction) => gate(direction, "down"),
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

/** The fixed mirrors, which turn the pellet and never flip. */
export const FIXED_MIRRORS: readonly CellType[] = [
  "fixedBackslash",
  "fixedSlash",
];

/** The one-way gates, by the direction they let the pellet through. */
export const GATES: Readonly<Record<Direction, CellType>> = {
  right: "gateRight",
  left: "gateLeft",
  up: "gateUp",
  down: "gateDown",
};

/** The one-way gates, which let the pellet through one way only. */
export const GATE_CELLS: readonly CellType[] = Object.values(GATES);

export function isMirror(cell: CellType): cell is MirrorType {
  return MIRRORS.includes(cell as MirrorType);
}

export function isGlassMirror(cell: CellType): boolean {
  return GLASS_MIRRORS.includes(cell);
}

/**
 * What turns the pellet in each cell type that can (for its sound and the
 * beam's drawing), or sends it elsewhere (a portal); null for the others.
 * Every cell type needs an entry.
 */
const BOUNCE_KINDS: Record<CellType, BounceKind | null> = {
  empty: null,
  mirrorBackslash: "mirror",
  mirrorSlash: "mirror",
  glassBackslash: "glass",
  glassSlash: "glass",
  fixedBackslash: "fixed",
  fixedSlash: "fixed",
  reflector: "reflector",
  portal: "portal",
  gateRight: null,
  gateLeft: null,
  gateUp: null,
  gateDown: null,
  wall: null,
  breakable: null,
  goal: null,
  bonus: null,
};

/**
 * What kind of bounce a pellet turned (or sent through a portal) by `cell`
 * makes; null if it can't turn it.
 */
export function bounceKind(cell: CellType): BounceKind | null {
  return BOUNCE_KINDS[cell];
}
