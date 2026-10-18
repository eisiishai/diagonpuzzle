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
  recordBonus,
  collectedBonuses,
  hasAllBonuses,
  goldenStarCount,
  completesAllBonuses,
  hasFoundAllBonuses,
  openLevelCount,
  opensSecretLevels,
  completesSecretPar,
  hasSecretLevelsAtPar,
  MAX_SKIPS,
  spendSkip,
  returnSkip,
  addLevelTime,
  SKIP_WAIT_MS,
  HINT_WAIT_MS,
  addHintTime,
  hintStage,
  hintWaitLeft,
  openHint,
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
    const skipped = recordSkip(recordSkip(EMPTY_PROGRESS, "a"), "b");
    const completed = recordCompletion(skipped, "a", 3).progress;
    expect(isSkipped(completed, "a")).toBe(false);
    expect(isCompleted(completed, "a")).toBe(true);
    expect(isSkipped(completed, "b")).toBe(true);
  });

  it("keeps completed and skipped levels unlocked whatever comes before", () => {
    // E.g. after reordering: "c" was played, but "b" before it was not.
    let progress = recordCompletion(EMPTY_PROGRESS, "c", 1).progress;
    expect(isUnlocked(progress, IDS, 2)).toBe(true);
    progress = recordSkip(EMPTY_PROGRESS, "c");
    expect(isUnlocked(progress, IDS, 2)).toBe(true);
    expect(isUnlocked(progress, IDS, 1)).toBe(false);
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
    // The skipped level, wherever it is, not just the first level.
    progress = recordSkip(EMPTY_PROGRESS, "b");
    progress = recordCompletion(progress, "a", 1).progress;
    progress = recordCompletion(progress, "c", 1).progress;
    expect(nextLevelIndex(progress, IDS)).toBe(1);
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
    expect(parseProgress(json).bonuses).toEqual({});
  });

  it("round-trips collected bonus targets and drops invalid ones", () => {
    const progress = recordBonus(
      recordCompletion(EMPTY_PROGRESS, "a", 2).progress,
      "a",
      0,
    );
    expect(parseProgress(serializeProgress(progress))).toEqual(progress);
    const json = JSON.stringify({
      version: 1,
      levels: {},
      bonuses: { a: [0, 0, -1, "1", 2], b: "x" },
    });
    expect(parseProgress(json).bonuses).toEqual({ a: [0, 2] });
  });

  it("returns empty progress for missing or malformed data", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("not json")).toEqual(EMPTY_PROGRESS);
    expect(parseProgress("[]")).toEqual(EMPTY_PROGRESS);
    // JSON that isn't an object at all.
    for (const json of ["5", "null", '"text"', "true"]) {
      expect(parseProgress(json), json).toEqual(EMPTY_PROGRESS);
    }
    // A completed level that would be kept, if the rest were right.
    const levels = { a: { bestShots: 2 } };
    const save = (data: object) => parseProgress(JSON.stringify(data));
    expect(save({ version: 99, levels })).toEqual(EMPTY_PROGRESS);
    expect(save({ levels })).toEqual(EMPTY_PROGRESS);
    expect(save({ version: 1 })).toEqual(EMPTY_PROGRESS);
    expect(save({ version: 1, levels: null })).toEqual(EMPTY_PROGRESS);
    expect(save({ version: 1, levels: "a" })).toEqual(EMPTY_PROGRESS);
  });

  it("drops skipped entries that aren't level ids or are completed", () => {
    const json = JSON.stringify({
      version: 1,
      levels: { a: { bestShots: 2 } },
      skipped: ["a", "b", 3, null],
    });
    expect(parseProgress(json).skipped).toEqual(["b"]);
    const notList = { version: 1, levels: {}, skipped: "b" };
    expect(parseProgress(JSON.stringify(notList)).skipped).toEqual([]);
  });

  it("ignores bonus targets that aren't saved as an object", () => {
    for (const bonuses of [null, "a", 3]) {
      const json = JSON.stringify({ version: 1, levels: {}, bonuses });
      expect(parseProgress(json).bonuses, String(bonuses)).toEqual({});
    }
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
      bonuses: {},
      skipsLeft: MAX_SKIPS,
      skipWaitMs: 0,
      hints: {},
    });
  });
});

