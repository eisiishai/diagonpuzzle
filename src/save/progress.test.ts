import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  earnsStar,
  isCompleted,
  isSkipped,
  isUnlocked,
  nextLevelIndex,
  parseProgress,
  recordCompletion,
  recordSkip,
  completesAllPar,
  serializeProgress,
  starCount,
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

describe("stars", () => {
  const levels = [
    { id: "a", minShots: 1 },
    { id: "b", minShots: 2 },
  ];

  it("are earned at par and not above it", () => {
    expect(earnsStar(2, 2)).toBe(true);
    expect(earnsStar(3, 2)).toBe(false);
  });

  it("are counted from best scores, for completed levels only", () => {
    expect(starCount(EMPTY_PROGRESS, levels)).toBe(0);
    let progress = recordCompletion(EMPTY_PROGRESS, "a", 1).progress;
    progress = recordCompletion(progress, "b", 3).progress;
    expect(starCount(progress, levels)).toBe(1);
    progress = recordCompletion(progress, "b", 2).progress;
    expect(starCount(progress, levels)).toBe(2);
  });
});

describe("completesAllPar", () => {
  const levels = [
    { id: "a", minShots: 1 },
    { id: "b", minShots: 2 },
  ];
  const aAtPar = recordCompletion(EMPTY_PROGRESS, "a", 1).progress;

  it("is true only for the completion that earns the last star", () => {
    const bAbovePar = recordCompletion(aAtPar, "b", 3).progress;
    expect(completesAllPar(aAtPar, bAbovePar, levels)).toBe(false);

    const bAtPar = recordCompletion(bAbovePar, "b", 2).progress;
    expect(completesAllPar(bAbovePar, bAtPar, levels)).toBe(true);

    // Replaying at par once every star is already earned.
    const again = recordCompletion(bAtPar, "a", 1).progress;
    expect(completesAllPar(bAtPar, again, levels)).toBe(false);
  });
});

describe("skipping", () => {
  it("marks a level skipped, not completed", () => {
    const progress = recordSkip(EMPTY_PROGRESS, "a");
    expect(isSkipped(progress, "a")).toBe(true);
    expect(isCompleted(progress, "a")).toBe(false);
    expect(recordSkip(progress, "a")).toBe(progress);
  });

  it("leaves a completed level completed", () => {
    const completed = recordCompletion(EMPTY_PROGRESS, "a", 2).progress;
    expect(recordSkip(completed, "a")).toBe(completed);
  });

  it("clears the skip when the level is completed later", () => {
    const skipped = recordSkip(EMPTY_PROGRESS, "a");
    const completed = recordCompletion(skipped, "a", 3).progress;
    expect(isSkipped(completed, "a")).toBe(false);
    expect(isCompleted(completed, "a")).toBe(true);
  });

  it("unlocks the level after a skipped one", () => {
    const progress = recordSkip(EMPTY_PROGRESS, "a");
    expect(isUnlocked(progress, IDS, 1)).toBe(true);
    expect(isUnlocked(progress, IDS, 2)).toBe(false);
  });

  it("continues from new levels first, then from skipped ones", () => {
    let progress = recordSkip(EMPTY_PROGRESS, "a");
    expect(nextLevelIndex(progress, IDS)).toBe(1);
    progress = recordCompletion(progress, "b", 1).progress;
    progress = recordCompletion(progress, "c", 1).progress;
    expect(nextLevelIndex(progress, IDS)).toBe(0);
  });
});

describe("parseProgress", () => {
  it("round-trips through serializeProgress", () => {
    const progress = recordSkip(
      recordCompletion(EMPTY_PROGRESS, "a", 4).progress,
      "b",
    );
    expect(parseProgress(serializeProgress(progress))).toEqual(progress);
  });

  it("reads saves from before skipping existed", () => {
    const json = JSON.stringify({
      version: 1,
      levels: { a: { bestShots: 2 } },
    });
    expect(parseProgress(json).skipped).toEqual([]);
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
    expect(parseProgress(json)).toEqual({
      levels: { good: { bestShots: 2 } },
      skipped: [],
    });
  });
});
