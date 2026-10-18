import { describe, expect, it } from "vitest";
import {
  arcPoints,
  distanceToPath,
  distinctPoints,
  pathLength,
  pathUpTo,
  pointAtDistance,
  pointsAlong,
} from "./polyline";

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

describe("pointsAlong", () => {
  it("places points at even spacing around corners, with their direction", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const points = pointsAlong(path, 5, 10);
    expect(points.map((p) => [p.x, p.y])).toEqual([
      [5, 0],
      [10, 5],
    ]);
    expect(points[0].angle).toBeCloseTo(0);
    expect(points[1].angle).toBeCloseTo(Math.PI / 2);
  });

  it("skips repeated points", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ];
    expect(pointsAlong(path, 0, 2)).toHaveLength(3);
  });
});

describe("distanceToPath", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("measures straight across to the nearest segment", () => {
    expect(distanceToPath(5, 3, path)).toBe(3);
    expect(distanceToPath(14, 6, path)).toBe(4);
  });

  it("measures to the nearest end beyond a segment", () => {
    expect(distanceToPath(-3, -4, path)).toBe(5);
  });

  it("handles a single point and repeated points", () => {
    expect(distanceToPath(3, 4, [{ x: 0, y: 0 }])).toBe(5);
    expect(
      distanceToPath(3, 4, [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]),
    ).toBe(5);
  });
});

describe("pathLength and pointAtDistance", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 50, y: 50, jump: true },
    { x: 50, y: 60 },
  ];

  it("measures the path, a jump taking no length", () => {
    expect(pathLength(path)).toBe(20);
  });

  it("finds points along the path, past the jump at once", () => {
    expect(pointAtDistance(path, 4)).toEqual({ x: 4, y: 0 });
    expect(pointAtDistance(path, 10)).toEqual({ x: 10, y: 0 });
    expect(pointAtDistance(path, 15)).toEqual({ x: 50, y: 55 });
  });

  it("stops at the ends", () => {
    expect(pointAtDistance(path, -5)).toEqual({ x: 0, y: 0 });
    expect(pointAtDistance(path, 99)).toEqual({ x: 50, y: 60 });
  });
});

describe("pathUpTo", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it("cuts the path off part of the way along", () => {
    expect(pathUpTo(path, 4)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]);
    expect(pathUpTo(path, 15)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
    ]);
  });

  it("never repeats a point, at a corner or at the start", () => {
    expect(pathUpTo(path, 10)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(pathUpTo(path, 0)).toEqual([{ x: 0, y: 0 }]);
  });

  it("gives the whole path beyond its end", () => {
    expect(pathUpTo(path, 50)).toEqual(path);
  });
});
