import { describe, expect, it } from "vitest";
import { drift, pulse } from "./ambient";

describe("pulse", () => {
  it("breathes from 0 up to 1 and back over one period", () => {
    expect(pulse(0, 1000)).toBeCloseTo(0);
    expect(pulse(250, 1000)).toBeCloseTo(0.5);
    expect(pulse(500, 1000)).toBeCloseTo(1);
    expect(pulse(1000, 1000)).toBeCloseTo(0);
  });
});

describe("drift", () => {
  it("moves at the given speed and wraps at the spacing", () => {
    expect(drift(1000, 10, 48)).toBeCloseTo(10);
    expect(drift(5000, 10, 48)).toBeCloseTo(2);
  });

  it("stays within [0, spacing) for any direction", () => {
    expect(drift(1000, -10, 48)).toBeCloseTo(38);
  });
});
