import { describe, expect, it } from "vitest";
import {
  clampScroll,
  dragVelocity,
  edgeFade,
  maxScroll,
  scrollPerThumb,
  scrollToShow,
  thumbPlace,
  wheelPixels,
} from "./scroll";

describe("scroll limits", () => {
  it("scrolls as far as the content is taller than the view", () => {
    expect(maxScroll(500, 200)).toBe(300);
    expect(maxScroll(100, 200)).toBe(0);
  });

  it("keeps the scroll position between the top and the furthest", () => {
    expect(clampScroll(-10, 500, 200)).toBe(0);
    expect(clampScroll(120, 500, 200)).toBe(120);
    expect(clampScroll(400, 500, 200)).toBe(300);
    expect(clampScroll(50, 100, 200)).toBe(0);
  });
});

describe("scrollToShow", () => {
  it("stays put when the range already shows", () => {
    expect(scrollToShow(100, 200, 150, 250)).toBe(100);
  });

  it("scrolls the least that shows a range above or below", () => {
    expect(scrollToShow(100, 200, 40, 90)).toBe(40);
    expect(scrollToShow(100, 200, 280, 340)).toBe(140);
  });

  it("shows the top of a range taller than the view", () => {
    expect(scrollToShow(0, 200, 100, 400)).toBe(100);
  });
});

describe("wheelPixels", () => {
  it("counts pixels, lines or pages", () => {
    expect(wheelPixels(30, 0, 500)).toBe(30);
    expect(wheelPixels(3, 1, 500)).toBe(48);
    expect(wheelPixels(-1, 2, 500)).toBe(-500);
  });
});

describe("edgeFade", () => {
  it("leaves items whole where nothing is beyond the edge", () => {
    expect(edgeFade(0, 20, 200, false, false)).toBe(1);
    expect(edgeFade(180, 200, 200, false, false)).toBe(1);
  });

  it("fades items towards an edge with more beyond it", () => {
    expect(edgeFade(0, 20, 200, true, false)).toBeCloseTo(0.25);
    expect(edgeFade(180, 200, 200, false, true)).toBeCloseTo(0.25);
    expect(edgeFade(90, 110, 200, true, true)).toBe(1);
  });

  it("never fades an item out completely", () => {
    expect(edgeFade(-40, -20, 200, true, false)).toBe(0.15);
  });
});

describe("dragVelocity", () => {
  it("measures the speed of a drag's last moments", () => {
    const samples = [
      { time: 0, scroll: 0 },
      { time: 900, scroll: 100 },
      { time: 950, scroll: 120 },
      { time: 1000, scroll: 160 },
    ];
    expect(dragVelocity(samples, 1000)).toBeCloseTo(0.6);
  });

  it("is 0 for a drag held still before it was let go", () => {
    const samples = [
      { time: 0, scroll: 0 },
      { time: 50, scroll: 40 },
    ];
    expect(dragVelocity(samples, 500)).toBe(0);
    expect(dragVelocity([], 0)).toBe(0);
  });

  it("is 0 when its last moments all came in the same millisecond", () => {
    const samples = [
      { time: 1000, scroll: 100 },
      { time: 1000, scroll: 120 },
    ];
    expect(dragVelocity(samples, 1000)).toBe(0);
  });
});

describe("scroll bar", () => {
  it("sizes the thumb by how much is in view and places it by the scroll", () => {
    expect(thumbPlace(0, 200, 400, 200)).toEqual({ top: 0, height: 100 });
    expect(thumbPlace(100, 200, 400, 200)).toEqual({ top: 50, height: 100 });
    expect(thumbPlace(200, 200, 400, 200)).toEqual({ top: 100, height: 100 });
  });

  it("keeps the thumb long enough to grab", () => {
    expect(thumbPlace(0, 100, 10000, 100).height).toBe(28);
    expect(thumbPlace(9900, 100, 10000, 100).top).toBe(72);
  });

  it("fills the track when everything is in view", () => {
    expect(thumbPlace(0, 200, 100, 200)).toEqual({ top: 0, height: 200 });
  });

  it("turns the thumb's movement into the content's", () => {
    expect(scrollPerThumb(50, 200, 400, 200)).toBe(100);
    expect(scrollPerThumb(50, 200, 100, 200)).toBe(0);
  });
});
