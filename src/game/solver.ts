import { boardStateKey, fire } from "./simulate";
import type { Board } from "./types";

/**
 * Finds a shortest sequence of rows to fire from that completes the level:
 * `goalHits` shots reaching the goal (each shot can hit it at most once,
 * since the goal stops the beam). Tries every row after every reachable
 * state of board and hits so far (breadth-first). Returns null if there is
 * no solution within `maxShots` shots.
 */
export function solve(
  board: Board,
  maxShots = 6,
  goalHits = 1,
): number[] | null {
  type State = { board: Board; hits: number; rows: number[] };
  const stateKey = (state: Omit<State, "rows">) =>
    `${state.hits}|${boardStateKey(state.board)}`;
  let frontier: State[] = [{ board, hits: 0, rows: [] }];
  const seen = new Set([stateKey(frontier[0])]);

  for (let shots = 1; shots <= maxShots && frontier.length > 0; shots++) {
    const next: State[] = [];
    for (const state of frontier) {
      for (let row = 0; row < board.height; row++) {
        const result = fire(state.board, row);
        const rows = [...state.rows, row];
        const hits = state.hits + (result.outcome === "goal" ? 1 : 0);
        if (hits >= goalHits) {
          return rows;
        }
        const after = { board: result.board, hits, rows };
        const key = stateKey(after);
        if (!seen.has(key)) {
          seen.add(key);
          next.push(after);
        }
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Two-shot "setup" routes: [first, second] row pairs where the first shot
 * misses, and the second wins only because of what the first shot changed
 * (the second row does not win on the original board).
 */
export function setupRoutes(board: Board): [number, number][] {
  const rows = Array.from({ length: board.height }, (_, row) => row);
  const winsAtStart = rows.map((row) => fire(board, row).outcome === "goal");
  const routes: [number, number][] = [];
  for (const first of rows) {
    const shot = fire(board, first);
    if (shot.outcome === "goal") {
      continue;
    }
    for (const second of rows) {
      if (!winsAtStart[second] && fire(shot.board, second).outcome === "goal") {
        routes.push([first, second]);
      }
    }
  }
  return routes;
}
