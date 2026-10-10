import { describe, expect, it } from "vitest";
import { easeInOutCubic, easeOutBack, easeOutCubic } from "./easing";

describe("easing", () => {
  it("runs from 0 to 1 and clamps outside that", () => {
    for (const ease of [easeOutCubic, easeInOutCubic, easeOutBack]) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
      expect(ease(-1)).toBeCloseTo(0);
      expect(ease(2)).toBeCloseTo(1);
    }
  });

  it("overshoots with easeOutBack", () => {
    expect(easeOutBack(0.7)).toBeGreaterThan(1);
  });
});
