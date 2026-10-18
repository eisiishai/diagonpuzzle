import { describe, expect, it } from "vitest";
import { fillLevel, polygonBelow } from "./goalFill";

const DIAMOND = [0, -10, 10, 0, 0, 10, -10, 0];

describe("fillLevel", () => {
  it("runs from the bottom corner to the top one", () => {
    expect(fillLevel(10, 0)).toBe(10);
    expect(fillLevel(10, 0.5)).toBe(0);
    expect(fillLevel(10, 1)).toBe(-10);
    expect(fillLevel(10, 2)).toBe(-10);
  });
});

describe("polygonBelow", () => {
  it("is empty above the polygon and the whole polygon below it", () => {
    expect(polygonBelow(DIAMOND, 10)).toEqual([]);
    expect(polygonBelow(DIAMOND, 20)).toEqual([]);
    expect(polygonBelow(DIAMOND, -10)).toEqual(DIAMOND);
  });

  it("cuts a diamond at a level", () => {
    expect(polygonBelow(DIAMOND, 5)).toEqual([5, 5, 0, 10, -5, 5]);
    expect(polygonBelow(DIAMOND, -5)).toEqual([
      5, -5, 10, 0, 0, 10, -10, 0, -5, -5,
    ]);
  });

  it("cuts a facet triangle, keeping its lower part", () => {
    // The lower right facet: centre, right corner, bottom corner.
    expect(polygonBelow([0, 0, 10, 0, 0, 10], 5)).toEqual([5, 5, 0, 10, 0, 5]);
  });

  it("never repeats a corner", () => {
    for (let i = 0; i <= 20; i++) {
      const points = polygonBelow(DIAMOND, fillLevel(10, i / 20));
      const pairs = new Set<string>();
      for (let j = 0; j < points.length; j += 2) {
        pairs.add(`${points[j]},${points[j + 1]}`);
      }
      expect(pairs.size).toBe(points.length / 2);
    }
  });
});
