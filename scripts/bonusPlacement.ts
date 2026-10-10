// Bonus target placement search, used by `npm run bonus`: finds cells where
// a bonus target `*` takes exactly the wanted number of shots, optionally
// after changing a cell or two of the board. Rows and columns are 0-based
// here, like the solver's.

import { withBonuses } from "../src/game/bonus";
import { boardStateKey, fire } from "../src/game/simulate";
import { solve, solveBonus } from "../src/game/solver";
import type { Board, CellType, Position } from "../src/game/types";
import { shortestSolutions } from "./levelGenerator";

export interface PlacementOptions {
  /** The level's par, which every placement keeps. */
  minShots: number;
  goalHits: number;
  /** Shots the bonus target should take: its fewest, from the start. */
  bonusShots: number;
  /** Most board cells to change (0 = place the bonus target only). */
  changes: number;
}

export interface CellChange extends Position {
  cell: CellType;
}

export interface Placement {
  /** Board changes made before placing the bonus target. */
  changes: CellChange[];
  bonus: Position;
  /** The board with the changes and the bonus target. */
  board: Board;
  /** Ways to hit the bonus target in `bonusShots` shots (see firstEntries). */
  routes: number;
  /** A shortest route to the bonus target. */
  route: number[];
}

/** Cell types a board change may put in a cell. */
const CHANGE_CELLS: readonly CellType[] = [
  "empty",
  "mirrorBackslash",
  "mirrorSlash",
  "wall",
  "breakable",
];

function withCell(board: Board, { x, y, cell }: CellChange): Board {
  const cells = board.cells.map((row) => [...row]);
  cells[y][x] = cell;
  return { ...board, cells };
}

/**
 * For every cell the pellet can pass through within `maxShots` shots: the
 * first shot number at which it can, and in how many ways. Ways are counted
 * by the board reached before the last shot and the row fired, so shots
 * that change nothing and setup shots in another order don't count as more
 * ways. Routes stop once they complete the level. Keyed "x,y".
 */
export function firstEntries(
  board: Board,
  maxShots: number,
  goalHits: number,
): Map<string, { shots: number; routes: number }> {
  const entries = new Map<string, { shots: number; routes: number }>();
  type State = { board: Board; hits: number };
  const stateKey = (state: State) =>
    `${state.hits}|${boardStateKey(state.board)}`;
  let frontier: State[] = [{ board, hits: 0 }];
  const seen = new Set([stateKey(frontier[0])]);

  for (let shots = 1; shots <= maxShots && frontier.length > 0; shots++) {
    const next: State[] = [];
    for (const state of frontier) {
      for (let row = 0; row < board.height; row++) {
        const result = fire(state.board, row);
        for (const key of new Set(result.path.map((p) => `${p.x},${p.y}`))) {
          const entry = entries.get(key);
          if (entry === undefined) {
            entries.set(key, { shots, routes: 1 });
          } else if (entry.shots === shots) {
            entry.routes++;
          }
        }
        const after = {
          board: result.board,
          hits: state.hits + (result.outcome === "goal" ? 1 : 0),
        };
        const key = stateKey(after);
        if (after.hits < goalHits && !seen.has(key)) {
          seen.add(key);
          next.push(after);
        }
      }
    }
    frontier = next;
  }
  return entries;
}

/**
 * Bonus target placements for a level's board, fewest routes first (one
 * route is best), then routes firing more different rows, then fewest
 * board changes. Every placement keeps par, the
 * level's current par solution and its number of shortest solutions, and
 * puts the bonus target in an empty cell that the par solution never passes
 * through. Bonus targets already on the board are removed first.
 */
export function findPlacements(
  levelBoard: Board,
  options: PlacementOptions,
): Placement[] {
  const { minShots, goalHits, bonusShots } = options;
  const start = withBonuses(levelBoard);
  const par = solve(start, minShots, goalHits);
  if (par === null) {
    throw new Error(`The level has no solution within ${minShots} shots`);
  }
  const parSolutions = shortestSolutions(start, minShots, goalHits).length;
  const placements: Placement[] = [];

  const evaluate = (board: Board, changes: CellChange[]) => {
    if (changes.length > 0) {
      if (solve(board, minShots - 1, goalHits) !== null) {
        return;
      }
      if (shortestSolutions(board, minShots, goalHits).length > parSolutions) {
        return;
      }
    }
    // The par solution must still complete the level; note where it goes.
    const used = new Set<string>();
    let current = board;
    let hits = 0;
    for (const row of par) {
      const result = fire(current, row);
      result.path.forEach((p) => used.add(`${p.x},${p.y}`));
      hits += result.outcome === "goal" ? 1 : 0;
      current = result.board;
    }
    if (hits < goalHits) {
      return;
    }

    const entries = firstEntries(board, bonusShots, goalHits);
    board.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const entry = entries.get(`${x},${y}`);
        if (
          cell !== "empty" ||
          used.has(`${x},${y}`) ||
          entry?.shots !== bonusShots
        ) {
          return;
        }
        const withBonus = withCell(board, { x, y, cell: "bonus" });
        placements.push({
          changes,
          bonus: { x, y },
          board: withBonus,
          routes: entry.routes,
          route: solveBonus(withBonus, { x, y }, bonusShots, goalHits) ?? [],
        });
      }),
    );
  };

  const changeable: Position[] = [];
  start.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell !== "goal") {
        changeable.push({ x, y });
      }
    }),
  );
  const search = (board: Board, changes: CellChange[], from: number) => {
    evaluate(board, changes);
    if (changes.length >= options.changes) {
      return;
    }
    for (let i = from; i < changeable.length; i++) {
      const { x, y } = changeable[i];
      for (const cell of CHANGE_CELLS) {
        if (cell !== board.cells[y][x]) {
          const change = { x, y, cell };
          search(withCell(board, change), [...changes, change], i + 1);
        }
      }
    }
  };
  search(start, [], 0);

  const variety = (placement: Placement) => new Set(placement.route).size;
  return placements.sort(
    (a, b) =>
      a.routes - b.routes ||
      variety(b) - variety(a) ||
      a.changes.length - b.changes.length,
  );
}
