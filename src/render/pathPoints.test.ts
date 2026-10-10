import { describe, expect, it } from "vitest";
import { fire } from "../game/simulate";
import { parseLevel } from "../levels/parse";
import { pathPoints } from "./pathPoints";

function points(grid: string, row: number) {
  return pathPoints(fire(parseLevel(grid), row));
}

function lastPoint(grid: string, row: number) {
  const all = points(grid, row);
  return all[all.length - 1];
}

describe("pathPoints", () => {
  it("starts at the launcher and ends in the goal's centre", () => {
    expect(points(". G", 0)).toEqual([
      { x: -1, y: 0, bounce: false },
      { x: 0, y: 0, bounce: false },
      { x: 1, y: 0, bounce: false },
    ]);
  });

  it("marks mirrors as bounces and continues one cell past an exit", () => {
    const grid = String.raw`
      . \
      . G
    `;
    expect(points(grid, 0)).toEqual([
      { x: -1, y: 0, bounce: false },
      { x: 0, y: 0, bounce: false },
      { x: 1, y: 0, bounce: true, becomes: "mirrorSlash" },
      { x: 1, y: 1, bounce: false },
    ]);
    expect(lastPoint(". . G\n. . .", 1)).toEqual({
      x: 3,
      y: 1,
      bounce: false,
    });
  });

  it("stops at the near edge of a wall", () => {
    expect(lastPoint(". # G", 0)).toEqual({ x: 0.5, y: 0, bounce: false });
  });

  it("ends at a breakable wall's edge, naming the cell that breaks", () => {
    expect(lastPoint(". % G", 0)).toEqual({
      x: 0.5,
      y: 0,
      bounce: false,
      becomes: "empty",
      changedCell: { x: 1, y: 0 },
    });
  });
});
