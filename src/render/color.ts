// Small colour helpers for colours given as 0xRRGGBB numbers.

/** The colour `amount` (0–1) of the way from `from` to `to`. */
export function mixColor(from: number, to: number, amount: number): number {
  const channel = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/**
 * A colour turning slowly through `colors` in a loop, each blending into
 * the next, once round every `periodMs`; `colors[0]` at time 0.
 */
export function colorCycle(
  colors: readonly number[],
  timeMs: number,
  periodMs: number,
): number {
  const position = ((((timeMs / periodMs) % 1) + 1) % 1) * colors.length;
  const index = Math.floor(position);
  return mixColor(
    colors[index],
    colors[(index + 1) % colors.length],
    position - index,
  );
}
