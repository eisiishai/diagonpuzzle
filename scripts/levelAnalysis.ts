// Analysis of every level with the solver, shared by the level design tools.
// Rows are 0-based here; the tools show them from 1, as the player counts.

import { fire } from "../src/game/simulate";
import type { ShotOutcome } from "../src/game/simulate";
import { bonusPositions, withBonuses } from "../src/game/bonus";
import { setupRoutes, solve, solveBonus } from "../src/game/solver";
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
  /** The starting board, with its bonus target if it has one. */
  board: Board;
  /** A shortest solution, or null if none was found. */
  solution: number[] | null;
  /** The shortest solution played out, shot by shot. */
  solutionShots: SolutionShot[];
  setupRoutes: [number, number][];
  firstShots: ShotOutcome[];
  /** True if the solver confirms the level's declared minShots. */
  minShotsConfirmed: boolean;
  /**
   * A shortest way to hit the bonus target (undefined if the level has none,
   * null if none was found).
   */
  bonusSolution?: number[] | null;
  /** True if the solver confirms the level's declared bonusShots. */
  bonusShotsConfirmed: boolean;
}

export function analyzeLevels(): LevelAnalysis[] {
  return LEVELS.map((level, index) => {
    const fullBoard = parseLevel(level.grid);
    // Par is played without bonus targets: they appear only after it.
    const board = withBonuses(fullBoard);
    const solution = solve(
      board,
      level.minShots + SEARCH_EXTRA_SHOTS,
      level.goalHits ?? 1,
    );

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

    const [bonus] = bonusPositions(fullBoard);
    const bonusSolution = bonus
      ? solveBonus(
          fullBoard,
          bonus,
          (level.bonusShots ?? level.minShots) + SEARCH_EXTRA_SHOTS,
          level.goalHits ?? 1,
        )
      : undefined;

    return {
      number: index + 1,
      level,
      board: fullBoard,
      solution,
      solutionShots,
      // Setup routes are about a single goal hit.
      setupRoutes: (level.goalHits ?? 1) === 1 ? setupRoutes(board) : [],
      firstShots: Array.from(
        { length: board.height },
        (_, row) => fire(board, row).outcome,
      ),
      minShotsConfirmed: solution?.length === level.minShots,
      bonusSolution,
      bonusShotsConfirmed: bonusSolution?.length === level.bonusShots,
    };
  });
}

/** Rows as the player counts them, e.g. [3, 1] → "4 → 2". */
export function rowList(rows: number[]): string {
  return rows.map((row) => row + 1).join(" → ");
}
