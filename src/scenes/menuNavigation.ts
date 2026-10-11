// Arrow-key movement between menu items laid out on the screen (the title
// screen's buttons and level tiles). Pure, so it can be tested.

export interface MenuPoint {
  x: number;
  y: number;
}

export type MenuDirection = "up" | "down" | "left" | "right";

/** Centres this close in height (pixels) are in the same row. */
const SAME_ROW = 2;

const STEPS: Record<MenuDirection, MenuPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * The item to move to from item `from` in `direction`: of the enabled
 * items lying that way, the nearest, counting distance sideways three
 * times as much as distance ahead (so down from a tile goes to the tile
 * below rather than one diagonally nearer). Left and right only reach
 * items in the same row (centres at the same height); with nothing
 * that way they step to the previous or next item in list order if it is
 * enabled, so they run on from the end of one row of tiles to the next
 * (but not past a locked level). Returns `from` if there is nowhere to go.
 */
export function nextMenuItem(
  centers: readonly MenuPoint[],
  enabled: readonly boolean[],
  from: number,
  direction: MenuDirection,
): number {
  const step = STEPS[direction];
  const origin = centers[from];
  let best = from;
  let bestScore = Infinity;
  centers.forEach((center, index) => {
    if (index === from || !enabled[index]) {
      return;
    }
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;
    const ahead = dx * step.x + dy * step.y;
    if (ahead <= 1) {
      return;
    }
    const sideways = Math.abs(dx * step.y + dy * step.x);
    // Left and right stay in a row; up and down may go to a narrower one.
    if (step.x !== 0 && sideways > SAME_ROW) {
      return;
    }
    const score = ahead + 3 * sideways;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  const neighbour = from + step.x;
  if (best === from && step.x !== 0 && enabled[neighbour]) {
    return neighbour;
  }
  return best;
}
