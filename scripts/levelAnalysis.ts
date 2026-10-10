// Analysis of every level with the solver, shared by the level design tools.
// Rows are 0-based here; the tools show them from 1, as the player counts.

import { fire } from "../src/game/simulate";
import type { ShotOutcome } from "../src/game/simulate";
import { setupRoutes, solve } from "../src/game/solver";
import type { Board } from "../src/game/types";
import { LEVELS } from "../src/levels/levels";
import type { LevelDefinition } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";

/** Search a little beyond the declared minimum to report harder levels too. */
const SEARCH_EXTRA_SHOTS = 2;

export interface SolutionShot {
  row: number;
  outcome: ShotOutcome;
  /** Mirrors the shot flipped. */
  flips: number;
}

export interface LevelAnalysis {
  number: number;
  level: LevelDefinition;
  board: Board;
  /** A shortest solution, or null if none was found. */
  solution: number[] | null;
  /** The shortest solution played out, shot by shot. */
  solutionShots: SolutionShot[];
  setupRoutes: [number, number][];
  firstShots: ShotOutcome[];
  /** True if the solver confirms the level's declared minShots. */
  minShotsConfirmed: boolean;
}

export function analyzeLevels(): LevelAnalysis[] {
  return LEVELS.map((level, index) => {
    const board = parseLevel(level.grid);
    const solution = solve(board, level.minShots + SEARCH_EXTRA_SHOTS);

    const solutionShots: SolutionShot[] = [];
    let current = board;
    for (const row of solution ?? []) {
      const result = fire(current, row);
      solutionShots.push({
        row,
        outcome: result.outcome,
        flips: result.path.filter((step) => step.becomes).length,
      });
      current = result.board;
    }

    return {
      number: index + 1,
      level,
      board,
      solution,
      solutionShots,
      setupRoutes: setupRoutes(board),
      firstShots: Array.from(
        { length: board.height },
        (_, row) => fire(board, row).outcome,
      ),
      minShotsConfirmed: solution?.length === level.minShots,
    };
  });
}

/** Rows as the player counts them, e.g. [3, 1] → "4 → 2". */
export function rowList(rows: number[]): string {
  return rows.map((row) => row + 1).join(" → ");
}
