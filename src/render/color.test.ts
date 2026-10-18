import { describe, expect, it } from "vitest";
import { colorCycle, mixColor } from "./color";

describe("mixColor", () => {
  it("gives the ends at 0 and 1", () => {
    expect(mixColor(0x102030, 0xffffff, 0)).toBe(0x102030);
    expect(mixColor(0x102030, 0xffffff, 1)).toBe(0xffffff);
  });

  it("mixes each channel on its own", () => {
    expect(mixColor(0x000000, 0x204060, 0.5)).toBe(0x102030);
    expect(mixColor(0xff0000, 0x0000ff, 0.25)).toBe(0xbf0040);
  });
});

describe("colorCycle", () => {
  const colors = [0x000000, 0x00c800, 0xc80000];

  it("starts on the first colour and blends into the next", () => {
    expect(colorCycle(colors, 0, 3000)).toBe(0x000000);
    expect(colorCycle(colors, 500, 3000)).toBe(0x006400);
    expect(colorCycle(colors, 1000, 3000)).toBe(0x00c800);
  });

  it("blends the last colour back into the first and repeats", () => {
    expect(colorCycle(colors, 2500, 3000)).toBe(0x640000);
    expect(colorCycle(colors, 3000, 3000)).toBe(0x000000);
  });
});
