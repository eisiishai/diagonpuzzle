import { boardStateKey, fire } from "./simulate";
import type { Board } from "./types";

/**
 * Finds a shortest sequence of rows to fire from that reaches the goal,
 * trying every row after every reachable board state (breadth-first).
 * Returns null if there is no solution within `maxShots` shots.
 */
export function solve(board: Board, maxShots = 6): number[] | null {
  let frontier: { board: Board; rows: number[] }[] = [{ board, rows: [] }];
  const seen = new Set([boardStateKey(board)]);

  for (let shots = 1; shots <= maxShots && frontier.length > 0; shots++) {
    const next: typeof frontier = [];
    for (const state of frontier) {
      for (let row = 0; row < board.height; row++) {
        const result = fire(state.board, row);
        const rows = [...state.rows, row];
        if (result.outcome === "goal") {
          return rows;
        }
        const key = boardStateKey(result.board);
        if (!seen.has(key)) {
          seen.add(key);
          next.push({ board: result.board, rows });
        }
      }
    }
    frontier = next;
  }
  return null;
}
