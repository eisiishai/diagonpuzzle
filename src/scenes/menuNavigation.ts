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
 * items lying that way, the nearest. Up and down go to the nearest row
 * that way (centres at about the same height), and in it to the item
 * nearest sideways, so they never jump over a short row whose tiles are
 * off to one side. Left and right only reach items in the same row; with
 * nothing that way they step to the previous or next item in list order
 * if it is enabled, so they run on from the end of one row of tiles to
 * the next (but not past a locked level). Returns `from` if there is
 * nowhere to go.
 */
export function nextMenuItem(
  centers: readonly MenuPoint[],
  enabled: readonly boolean[],
  from: number,
  direction: MenuDirection,
): number {
  const step = STEPS[direction];
  const origin = centers[from];
  const candidates: { index: number; ahead: number; sideways: number }[] = [];
  centers.forEach((center, index) => {
    if (index === from || !enabled[index]) {
      return;
    }
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;
    const ahead = dx * step.x + dy * step.y;
    const sideways = Math.abs(dx * step.y + dy * step.x);
    // Left and right stay in a row.
    if (ahead > 1 && (step.x === 0 || sideways <= SAME_ROW)) {
      candidates.push({ index, ahead, sideways });
    }
  });
  if (candidates.length === 0) {
    const neighbour = from + step.x;
    return step.x !== 0 && enabled[neighbour] ? neighbour : from;
  }
  const nearestRow = Math.min(...candidates.map(({ ahead }) => ahead));
  let best = candidates[0];
  for (const candidate of candidates) {
    const inRow = candidate.ahead <= nearestRow + SAME_ROW;
    const bestInRow = best.ahead <= nearestRow + SAME_ROW;
    if (
      inRow &&
      (!bestInRow ||
        candidate.sideways < best.sideways ||
        (candidate.sideways === best.sideways && candidate.ahead < best.ahead))
    ) {
      best = candidate;
    }
  }
  return best.index;
}
