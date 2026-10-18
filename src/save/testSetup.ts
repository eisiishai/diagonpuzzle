// Test setups for checking the game's once-per-player moments by hand, on
// any device: `?setup=all-par`, `all-bonus` or `prism` in the address
// replaces the saved progress with one that is a single step short of the
// moment, and `?setup=restore` brings the player's own progress back (see
// docs/WORKFLOW.md, Test setups). Nothing in the game leads to them. Pure,
// so the presets can be tested; main.ts reads the address and storage.

import { bonusPositions, withBonuses } from "../game/bonus";
import { solveBonusMoves, solveMoves } from "../game/solver";
import type { Move } from "../game/solver";
import type { MirrorType } from "../game/types";
import { parseLevel } from "../levels/parse";
import { EMPTY_PROGRESS } from "./progress";
import type { Progress } from "./progress";

/**
 * - `all-par`: every level before the secret chapter at par but the
 *   first, and no bonus targets: its par completes them all.
 * - `all-bonus`: those levels all at par, and every bonus target but the
 *   first level's: hitting it is the ending, which opens the secret
 *   chapter.
 * - `prism`: all of that, and the secret chapter at par but its first
 *   level: its par is the secret chapter's ending, and the title screen
 *   afterwards shows the whole game done.
 */
export const SETUP_PRESETS = ["all-par", "all-bonus", "prism"] as const;
export type SetupPreset = (typeof SETUP_PRESETS)[number];

/** What a test setup needs to know about a level. */
export interface SetupLevel {
  id: string;
  minShots: number;
  goalHits?: number;
  playerMirror?: MirrorType;
  grid: string;
  /** In a secret chapter; secret levels come after all the others. */
  secret?: boolean;
}

export interface TestSetup {
  progress: Progress;
  /** The level left to play, by its index. */
  level: number;
  /** What to hit there: the goal (at par) or its bonus target. */
  target: "goal" | "bonus";
  /** The shortest way to do it from the level's starting board. */
  moves: Move[];
}

/**
 * The `?setup=` value in a page address: a preset, `restore`, or null for
 * none or an unknown one.
 */
export function parseSetup(
  value: string | null,
): SetupPreset | "restore" | null {
  if (value === "restore") {
    return value;
  }
  return SETUP_PRESETS.find((preset) => preset === value) ?? null;
}

/** The progress of test setup `preset`, and the step it leaves to play. */
export function testSetup(
  preset: SetupPreset,
  levels: readonly SetupLevel[],
): TestSetup {
  const main = levels.filter((level) => !level.secret);
  const secret = levels.filter((level) => level.secret);
  // The level left: the first of the main levels, or of the secret ones.
  const left = preset === "prism" ? secret[0] : main[0];
  if (!left) {
    throw new Error(`No level to leave for the test setup "${preset}"`);
  }
  const atPar = (list: readonly SetupLevel[]) =>
    list
      .filter((level) => preset === "all-bonus" || level !== left)
      .map((level) => [level.id, { bestShots: level.minShots }] as const);
  const bonuses = main
    .filter((level) => preset === "prism" || level !== left)
    .map((level) => [level.id, bonusIndices(level)] as const)
    .filter(([, indices]) => indices.length > 0);
  const progress: Progress = {
    ...EMPTY_PROGRESS,
    levels: Object.fromEntries([
      ...atPar(main),
      ...(preset === "prism" ? atPar(secret) : []),
    ]),
    bonuses: preset === "all-par" ? {} : Object.fromEntries(bonuses),
  };

  const options = { goalHits: left.goalHits, playerMirror: left.playerMirror };
  const full = parseLevel(left.grid);
  const target = preset === "all-bonus" ? "bonus" : "goal";
  const moves =
    target === "bonus"
      ? solveBonusMoves(full, bonusPositions(full)[0], options)
      : solveMoves(withBonuses(full), options);
  if (!moves) {
    throw new Error(`No ${target} route on level "${left.id}"`);
  }
  return { progress, level: levels.indexOf(left), target, moves };
}

/**
 * The step a test setup leaves, for the title screen: e.g. "Test setup:
 * level 1, fire row 4", or "... level 49, rows 1, 1, the mirror at (6,5),
 * rows 2, 1, 2" (rows and cells numbered from 1, as on the screen).
 */
export function setupNotice({ level, target, moves }: TestSetup): string {
  const steps: string[] = [];
  let rows: number[] = [];
  const endRows = () => {
    if (rows.length > 0) {
      steps.push(`${rows.length === 1 ? "row" : "rows"} ${rows.join(", ")}`);
      rows = [];
    }
  };
  for (const move of moves) {
    if (typeof move === "number") {
      rows.push(move + 1);
    } else {
      endRows();
      steps.push(`the mirror at (${move.x + 1},${move.y + 1})`);
    }
  }
  endRows();
  const what = target === "bonus" ? "its bonus target" : "par";
  return `Test setup: level ${level + 1}, ${what} with ${steps.join(", ")}`;
}

/** The level's bonus targets, by their index in reading order. */
function bonusIndices(level: SetupLevel): number[] {
  return bonusPositions(parseLevel(level.grid)).map((_, index) => index);
}
