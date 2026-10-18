import { describe, expect, it } from "vitest";
import { bonusPositions } from "../game/bonus";
import {
  CHAPTERS,
  LEVELS,
  chapterRanges,
  secretLevels,
} from "../levels/levels";
import { parseLevel } from "../levels/parse";
import {
  completesAllBonuses,
  completesAllPar,
  completesSecretPar,
  hasFoundAllBonuses,
  hasSecretLevelsAtPar,
  openLevelCount,
  recordBonus,
  recordCompletion,
} from "./progress";
import type { LevelSummary } from "./progress";
import { SETUP_PRESETS, parseSetup, setupNotice, testSetup } from "./testSetup";

// The game's own levels, as main.ts gives them.
const secret = secretLevels(chapterRanges(LEVELS, CHAPTERS));
const levels = LEVELS.map((level, i) => ({ ...level, secret: secret[i] }));
const summaries: LevelSummary[] = levels.map((level) => ({
  id: level.id,
  minShots: level.minShots,
  bonusCount: bonusPositions(parseLevel(level.grid)).length,
  secret: level.secret,
}));
const main = summaries.filter((level) => !level.secret);
const firstSecret = summaries.findIndex((level) => level.secret);

describe("parseSetup", () => {
  it("knows the presets and restore, and nothing else", () => {
    for (const preset of SETUP_PRESETS) {
      expect(parseSetup(preset)).toBe(preset);
    }
    expect(parseSetup("restore")).toBe("restore");
    expect(parseSetup(null)).toBeNull();
    expect(parseSetup("all")).toBeNull();
  });
});

describe("testSetup", () => {
  it("all-par: the first level's par completes every level at par", () => {
    const setup = testSetup("all-par", levels);
    expect(setup).toMatchObject({ level: 0, target: "goal", moves: [3] });
    const { progress } = setup;
    expect(progress.bonuses).toEqual({});
    expect(openLevelCount(progress, summaries)).toBe(main.length);
    const after = recordCompletion(progress, levels[0].id, 1).progress;
    expect(completesAllPar(progress, after, main)).toBe(true);
  });

  it("all-bonus: the first level's bonus target is the last one, the ending", () => {
    const setup = testSetup("all-bonus", levels);
    expect(setup).toMatchObject({ level: 0, target: "bonus" });
    const { progress } = setup;
    // Every main level at par, so the first level's bonus target shows.
    expect(Object.keys(progress.levels)).toHaveLength(main.length);
    const after = recordBonus(progress, levels[0].id, 0);
    expect(completesAllBonuses(progress, after, summaries)).toBe(true);
    expect(openLevelCount(after, summaries)).toBe(summaries.length);
  });

  it("prism: the first secret level's par is the secret chapter's ending", () => {
    const setup = testSetup("prism", levels);
    expect(setup).toMatchObject({ level: firstSecret, target: "goal" });
    const { progress } = setup;
    expect(hasFoundAllBonuses(progress, summaries)).toBe(true);
    expect(hasSecretLevelsAtPar(progress, summaries)).toBe(false);
    const level = levels[firstSecret];
    const after = recordCompletion(progress, level.id, level.minShots).progress;
    expect(completesSecretPar(progress, after, summaries)).toBe(true);
    expect(hasSecretLevelsAtPar(after, summaries)).toBe(true);
  });

  it("refuses a preset with no level to leave", () => {
    expect(() => testSetup("prism", levels.slice(0, 2))).toThrow();
  });
});

describe("setupNotice", () => {
  it("names the level and the moves, numbered from 1", () => {
    expect(setupNotice(testSetup("all-par", levels))).toBe(
      "Test setup: level 1, par with row 4",
    );
    expect(setupNotice(testSetup("all-bonus", levels))).toBe(
      "Test setup: level 1, its bonus target with row 1",
    );
    expect(
      setupNotice({
        progress: testSetup("all-par", levels).progress,
        level: 48,
        target: "goal",
        moves: [0, 0, { x: 5, y: 4, mirror: "mirrorBackslash" }, 1, 0, 1],
      }),
    ).toBe(
      "Test setup: level 49, par with rows 1, 1, the mirror at (6,5), rows 2, 1, 2",
    );
  });
});
