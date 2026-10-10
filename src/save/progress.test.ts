import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  isCompleted,
  isUnlocked,
  nextLevelIndex,
  parseProgress,
  recordCompletion,
  serializeProgress,
} from "./progress";

const IDS = ["a", "b", "c"];

describe("recordCompletion", () => {
  it("records a first completion without a previous best", () => {
    const result = recordCompletion(EMPTY_PROGRESS, "a", 3);
    expect(result.previousBest).toBeUndefined();
    expect(result.progress.levels.a).toEqual({ bestShots: 3 });
    expect(isCompleted(result.progress, "a")).toBe(true);
  });

  it("keeps the lower shot count", () => {
    const first = recordCompletion(EMPTY_PROGRESS, "a", 3).progress;
    const better = recordCompletion(first, "a", 2);
    expect(better.previousBest).toBe(3);
    expect(better.progress.levels.a).toEqual({ bestShots: 2 });

    const worse = recordCompletion(better.progress, "a", 5);
    expect(worse.previousBest).toBe(2);
    expect(worse.progress.levels.a).toEqual({ bestShots: 2 });
  });

  it("does not modify the original progress", () => {
    recordCompletion(EMPTY_PROGRESS, "a", 1);
    expect(EMPTY_PROGRESS.levels).toEqual({});
  });
});

describe("unlocking and next level", () => {
  const progress = recordCompletion(EMPTY_PROGRESS, "a", 1).progress;

  it("unlocks the first level and each level after a completed one", () => {
    expect(isUnlocked(EMPTY_PROGRESS, IDS, 0)).toBe(true);
    expect(isUnlocked(EMPTY_PROGRESS, IDS, 1)).toBe(false);
    expect(isUnlocked(progress, IDS, 1)).toBe(true);
    expect(isUnlocked(progress, IDS, 2)).toBe(false);
  });

  it("continues from the first uncompleted level, or level 1 when all are done", () => {
    expect(nextLevelIndex(EMPTY_PROGRESS, IDS)).toBe(0);
    expect(nextLevelIndex(progress, IDS)).toBe(1);
    const all = IDS.reduce(
      (p, id) => recordCompletion(p, id, 1).progress,
      EMPTY_PROGRESS,
    );
    expect(nextLevelIndex(all, IDS)).toBe(0);
  });
});

describe("parseProgress", () => {
  it("round-trips through serializeProgress", () => {
    const progress = recordCompletion(EMPTY_PROGRESS, "a", 4).progress;
    expect(parseProgress(serializeProgress(progress))).toEqual(progress);
  });

  it("returns empty progress for missing or malformed data", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("not json")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("[]")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress('{"version":99,"levels":{}}')).toEqual(EMPTY_PROGRESS);
  });

  it("drops invalid level entries and keeps valid ones", () => {
    const json = JSON.stringify({
      version: 1,
      levels: {
        good: { bestShots: 2 },
        zero: { bestShots: 0 },
        text: { bestShots: "3" },
        empty: null,
      },
    });
    expect(parseProgress(json)).toEqual({ levels: { good: { bestShots: 2 } } });
  });
});
