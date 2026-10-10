import { describe, expect, it } from "vitest";
import { VoiceLimiter } from "./VoiceLimiter";

describe("VoiceLimiter", () => {
  it("allows sounds up to the limit, then refuses more", () => {
    const limiter = new VoiceLimiter(2);
    expect(limiter.tryStart(0, 1)).toBe(true);
    expect(limiter.tryStart(0.1, 1)).toBe(true);
    expect(limiter.tryStart(0.2, 1)).toBe(false);
  });

  it("frees a voice when its sound has ended", () => {
    const limiter = new VoiceLimiter(1);
    expect(limiter.tryStart(0, 0.5)).toBe(true);
    expect(limiter.tryStart(0.4, 0.5)).toBe(false);
    expect(limiter.tryStart(0.5, 0.5)).toBe(true);
  });

  it("always plays important sounds", () => {
    const limiter = new VoiceLimiter(1);
    limiter.tryStart(0, 1);
    expect(limiter.tryStart(0, 1, true)).toBe(true);
    expect(limiter.tryStart(0, 1)).toBe(false);
  });
});
