// Analysis of every level with the solver, shared by the level design tools.
// Rows are 0-based here; the tools show them from 1, as the player counts.

import { fire } from "../src/game/simulate";
import type { ShotOutcome, ShotResult } from "../src/game/simulate";
import { bonusPositions, withBonuses } from "../src/game/bonus";
import {
  playMoves,
  setupRoutes,
  shotRows,
  solveBonusMoves,
  solveMoves,
} from "../src/game/solver";
import type { Move, Placement } from "../src/game/solver";
import { CELL_SYMBOLS } from "../src/levels/parse";
import { findAlternative } from "./alternativeSearch";
import { randomWinChance } from "./difficulty";
import { shortestSolutions } from "./levelGenerator";
import type { Board, Position } from "../src/game/types";
import { LEVELS } from "../src/levels/levels";
import type { LevelDefinition } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";

/** Search a little beyond the declared minimum to report harder levels too. */
export const SEARCH_EXTRA_SHOTS = 2;

export interface SolutionShot {
  /** The player's mirror, if placed just before this shot. */
  placed: Placement[];
  row: number;
  outcome: ShotOutcome;
  /** What the shot did, e.g. "blocked, breaks a wall, flips 2 mirrors". */
  summary: string;
}

/** What a shot did: its outcome, a wall it broke and mirrors it flipped. */
export function describeShot(result: ShotResult): string {
  const { path, outcome } = result;
  const flips = path.filter((step) => step.becomes?.startsWith("mirror"));
  const broke = outcome === "blocked" && path[path.length - 1].becomes;
  const n = flips.length;
  return (
    `${outcome}${broke ? ", breaks a wall" : ""}` +
    `, flips ${n} mirror${n === 1 ? "" : "s"}`
  );
}

export interface LevelAnalysis {
  number: number;
  level: LevelDefinition;
  /** The starting board, with its bonus target if it has one. */
  board: Board;
  /** A shortest solution, or null if none was found. */
  solution: Move[] | null;
  /** The shortest solution played out, shot by shot. */
  solutionShots: SolutionShot[];
  /** How many different shortest solutions there are; 1 is best. */
  shortestCount: number;
  /**
   * An alternative solution within par + SEARCH_EXTRA_SHOTS shots, fewest
   * shots first (findAlternative), or null if there is none.
   */
  alternative: Move[] | null;
  /** Chance that random play completes the level within par (difficulty.ts). */
  randomWinChance: number;
  setupRoutes: [number, number][];
  firstShots: ShotOutcome[];
  /** True if the solver confirms the level's declared minShots. */
  minShotsConfirmed: boolean;
  /**
   * A shortest way to hit the bonus target (undefined if the level has none,
   * null if none was found).
   */
  bonusSolution?: Move[] | null;
  /** True if the solver confirms the level's declared bonusShots. */
  bonusShotsConfirmed: boolean;
}

export function analyzeLevels(): LevelAnalysis[] {
  return LEVELS.map((level, index) => {
    const fullBoard = parseLevel(level.grid);
    // Par is played without bonus targets: they appear only after it.
    const board = withBonuses(fullBoard);
    const { goalHits = 1, playerMirror } = level;
    const solution = solveMoves(board, {
      maxShots: level.minShots + SEARCH_EXTRA_SHOTS,
      goalHits,
      playerMirror,
    });

    const solutionShots: SolutionShot[] = [];
    const { shots } = playMoves(board, solution ?? []);
    let placed: Placement[] = [];
    for (const move of solution ?? []) {
      if (typeof move !== "number") {
        placed.push(move);
        continue;
      }
      const result = shots[solutionShots.length];
      solutionShots.push({
        placed,
        row: move,
        outcome: result.outcome,
        summary: describeShot(result),
      });
      placed = [];
    }

    const [bonus] = bonusPositions(fullBoard);
    const bonusSolution = bonus
      ? solveBonusMoves(fullBoard, bonus, {
          maxShots: (level.bonusShots ?? level.minShots) + SEARCH_EXTRA_SHOTS,
          goalHits,
          playerMirror,
        })
      : undefined;

    return {
      number: index + 1,
      level,
      board: fullBoard,
      solution,
      solutionShots,
      shortestCount:
        solution === null
          ? 0
          : shortestSolutions(
              board,
              shotRows(solution).length,
              goalHits,
              playerMirror,
            ).length,
      alternative: findAlternative(
        board,
        level.minShots,
        SEARCH_EXTRA_SHOTS,
        goalHits,
        playerMirror,
      ),
      randomWinChance: randomWinChance(
        board,
        level.minShots,
        goalHits,
        playerMirror,
      ),
      // Setup routes are about a single goal hit.
      setupRoutes: (level.goalHits ?? 1) === 1 ? setupRoutes(board) : [],
      firstShots: Array.from(
        { length: board.height },
        (_, row) => fire(board, row).outcome,
      ),
      minShotsConfirmed:
        solution !== null && shotRows(solution).length === level.minShots,
      bonusSolution,
      bonusShotsConfirmed:
        !!bonusSolution && shotRows(bonusSolution).length === level.bonusShots,
    };
  });
}

/** A position as the player counts it: (column, row) from 1. */
export function cellName({ x, y }: Position): string {
  return `(${x + 1},${y + 1})`;
}

/**
 * Moves as the player counts them, e.g. [3, {x: 2, y: 0, mirror:
 * "mirrorSlash"}, 1] → "4 → / at (3,1) → 2": rows fired, and the player's
 * mirror placed.
 */
export function rowList(moves: readonly Move[]): string {
  return moves
    .map((move) =>
      typeof move === "number"
        ? move + 1
        : `${CELL_SYMBOLS[move.mirror]} at ${cellName(move)}`,
    )
    .join(" → ");
}

/** The number of shots in `moves`, which may also place the mirror. */
export function shotCount(moves: readonly Move[]): number {
  return shotRows(moves).length;
}
