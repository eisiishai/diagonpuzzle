// The lit part of a multi-hit goal's core: the crystal fills from the
// bottom, a part per hit. See docs/DESIGN.md, Shapes.

/**
 * The polygon (flat x, y list) of a diamond of radius `r` centred on (0, 0),
 * filled from its bottom corner up to `fraction` of its height. Empty when
 * nothing is filled; the whole diamond when full. Corners never repeat.
 */
export function diamondFill(r: number, fraction: number): number[] {
  if (fraction <= 0) {
    return [];
  }
  if (fraction >= 1) {
    return [0, -r, r, 0, 0, r, -r, 0];
  }
  // The fill line's height (y grows downwards) and half width there.
  const level = r - 2 * r * fraction;
  const half = r - Math.abs(level);
  if (level >= 0) {
    return [-half, level, half, level, 0, r];
  }
  return [-half, level, half, level, r, 0, 0, r, -r, 0];
}
