import { describe, expect, it } from "vitest";
import { SCREEN_MARGIN, fitToScreen } from "./fitToScreen";

const content = { x: 0, y: 0, width: 600, height: 400 };

describe("fitToScreen", () => {
  it("centres content that fits, without scaling", () => {
    expect(fitToScreen(content, 1000, 800)).toEqual({
      scale: 1,
      x: 200,
      y: 200,
    });
  });

  it("never enlarges content on a big screen", () => {
    expect(fitToScreen(content, 4000, 3000).scale).toBe(1);
  });

  it("shrinks content to fit a narrow screen inside the margin", () => {
    const placement = fitToScreen(content, 400, 800);
    expect(placement.scale).toBeCloseTo((400 - 2 * SCREEN_MARGIN) / 600);
    expect(placement.x).toBe(SCREEN_MARGIN);
    expect(content.width * placement.scale).toBeCloseTo(
      400 - 2 * SCREEN_MARGIN,
    );
  });

  it("uses the tighter of width and height", () => {
    const placement = fitToScreen(content, 2000, 232);
    expect(placement.scale).toBeCloseTo(0.5);
    expect(placement.y).toBe(SCREEN_MARGIN);
  });

  it("accounts for content whose bounds don't start at the origin", () => {
    // Content centred on x = 0, as on the title screen.
    const centred = { x: -300, y: 0, width: 600, height: 400 };
    expect(fitToScreen(centred, 1000, 800)).toEqual({
      scale: 1,
      x: 500,
      y: 200,
    });
  });
});
