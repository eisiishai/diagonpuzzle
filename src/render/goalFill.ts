// The lit part of a multi-hit goal: the crystal's facets light up from the
// bottom, a part per hit. See docs/DESIGN.md, Shapes.

/**
 * The part of the polygon `points` (flat x, y list) below height `level`
 * (y grows downwards), as a flat list: empty when none of it is below,
 * the whole polygon when all of it is. Corners never repeat, so it can be
 * drawn safely on every GPU (see polyline.ts).
 */
export function polygonBelow(
  points: readonly number[],
  level: number,
): number[] {
  const result: number[] = [];
  const push = (x: number, y: number) => {
    const n = result.length;
    const repeats =
      n >= 2 &&
      Math.abs(result[n - 2] - x) < 1e-9 &&
      Math.abs(result[n - 1] - y) < 1e-9;
    if (!repeats) {
      result.push(x, y);
    }
  };
  const count = points.length / 2;
  for (let i = 0; i < count; i++) {
    const ax = points[2 * i];
    const ay = points[2 * i + 1];
    const bx = points[(2 * i + 2) % points.length];
    const by = points[(2 * i + 3) % points.length];
    const aIn = ay >= level;
    const bIn = by >= level;
    if (aIn) {
      push(ax, ay);
    }
    if (aIn !== bIn) {
      const t = (level - ay) / (by - ay);
      push(ax + (bx - ax) * t, level);
    }
  }
  // The last corner may repeat the first.
  if (
    result.length >= 4 &&
    Math.abs(result[0] - result[result.length - 2]) < 1e-9 &&
    Math.abs(result[1] - result[result.length - 1]) < 1e-9
  ) {
    result.length -= 2;
  }
  return result.length >= 6 ? result : [];
}

/**
 * The level (y) up to which a goal of radius `r` centred on (0, 0) is lit
 * after `fraction` of its hits: its bottom corner at none, its top at all.
 */
export function fillLevel(r: number, fraction: number): number {
  return r - 2 * r * Math.max(0, Math.min(1, fraction));
}