describe("bonus targets", () => {
  const LEVELS = [
    { id: "a", minShots: 1, bonusCount: 1 },
    { id: "b", minShots: 2, bonusCount: 2 },
    { id: "c", minShots: 1, bonusCount: 0 },
  ];
  const completed = recordCompletion(EMPTY_PROGRESS, "a", 1).progress;

  it("records each bonus target once, apart from completion", () => {
    const once = recordBonus(completed, "a", 0);
    expect(collectedBonuses(once, "a")).toEqual([0]);
    expect(recordBonus(once, "a", 0)).toBe(once);
    expect(once.levels).toBe(completed.levels);
  });

  it("keeps collected bonus targets when the level is completed again", () => {
    const bonus = recordBonus(completed, "a", 0);
    const again = recordCompletion(bonus, "a", 3).progress;
    expect(collectedBonuses(again, "a")).toEqual([0]);
  });

  it("gives a golden star once all of a level's bonus targets are collected", () => {
    const oneOfTwo = recordBonus(EMPTY_PROGRESS, "b", 1);
    expect(hasAllBonuses(oneOfTwo, LEVELS[1])).toBe(false);
    const both = recordBonus(oneOfTwo, "b", 0);
    expect(hasAllBonuses(both, LEVELS[1])).toBe(true);
    expect(hasAllBonuses(EMPTY_PROGRESS, LEVELS[2])).toBe(false);
    expect(goldenStarCount(both, LEVELS)).toBe(1);
  });

  it("detects collecting the last bonus target of the game", () => {
    const before = recordBonus(recordBonus(EMPTY_PROGRESS, "a", 0), "b", 0);
    const after = recordBonus(before, "b", 1);
    expect(completesAllBonuses(before, after, LEVELS)).toBe(true);
    expect(completesAllBonuses(after, after, LEVELS)).toBe(false);
    expect(completesAllBonuses(EMPTY_PROGRESS, before, LEVELS)).toBe(false);
  });

  it("knows when every bonus target of the game is found", () => {
    const all = recordBonus(
      recordBonus(recordBonus(EMPTY_PROGRESS, "a", 0), "b", 0),
      "b",
      1,
    );
    expect(hasFoundAllBonuses(all, LEVELS)).toBe(true);
    expect(
      hasFoundAllBonuses(recordBonus(EMPTY_PROGRESS, "a", 0), LEVELS),
    ).toBe(false);
    // A game without bonus targets has none to find.
    const none = [{ id: "x", minShots: 1, bonusCount: 0 }];
    expect(hasFoundAllBonuses(EMPTY_PROGRESS, none)).toBe(false);
  });

  it("opens the secret levels once every other bonus target is found", () => {
    const withSecret = [
      ...LEVELS,
      { id: "s", minShots: 3, bonusCount: 0, secret: true },
    ];
    const before = recordBonus(recordBonus(EMPTY_PROGRESS, "a", 0), "b", 0);
    const after = recordBonus(before, "b", 1);
    expect(openLevelCount(before, withSecret)).toBe(3);
    expect(openLevelCount(after, withSecret)).toBe(4);
    expect(opensSecretLevels(before, after, withSecret)).toBe(true);
    expect(opensSecretLevels(after, after, withSecret)).toBe(false);
    // Without secret levels, all levels are open and none can open.
    expect(openLevelCount(EMPTY_PROGRESS, LEVELS)).toBe(3);
    expect(opensSecretLevels(before, after, LEVELS)).toBe(false);
  });

  it("detects the last secret level reaching par", () => {
    const withSecret = [
      ...LEVELS,
      { id: "s", minShots: 3, bonusCount: 0, secret: true },
      { id: "t", minShots: 2, bonusCount: 0, secret: true },
    ];
    const one = recordCompletion(EMPTY_PROGRESS, "s", 3).progress;
    const both = recordCompletion(one, "t", 2).progress;
    expect(completesSecretPar(EMPTY_PROGRESS, one, withSecret)).toBe(false);
    expect(completesSecretPar(one, both, withSecret)).toBe(true);
    expect(completesSecretPar(both, both, withSecret)).toBe(false);
    // A game without secret levels has none to complete.
    expect(completesSecretPar(EMPTY_PROGRESS, both, LEVELS)).toBe(false);
  });

  it("knows when every secret level is at par", () => {
    const withSecret = [
      ...LEVELS,
      { id: "s", minShots: 3, bonusCount: 0, secret: true },
      { id: "t", minShots: 2, bonusCount: 0, secret: true },
    ];
    const one = recordCompletion(EMPTY_PROGRESS, "s", 3).progress;
    const above = recordCompletion(one, "t", 3).progress;
    const both = recordCompletion(above, "t", 2).progress;
    expect(hasSecretLevelsAtPar(one, withSecret)).toBe(false);
    expect(hasSecretLevelsAtPar(above, withSecret)).toBe(false);
    expect(hasSecretLevelsAtPar(both, withSecret)).toBe(true);
    // A game without secret levels has none to complete.
    expect(hasSecretLevelsAtPar(both, LEVELS)).toBe(false);
  });
});

