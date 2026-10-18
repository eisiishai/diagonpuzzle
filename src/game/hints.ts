import { solveMoves } from "./solver";
import type { SolveOptions } from "./solver";
import type { Board } from "./types";

/** The second hint: how a par solution starts (see docs/DESIGN.md, Hints). */
export interface FirstShotHint {
  /** The row of a par solution's first shot. */
  row: number;
  /**
   * The solution places the player's mirror before that shot. The hint
   * says so without giving the cell, which is the puzzle.
   */
  placeFirst: boolean;
}

/**
 * The first shot of a par solution from `board` (the level's starting
 * board, bonus targets hidden as before par), or null if there is none
 * within `par` shots.
 */
export function firstShotHint(
  board: Board,
  par: number,
  options: Omit<SolveOptions, "maxShots"> = {},
): FirstShotHint | null {
  const moves = solveMoves(board, { ...options, maxShots: par });
  if (moves === null) {
    return null;
  }
  const first = moves.findIndex((move) => typeof move === "number");
  return { row: moves[first] as number, placeFirst: first > 0 };
}
