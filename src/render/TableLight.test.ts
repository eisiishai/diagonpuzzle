import { describe, expect, it } from "vitest";
import { holeGlow, motePosition, waveGlow } from "./TableLight";

describe("holeGlow", () => {
  it("is brightest on the beam and gone three quarters of a cell away", () => {
    expect(holeGlow(0, 40, 1)).toBeCloseTo(0.85);
    expect(holeGlow(15, 40, 1)).toBeCloseTo(0.425);
    expect(holeGlow(30, 40, 1)).toBe(0);
    expect(holeGlow(100, 40, 1)).toBe(0);
  });

  it("follows the beam's strength", () => {
    expect(holeGlow(0, 40, 0.4)).toBeCloseTo(0.34);
  });
});

describe("waveGlow", () => {
  it("lights the ring and fades either side of it", () => {
    expect(waveGlow(100, 100, 40)).toBe(1);
    expect(waveGlow(82, 100, 40)).toBeCloseTo(0.5);
    expect(waveGlow(118, 100, 40)).toBeCloseTo(0.5);
    expect(waveGlow(0, 100, 40)).toBe(0);
  });
});

describe("motePosition", () => {
  const area = { x: 10, y: 20, width: 100, height: 50 };
  const mote = { x: 50, y: 30, vx: 10, vy: -4, size: 1, brightness: 1 };

  it("drifts at its speed", () => {
    expect(motePosition(mote, 2, area)).toEqual({ x: 70, y: 22 });
  });

  it("wraps around inside the area", () => {
    expect(motePosition(mote, 7, area)).toEqual({ x: 20, y: 52 });
  });
});
