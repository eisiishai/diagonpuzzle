import { describe, expect, it } from "vitest";
import { GameProgress, SAVE_WAIT_EVERY_MS } from "./GameProgress";
import { EMPTY_PROGRESS, MAX_SKIPS, SKIP_WAIT_MS } from "./progress";
import type { LevelSummary, Progress } from "./progress";

// Levels 0 and 2 have bonus targets (two and one); level 1 has none.
const LEVELS: readonly LevelSummary[] = [
  { id: "a", minShots: 2, bonusCount: 2 },
  { id: "b", minShots: 3, bonusCount: 0 },
  { id: "c", minShots: 1, bonusCount: 1 },
];

function newGame(saved: Partial<Progress> = {}): GameProgress {
  return new GameProgress(LEVELS, { ...EMPTY_PROGRESS, ...saved });
}

describe("GameProgress.levelStart", () => {
  it("shows no bonus targets before the level was completed at par", () => {
    const game = newGame();
    expect(game.levelStart(0)).toEqual({
      bonusesShown: false,
      bonusesCollected: 0,
      passedBefore: false,
      skipsLeft: MAX_SKIPS,
    });
    game.complete(0, 3);
    expect(game.levelStart(0).bonusesShown).toBe(false);
    expect(game.levelStart(0).passedBefore).toBe(true);
  });

  it("shows bonus targets on visits after the level was completed at par", () => {
    const game = newGame();
    game.complete(0, 2);
    expect(game.levelStart(0).bonusesShown).toBe(true);
  });

  it("counts a skipped level as passed, and collected bonus targets", () => {
    const game = newGame({ skipped: ["b"], bonuses: { a: [1] } });
    expect(game.levelStart(1).passedBefore).toBe(true);
    expect(game.levelStart(0).bonusesCollected).toBe(1);
  });
});

describe("GameProgress.complete", () => {
  it("records a first completion and gives back a used skip", () => {
    const game = newGame({ skipsLeft: 1 });
    expect(game.complete(0, 4)).toEqual({
      previousBest: undefined,
      skipReturned: 2,
      allLevelsAtPar: false,
      secretAtPar: false,
      bonusesShown: false,
    });
    expect(game.progress.levels.a?.bestShots).toBe(4);
    expect(game.progress.skipsLeft).toBe(2);
  });

  it("gives back no skip when none was used", () => {
    const game = newGame();
    expect(game.complete(0, 4).skipReturned).toBeUndefined();
    expect(game.progress.skipsLeft).toBe(MAX_SKIPS);
  });

  it("gives back no skip on a replay", () => {
    const game = newGame({ levels: { a: { bestShots: 4 } }, skipsLeft: 1 });
    expect(game.complete(0, 2)).toEqual({
      previousBest: 4,
      skipReturned: undefined,
      allLevelsAtPar: false,
      secretAtPar: false,
      bonusesShown: true,
    });
    expect(game.progress.skipsLeft).toBe(1);
  });

  it("shows the bonus targets once the level is at par, best or not", () => {
    const game = newGame();
    expect(game.complete(0, 3).bonusesShown).toBe(false);
    expect(game.complete(0, 2).bonusesShown).toBe(true);
    // A later completion above par keeps the best, so they still show.
    expect(game.complete(0, 5).bonusesShown).toBe(true);
  });

  it("reports the last star of the game once", () => {
    const game = newGame({
      levels: { a: { bestShots: 2 }, c: { bestShots: 1 } },
    });
    expect(game.complete(1, 4).allLevelsAtPar).toBe(false);
    expect(game.complete(1, 3).allLevelsAtPar).toBe(true);
    expect(game.complete(1, 3).allLevelsAtPar).toBe(false);
  });
});

describe("GameProgress.collectBonus", () => {
  it("collects a bonus target and gives back a used skip the first time", () => {
    const game = newGame({ skipsLeft: 0 });
    expect(game.collectBonus(0, 1)).toEqual({
      skipReturned: 1,
      newlyGolden: false,
      collected: 1,
      allBonuses: false,
      secretOpened: false,
    });
    expect(game.progress.bonuses.a).toEqual([1]);
  });

  it("changes nothing when the same bonus target is hit again", () => {
    const game = newGame({ skipsLeft: 0 });
    game.collectBonus(0, 1);
    const before = game.progress;
    expect(game.collectBonus(0, 1)).toEqual({
      skipReturned: undefined,
      newlyGolden: false,
      collected: 1,
      allBonuses: false,
      secretOpened: false,
    });
    expect(game.progress).toBe(before);
  });

  it("turns the star golden with the level's last bonus target, once", () => {
    const game = newGame();
    game.collectBonus(0, 0);
    expect(game.collectBonus(0, 1).newlyGolden).toBe(true);
    expect(game.collectBonus(0, 1).newlyGolden).toBe(false);
  });

  it("reports the last bonus target of the game once", () => {
    const game = newGame({ bonuses: { a: [0, 1] } });
    expect(game.collectBonus(2, 0)).toMatchObject({
      newlyGolden: true,
      allBonuses: true,
    });
    expect(game.collectBonus(2, 0).allBonuses).toBe(false);
  });
});

