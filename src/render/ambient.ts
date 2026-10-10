// Small ambient animations: shared timing, and respect for the player's
// "reduce motion" setting. See docs/DESIGN.md, Light and motion.

/** Seconds per breath of pulsing pieces (goal crystal, selected emitter). */
export const PULSE_PERIOD_MS = 2400;

/**
 * A smooth breathing value between 0 and 1, repeating every `periodMs`;
 * 0 at time 0.
 */
export function pulse(timeMs: number, periodMs = PULSE_PERIOD_MS): number {
  return (1 - Math.cos((2 * Math.PI * timeMs) / periodMs)) / 2;
}

/**
 * How far a repeating pattern with the given `spacing` has drifted after
 * `timeMs` at `speed` pixels per second, wrapped to [0, spacing).
 */
export function drift(timeMs: number, speed: number, spacing: number): number {
  const distance = (speed * timeMs) / 1000;
  return ((distance % spacing) + spacing) % spacing;
}

const reducedMotionQuery =
  typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : undefined;

/** True when the player has asked their system to reduce motion. */
export function prefersReducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false;
}
