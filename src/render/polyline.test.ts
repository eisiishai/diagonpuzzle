import { describe, expect, it } from "vitest";
import { arcPoints, distinctPoints } from "./polyline";

describe("distinctPoints", () => {
  it("removes points that repeat the previous one", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0.001 },
      { x: 0, y: 0 },
    ];
    expect(distinctPoints(points)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 0 },
    ]);
  });
});

describe("arcPoints", () => {
  it("gives segments + 1 distinct points from start to end", () => {
    const points = arcPoints(0, 0, 10, 0, Math.PI / 2, 4);
    expect(points).toHaveLength(5);
    expect(points[0].x).toBeCloseTo(10);
    expect(points[0].y).toBeCloseTo(0);
    expect(points[4].x).toBeCloseTo(0);
    expect(points[4].y).toBeCloseTo(10);
    expect(distinctPoints(points)).toHaveLength(5);
  });
});
