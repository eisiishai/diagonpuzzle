// Easing curves for animations: each maps progress t (0 → 1) to how far
// the animation has got. Progress outside 0–1 is clamped.

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Fast start, gentle stop. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3;
}

/** Gentle start and stop, fastest in the middle. */
export function easeInOutCubic(t: number): number {
  const p = clamp01(t);
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
}

/** Overshoots slightly past 1 before settling: a small pop. */
export function easeOutBack(t: number): number {
  const p = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}
