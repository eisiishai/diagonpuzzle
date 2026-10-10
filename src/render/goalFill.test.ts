import { describe, expect, it } from "vitest";
import { diamondFill } from "./goalFill";

describe("diamondFill", () => {
  it("is empty with no hits and the whole diamond when full", () => {
    expect(diamondFill(10, 0)).toEqual([]);
    expect(diamondFill(10, 1)).toEqual([0, -10, 10, 0, 0, 10, -10, 0]);
  });

  it("fills a triangle at the bottom up to the middle", () => {
    expect(diamondFill(10, 0.25)).toEqual([-5, 5, 5, 5, 0, 10]);
    expect(diamondFill(10, 0.5)).toEqual([-10, 0, 10, 0, 0, 10]);
  });

  it("includes the side corners once past the middle", () => {
    const points = diamondFill(10, 0.75);
    expect(points).toEqual([-5, -5, 5, -5, 10, 0, 0, 10, -10, 0]);
  });

  it("never repeats a corner", () => {
    for (let i = 1; i < 20; i++) {
      const points = diamondFill(10, i / 20);
      const pairs = new Set<string>();
      for (let j = 0; j < points.length; j += 2) {
        pairs.add(`${points[j]},${points[j + 1]}`);
      }
      expect(pairs.size).toBe(points.length / 2);
    }
  });
});
