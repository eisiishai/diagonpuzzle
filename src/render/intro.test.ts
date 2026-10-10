import { describe, expect, it } from "vitest";
import { easeInOutCubic, easeOutBack, easeOutCubic } from "./easing";
import {
  introCell,
  introGoal,
  introGoalStartMs,
  introLauncher,
  introLengthMs,
  introPanelAlpha,
} from "./intro";

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

describe("level intro", () => {
  it("fades the panel in first", () => {
    expect(introPanelAlpha(0)).toBe(0);
    expect(introPanelAlpha(1000)).toBe(1);
  });

  it("slides lower emitters in later", () => {
    const top = introLauncher(100, 0);
    const lower = introLauncher(100, 3);
    expect(top.offset).toBeGreaterThan(lower.offset);
    const settled = introLauncher(2000, 3);
    expect(settled.alpha).toBe(1);
    expect(settled.offset).toBeCloseTo(0);
  });

  it("pops cells in column by column", () => {
    expect(introCell(300, 0).alpha).toBeGreaterThan(0);
    expect(introCell(300, 4).alpha).toBe(0);
    expect(introCell(5000, 4)).toEqual({ alpha: 1, scale: 1 });
  });

  it("ignites the goal after the last column has started", () => {
    const width = 7;
    const start = introGoalStartMs(width);
    expect(introCell(start, width - 1).alpha).toBeGreaterThan(0);
    expect(introGoal(start - 1, width).alpha).toBe(0);
    expect(introGoal(introLengthMs(width), width)).toEqual({
      alpha: 1,
      scale: 1,
    });
  });
});
