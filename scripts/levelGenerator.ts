// Random level search, used by `npm run generate`: makes random boards and
// keeps the ones the solver says need exactly the wanted number of shots.
// Rows are 0-based here, like the solver's.

import { fire } from "../src/game/simulate";
import { setupRoutes, solve } from "../src/game/solver";
import type { Board, CellType } from "../src/game/types";
import { formatLevel } from "../src/levels/parse";

export interface GeneratorOptions {
  width: number;
  height: number;
  mirrors: number;
  walls: number;
  /** The par: fewest shots that complete the level. */
  shots: number;
  /** Goal hits needed to complete the level. */
  goalHits: number;
  /** Random boards to try. */
  tries: number;
  /** Same seed and options → same boards. */
  seed: number;
  /** Only keep boards that also have a two-shot setup route (par 1 levels). */
  requireSetup: boolean;
  /** Reject boards where a shortest solution fires the same row twice in a row. */
  noRepeat: boolean;
}

export interface Candidate {
  board: Board;
  /** Every shortest solution; the best levels have exactly one. */
  solutions: number[][];
  /** Rows whose first shot reaches the goal on the starting board. */
  rowsHittingAtStart: number;
  setupRoutes: [number, number][];
}

/** A small, seedable random number generator (xorshift32), giving [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/**
 * A random board: the goal somewhere in the rightmost column, mirrors and
 * walls in random empty cells left of it. Asks for no more pieces than fit.
 */
export function randomBoard(
  options: Pick<GeneratorOptions, "width" | "height" | "mirrors" | "walls">,
  random: () => number,
): Board {
  const { width, height, mirrors, walls } = options;
  if (mirrors + walls > (width - 1) * height) {
    throw new Error("Too many mirrors and walls for the board size");
  }
  const cells: CellType[][] = Array.from({ length: height }, () =>
    Array<CellType>(width).fill("empty"),
  );
  cells[Math.floor(random() * height)][width - 1] = "goal";

  const place = (pick: () => CellType, count: number) => {
    for (let placed = 0; placed < count;) {
      const x = Math.floor(random() * (width - 1));
      const y = Math.floor(random() * height);
      if (cells[y][x] === "empty") {
        cells[y][x] = pick();
        placed++;
      }
    }
  };
  place(() => (random() < 0.5 ? "mirrorBackslash" : "mirrorSlash"), mirrors);
  place(() => "wall", walls);
  return { width, height, cells };
}

/**
 * Every sequence of exactly `shots` rows that completes the level on its
 * last shot (searches all sequences, so keep `shots` small).
 */
export function shortestSolutions(
  board: Board,
  shots: number,
  goalHits = 1,
): number[][] {
  const solutions: number[][] = [];
  const search = (current: Board, hits: number, rows: number[]) => {
    for (let row = 0; row < board.height; row++) {
      const result = fire(current, row);
      const newHits = hits + (result.outcome === "goal" ? 1 : 0);
      const newRows = [...rows, row];
      if (newHits >= goalHits) {
        if (newRows.length === shots) {
          solutions.push(newRows);
        }
      } else if (newRows.length < shots) {
        search(result.board, newHits, newRows);
      }
    }
  };
  search(board, 0, []);
  return solutions;
}

/**
 * Tries random boards and returns the different ones whose par is exactly
 * `shots`, best first: fewest shortest solutions (a unique one is best),
 * then fewest rows that reach the goal with the first shot.
 */
export function findCandidates(options: GeneratorOptions): Candidate[] {
  const random = createRandom(options.seed);
  const found = new Map<string, Candidate>();

  for (let i = 0; i < options.tries; i++) {
    const board = randomBoard(options, random);
    const key = formatLevel(board);
    if (found.has(key)) {
      continue;
    }
    const solution = solve(board, options.shots, options.goalHits);
    if (solution?.length !== options.shots) {
      continue;
    }
    const solutions = shortestSolutions(board, options.shots, options.goalHits);
    if (
      options.noRepeat &&
      solutions.some((rows) => rows.some((row, j) => row === rows[j - 1]))
    ) {
      continue;
    }
    const routes = options.goalHits === 1 ? setupRoutes(board) : [];
    if (options.requireSetup && routes.length === 0) {
      continue;
    }
    found.set(key, {
      board,
      solutions,
      rowsHittingAtStart: Array.from(
        { length: board.height },
        (_, row) => fire(board, row).outcome === "goal",
      ).filter(Boolean).length,
      setupRoutes: routes,
    });
  }

  return [...found.values()].sort(
    (a, b) =>
      a.solutions.length - b.solutions.length ||
      a.rowsHittingAtStart - b.rowsHittingAtStart,
  );
}
