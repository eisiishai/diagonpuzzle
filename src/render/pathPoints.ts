import type { ShotResult } from "../game/simulate";
import { DIRECTION_DELTAS } from "../game/types";
import type { BounceKind, CellType } from "../game/types";

/**
 * Where a reflector sends the beam back: this far from its cell's centre, in
 * cells, at the ring drawn in cellGraphics.ts.
 */
export const REFLECTOR_RADIUS = 0.3;

export interface PathPoint {
  /** Board coordinates in cells; may be fractional or outside the board. */
  x: number;
  y: number;
  /** True if the pellet changes direction at this point. */
  bounce: boolean;
  /** What turned it, where it changes direction. */
  bounceKind?: BounceKind;
  /** Set if the cell at this point changes when hit (e.g. a mirror flips). */
  becomes?: CellType;
  /**
   * The board cell that `becomes` applies to, when this point is not its
   * centre (a breakable wall, hit at its near edge).
   */
  changedCell?: { x: number; y: number };
}

/**
 * The points the pellet travels through, in board cell coordinates: from the
 * launcher (x = -1), through the centre of each cell it enters, to where it
 * ends — one cell past the edge when it exits, the near edge of a wall when
 * it is blocked. Where it is sent straight back (a reflector), the point is
 * at the reflector's near side instead of its centre.
 */
export function pathPoints(result: ShotResult): PathPoint[] {
  const { path, outcome } = result;
  if (path.length === 0) {
    return [];
  }

  const points: PathPoint[] = [
    { x: -1, y: path[0].y, bounce: false },
    ...path.map((step) => {
      const delta = DIRECTION_DELTAS[step.directionIn];
      const back = DIRECTION_DELTAS[step.directionOut];
      const reversed = delta.x === -back.x && delta.y === -back.y;
      const offset = reversed ? REFLECTOR_RADIUS : 0;
      const bounce = step.directionIn !== step.directionOut;
      // A mirror flips when hit; a glass mirror becomes empty.
      const bounceKind: BounceKind = reversed
        ? "reflector"
        : step.becomes === "empty"
          ? "glass"
          : "mirror";
      return {
        x: step.x - delta.x * offset,
        y: step.y - delta.y * offset,
        bounce,
        ...(bounce && { bounceKind }),
        ...(step.becomes && { becomes: step.becomes }),
      };
    }),
  ];

  const last = path[path.length - 1];
  if (outcome === "exit") {
    const delta = DIRECTION_DELTAS[last.directionOut];
    points.push({ x: last.x + delta.x, y: last.y + delta.y, bounce: false });
  } else if (outcome === "blocked") {
    const delta = DIRECTION_DELTAS[last.directionIn];
    points[points.length - 1] = {
      x: last.x - delta.x / 2,
      y: last.y - delta.y / 2,
      bounce: false,
      ...(last.becomes && {
        becomes: last.becomes,
        changedCell: { x: last.x, y: last.y },
      }),
    };
  }
  return points;
}
