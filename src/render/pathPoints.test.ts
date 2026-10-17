import { describe, expect, it } from "vitest";
import { fire } from "../game/simulate";
import { parseLevel } from "../levels/parse";
import { pathPoints, splitAtJumps } from "./pathPoints";

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
      {
        x: 1,
        y: 0,
        bounce: true,
        bounceKind: "mirror",
        becomes: "mirrorSlash",
      },
      { x: 1, y: 1, bounce: false },
    ]);
    expect(lastPoint(". . G\n. . .", 1)).toEqual({
      x: 3,
      y: 1,
      bounce: false,
    });
  });

  it("turns back at a reflector's near side", () => {
    expect(points(". @ G", 0)).toEqual([
      { x: -1, y: 0, bounce: false },
      { x: 0, y: 0, bounce: false },
      { x: 0.7, y: 0, bounce: true, bounceKind: "reflector" },
      { x: 0, y: 0, bounce: false },
      { x: -1, y: 0, bounce: false },
    ]);
  });

  it("jumps from a portal to its partner, marking the jump", () => {
    expect(points(". O #\nO . G", 0)).toEqual([
      { x: -1, y: 0, bounce: false },
      { x: 0, y: 0, bounce: false },
      { x: 1, y: 0, bounce: true, bounceKind: "portal" },
      { x: 0, y: 1, bounce: false, jump: true },
      { x: 1, y: 1, bounce: false },
      { x: 2, y: 1, bounce: false },
    ]);
  });

  it("marks a glass mirror's bounce, where it shatters", () => {
    expect(points(". N\n. G", 0)[2]).toEqual({
      x: 1,
      y: 0,
      bounce: true,
      bounceKind: "glass",
      becomes: "empty",
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

  it("marks a gate the pellet passes, and stops at the edge of one it doesn't", () => {
    expect(points(". > G", 0)[2]).toEqual({
      x: 1,
      y: 0,
      bounce: false,
      passesGate: true,
    });
    expect(lastPoint(". < G", 0)).toEqual({ x: 0.5, y: 0, bounce: false });
  });
});

describe("splitAtJumps", () => {
  it("starts a new run at each jump", () => {
    const jump = (n: number) => n < 0;
    expect(splitAtJumps([1, 2, -3, 4, -5], jump)).toEqual([
      [1, 2],
      [-3, 4],
      [-5],
    ]);
    expect(splitAtJumps([-1, 2], jump)).toEqual([[-1, 2]]);
    expect(splitAtJumps([], jump)).toEqual([]);
  });
});
