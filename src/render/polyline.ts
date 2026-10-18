// Point lists for stroked lines, kept safe for every GPU.
//
// A stroked line with two identical points in a row has a zero-length
// segment, whose direction is undefined. Desktop GPUs quietly drop the
// resulting invalid vertices, but some phone GPUs draw them at (0, 0), as a
// stray line to the top-left corner of the screen. Graphics.arc() can also
// produce such a point where it joins the path. So: build curves from
// distinct points here, and remove repeats before stroking.

export interface Point {
  x: number;
  y: number;
}

/** `points` without any point that repeats the one before it. */
export function distinctPoints<T extends Point>(
  points: readonly T[],
  epsilon = 0.01,
): T[] {
  return points.filter(
    (p, i) =>
      i === 0 ||
      Math.abs(p.x - points[i - 1].x) > epsilon ||
      Math.abs(p.y - points[i - 1].y) > epsilon,
  );
}

/**
 * Points along a circular arc around (cx, cy), from angle `start` to `end`
 * (radians), in `segments` straight pieces: segments + 1 distinct points.
 */
export function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  segments: number,
): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = start + ((end - start) * i) / segments;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

/**
 * Points every `spacing` pixels along the path through `points`, starting
 * `start` pixels in, each with the direction of travel there (radians).
 */
export function pointsAlong(
  points: readonly Point[],
  start: number,
  spacing: number,
): (Point & { angle: number })[] {
  const result: (Point & { angle: number })[] = [];
  let next = start;
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) {
      continue;
    }
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    while (next <= travelled + length) {
      const t = (next - travelled) / length;
      result.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle,
      });
      next += spacing;
    }
    travelled += length;
  }
  return result;
}

/** Shortest distance in pixels from (x, y) to the path through `points`. */
export function distanceToPath(
  x: number,
  y: number,
  points: readonly Point[],
): number {
  if (points.length === 1) {
    return Math.hypot(x - points[0].x, y - points[0].y);
  }
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared),
          );
    best = Math.min(best, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
  }
  return best;
}

/**
 * Length in pixels of the path through `points`; a step into a point
 * marked `jump` (through a portal) takes no length.
 */
export function pathLength(
  points: readonly (Point & { jump?: boolean })[],
): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    if (!points[i].jump) {
      total += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y,
      );
    }
  }
  return total;
}

/**
 * The point `distance` pixels along the path through `points` (clamped to
 * its ends); a step into a point marked `jump` takes no length, so the
 * path is at that point at once.
 */
export function pointAtDistance(
  points: readonly (Point & { jump?: boolean })[],
  distance: number,
): Point {
  let left = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = b.jump ? 0 : Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= length && length > 0) {
      const t = left / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= length;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * The path through `points` cut off `distance` pixels along it: its first
 * point, every corner before that distance and the point there (no jumps).
 */
export function pathUpTo(points: readonly Point[], distance: number): Point[] {
  const result: Point[] = [{ x: points[0].x, y: points[0].y }];
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    if (travelled + length >= distance) {
      result.push(
        pointAtDistance(points.slice(i - 1, i + 1), distance - travelled),
      );
      return distinctPoints(result);
    }
    travelled += length;
    result.push({ x: points[i].x, y: points[i].y });
  }
  return distinctPoints(result);
}