describe("GameProgress with a secret chapter", () => {
  // Level "s" is secret: in the game only once every bonus target is found.
  const WITH_SECRET: readonly LevelSummary[] = [
    ...LEVELS,
    { id: "s", minShots: 4, bonusCount: 0, secret: true },
  ];
  const allAtPar = {
    levels: { a: { bestShots: 2 }, b: { bestShots: 3 }, c: { bestShots: 1 } },
  };
  const newSecretGame = (saved: Partial<Progress> = {}) =>
    new GameProgress(WITH_SECRET, { ...EMPTY_PROGRESS, ...saved });

  it("leaves the secret levels out until the last bonus target opens them", () => {
    const game = newSecretGame({ ...allAtPar, bonuses: { a: [0, 1] } });
    expect(game.openLevelCount).toBe(3);
    expect(game.openLevels.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(game.collectBonus(2, 0)).toMatchObject({
      allBonuses: true,
      secretOpened: true,
    });
    expect(game.openLevelCount).toBe(4);
    expect(game.collectBonus(2, 0).secretOpened).toBe(false);
  });

  it("counts the last star among the open levels", () => {
    const game = newSecretGame({ levels: allAtPar.levels });
    // Before the secret chapter opens, the other levels are all of them.
    expect(game.complete(1, 3).allLevelsAtPar).toBe(false);
    const opened = newSecretGame({
      levels: { a: { bestShots: 2 }, c: { bestShots: 1 } },
      bonuses: { a: [0, 1], c: [0] },
    });
    expect(opened.complete(1, 3)).toMatchObject({
      allLevelsAtPar: false,
      secretAtPar: false,
    });
    expect(opened.complete(3, 5).secretAtPar).toBe(false);
    expect(opened.complete(3, 4)).toMatchObject({
      allLevelsAtPar: true,
      secretAtPar: true,
    });
    expect(opened.complete(3, 4).secretAtPar).toBe(false);
  });

  it("reports the last star before the secret chapter opens", () => {
    const game = newSecretGame({
      levels: { a: { bestShots: 2 }, c: { bestShots: 1 } },
    });
    expect(game.complete(1, 3).allLevelsAtPar).toBe(true);
  });
});

describe("GameProgress skips", () => {
  it("uses a visible skip and marks the level skipped", () => {
    const game = newGame();
    game.useSkip(0);
    expect(game.progress.skipsLeft).toBe(MAX_SKIPS - 1);
    expect(game.levelStart(0).passedBefore).toBe(true);
  });

  it("uses no visible skip for the hidden skip", () => {
    const game = newGame({ skipsLeft: 0 });
    game.hiddenSkip(1);
    expect(game.progress.skipsLeft).toBe(0);
    expect(game.progress.skipped).toEqual(["b"]);
  });

  it("forgets everything on reset", () => {
    const game = newGame({ levels: { a: { bestShots: 2 } }, skipsLeft: 0 });
    game.reset();
    expect(game.progress).toEqual(EMPTY_PROGRESS);
  });
});

describe("GameProgress.addLevelTime", () => {
  it("changes and saves nothing while skips are left", () => {
    const game = newGame();
    const before = game.progress;
    expect(game.addLevelTime(SKIP_WAIT_MS)).toEqual({
      skipsChanged: false,
      save: false,
    });
    expect(game.progress).toBe(before);
  });

  it("saves the wait every few seconds, not every frame", () => {
    const game = newGame({ skipsLeft: 0 });
    let saves = 0;
    for (let ms = 0; ms < 3 * SAVE_WAIT_EVERY_MS; ms += 16) {
      if (game.addLevelTime(16).save) {
        saves++;
      }
    }
    expect(saves).toBe(3);
  });

  it("gives back a skip after the wait, and asks for a save", () => {
    const game = newGame({ skipsLeft: 0, skipWaitMs: SKIP_WAIT_MS - 10 });
    expect(game.addLevelTime(5)).toEqual({ skipsChanged: false, save: false });
    expect(game.addLevelTime(5)).toEqual({ skipsChanged: true, save: true });
    expect(game.progress.skipsLeft).toBe(1);
    expect(game.progress.skipWaitMs).toBe(0);
  });
});
