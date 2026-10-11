import { describe, expect, it } from "vitest";
import { nextMenuItem } from "./menuNavigation";

describe("nextMenuItem", () => {
  // A button on top (0), a row of three tiles (1-3), a row of two (4-5).
  const centers = [
    { x: 0, y: 0 },
    { x: -60, y: 100 },
    { x: 0, y: 100 },
    { x: 60, y: 100 },
    { x: -60, y: 200 },
    { x: 0, y: 200 },
  ];
  const all = centers.map(() => true);

  it("moves to the nearest item that way, preferring straight lines", () => {
    expect(nextMenuItem(centers, all, 0, "down")).toBe(2);
    expect(nextMenuItem(centers, all, 3, "down")).toBe(5);
    expect(nextMenuItem(centers, all, 5, "up")).toBe(2);
    expect(nextMenuItem(centers, all, 2, "left")).toBe(1);
  });

  it("runs left and right on into the neighbouring row", () => {
    expect(nextMenuItem(centers, all, 3, "right")).toBe(4);
    expect(nextMenuItem(centers, all, 4, "left")).toBe(3);
  });

  it("never moves sideways into another row", () => {
    // Right from the last tile (4) of a short row under a longer one.
    const rows = [
      { x: -60, y: 0 },
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: -60, y: 100 },
    ];
    expect(nextMenuItem(rows, [true, true, true, true], 3, "right")).toBe(3);
  });

  it("skips disabled items and stays put with nowhere to go", () => {
    const some = [true, true, false, true, true, true];
    expect(nextMenuItem(centers, some, 1, "right")).toBe(3);
    // Not on past a disabled item in list order.
    const last = [true, true, true, true, false, true];
    expect(nextMenuItem(centers, last, 3, "right")).toBe(3);
    expect(nextMenuItem(centers, all, 0, "up")).toBe(0);
    expect(nextMenuItem(centers, all, 5, "right")).toBe(5);
  });
});