describe("visible skips", () => {
  it("starts with all skips and spends one per skipped level", () => {
    expect(EMPTY_PROGRESS.skipsLeft).toBe(3);
    const skipped = spendSkip(EMPTY_PROGRESS, "a");
    expect(isSkipped(skipped, "a")).toBe(true);
    expect(skipped.skipsLeft).toBe(2);
  });

  it("spends nothing on a level already passed, or with none left", () => {
    const skipped = spendSkip(EMPTY_PROGRESS, "a");
    expect(spendSkip(skipped, "a")).toBe(skipped);
    const completed = recordCompletion(EMPTY_PROGRESS, "b", 1).progress;
    expect(spendSkip(completed, "b")).toBe(completed);
    const none = { ...EMPTY_PROGRESS, skipsLeft: 0 };
    expect(spendSkip(none, "a")).toBe(none);
  });

  it("leaves the hidden skip free", () => {
    expect(recordSkip(EMPTY_PROGRESS, "a").skipsLeft).toBe(MAX_SKIPS);
  });

  it("gives skips back up to the maximum", () => {
    const one = { ...EMPTY_PROGRESS, skipsLeft: 1 };
    expect(returnSkip(one).skipsLeft).toBe(2);
    expect(returnSkip(EMPTY_PROGRESS)).toBe(EMPTY_PROGRESS);
  });

  it("saves skips left, clamped, and gives old saves all of them", () => {
    const one = { ...EMPTY_PROGRESS, skipsLeft: 1 };
    expect(parseProgress(serializeProgress(one)).skipsLeft).toBe(1);
    const save = (skipsLeft: unknown) =>
      parseProgress(JSON.stringify({ version: 1, levels: {}, skipsLeft }))
        .skipsLeft;
    expect(save(9)).toBe(MAX_SKIPS);
    expect(save(-2)).toBe(0);
    expect(save("2")).toBe(MAX_SKIPS);
    expect(parseProgress('{"version":1,"levels":{}}').skipsLeft).toBe(3);
  });

  it("saves the wait for a skip, clamped, and starts old saves at 0", () => {
    const waiting = { ...EMPTY_PROGRESS, skipsLeft: 0, skipWaitMs: 1234 };
    expect(parseProgress(serializeProgress(waiting)).skipWaitMs).toBe(1234);
    const save = (skipWaitMs: unknown) =>
      parseProgress(JSON.stringify({ version: 1, levels: {}, skipWaitMs }))
        .skipWaitMs;
    expect(save(-5)).toBe(0);
    expect(save(SKIP_WAIT_MS * 2)).toBe(SKIP_WAIT_MS);
    expect(save("1234")).toBe(0);
    expect(save(null)).toBe(0);
    expect(parseProgress('{"version":1,"levels":{}}').skipWaitMs).toBe(0);
  });

  it("gives a skip back after time on level screens with none left", () => {
    const none = { ...EMPTY_PROGRESS, skipsLeft: 0 };
    expect(addLevelTime(EMPTY_PROGRESS, 1000)).toBe(EMPTY_PROGRESS);
    const almost = addLevelTime(none, SKIP_WAIT_MS - 1);
    expect(almost.skipsLeft).toBe(0);
    const earned = addLevelTime(almost, 1);
    expect(earned.skipsLeft).toBe(1);
    expect(earned.skipWaitMs).toBe(0);
  });

  it("restarts the wait when the last skip is spent", () => {
    const one = { ...EMPTY_PROGRESS, skipsLeft: 1, skipWaitMs: 99 };
    expect(spendSkip(one, "a")).toMatchObject({ skipsLeft: 0, skipWaitMs: 0 });
  });
});

describe("hints", () => {
  it("opens the text hint, then the second after the wait", () => {
    expect(hintStage(EMPTY_PROGRESS, "a")).toBe(0);
    const opened = openHint(EMPTY_PROGRESS, "a");
    expect(hintStage(opened, "a")).toBe(1);
    expect(hintStage(opened, "b")).toBe(0);
    const almost = addHintTime(opened, "a", HINT_WAIT_MS - 1);
    expect(hintStage(almost, "a")).toBe(1);
    expect(hintWaitLeft(almost, "a")).toBe(1);
    const open = addHintTime(almost, "a", 1000);
    expect(hintStage(open, "a")).toBe(2);
    expect(open.hints.a).toBe(HINT_WAIT_MS);
    expect(addHintTime(open, "a", 1000)).toBe(open);
  });

  it("counts no time before the text hint is opened", () => {
    expect(addHintTime(EMPTY_PROGRESS, "a", 1000)).toBe(EMPTY_PROGRESS);
    expect(hintWaitLeft(EMPTY_PROGRESS, "a")).toBe(HINT_WAIT_MS);
  });

  it("opening it again changes nothing", () => {
    const waited = addHintTime(openHint(EMPTY_PROGRESS, "a"), "a", 500);
    expect(openHint(waited, "a")).toBe(waited);
  });

  it("saves hints, clamped, and starts old saves with none", () => {
    const saved = { ...EMPTY_PROGRESS, hints: { a: 1234, b: HINT_WAIT_MS } };
    expect(parseProgress(serializeProgress(saved)).hints).toEqual(saved.hints);
    const load = (hints: unknown) =>
      parseProgress(JSON.stringify({ version: 1, levels: {}, hints })).hints;
    expect(load({ a: -5, b: HINT_WAIT_MS * 2, c: "1", d: null })).toEqual({
      a: 0,
      b: HINT_WAIT_MS,
    });
    expect(load([1])).toEqual({});
    expect(load(null)).toEqual({});
    expect(parseProgress('{"version":1,"levels":{}}').hints).toEqual({});
  });
});
