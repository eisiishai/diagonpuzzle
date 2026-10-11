// Bonus target placement search, used by `npm run bonus`: finds cells where
// a bonus target `*` takes exactly the wanted number of shots, optionally
// after changing a cell or two of the board. Rows and columns are 0-based
// here, like the solver's.

import { cellPositions, withCell } from "../src/game/board";
import type { CellChange } from "../src/game/board";
import { withBonuses } from "../src/game/bonus";
import { boardStateKey, fire } from "../src/game/simulate";
import type { ShotResult } from "../src/game/simulate";
import {
  mirrorPlacements,
  playMoves,
  shotRows,
  solve,
  solveBonusMoves,
  solveMoves,
  tryPlayMoves,
} from "../src/game/solver";
import type { Move } from "../src/game/solver";
import type { Board, CellType, MirrorType, Position } from "../src/game/types";
import { shortestSolutions } from "./levelGenerator";

export interface PlacementOptions {
  /** The level's par, which every placement keeps. */
  minShots: number;
  goalHits: number;
  /** Shots the bonus target should take: its fewest, from the start. */
  bonusShots: number;
  /** Most board cells to change (0 = place the bonus target only). */
  changes: number;
  /** The mirror the player may place, if the level gives one. */
  playerMirror?: MirrorType;
  /**
   * Keep only placements whose route passes through a cell holding one of
   * these pieces on the placement's board (e.g. a reflector, or a glass
   * mirror or the gap it leaves), so the bonus target uses them too.
   */
  uses?: readonly CellType[];
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
  route: Move[];
}

/** Cell types a board change may put in a cell. */
const CHANGE_CELLS: readonly CellType[] = [
  "empty",
  "mirrorBackslash",
  "mirrorSlash",
  "wall",
  "breakable",
];

/**
 * The cells that playing `moves` reaches, keyed "x,y": the paths of its
 * `shots` and where it places the player's mirror.
 */
function reachedCells(
  moves: readonly Move[],
  shots: readonly ShotResult[],
): Set<string> {
  const cells = new Set<string>();
  for (const move of moves) {
    if (typeof move !== "number") {
      cells.add(`${move.x},${move.y}`);
    }
  }
  for (const { path } of shots) {
    path.forEach(({ x, y }) => cells.add(`${x},${y}`));
  }
  return cells;
}

/**
 * For every cell the pellet can pass through within `maxShots` shots: the
 * first shot number at which it can, and in how many ways. Ways are counted
 * by the board reached before the last shot and the row fired, so shots
 * that change nothing and setup shots in another order don't count as more
 * ways; nor does placing the player's mirror where no shot ever passes.
 * Routes stop once they complete the level. Keyed "x,y".
 */
export function firstEntries(
  board: Board,
  maxShots: number,
  goalHits: number,
  playerMirror?: MirrorType,
): Map<string, { shots: number; routes: number }> {
  const entries = new Map<string, { shots: number; routes: Set<string> }>();
  type State = {
    board: Board;
    hits: number;
    inHand: boolean;
    /** Where the player's mirror was placed, while no shot has passed it. */
    untouched?: Position;
  };
  const stateKey = (state: State) =>
    `${state.hits}|${state.inHand}|${boardStateKey(state.board)}`;
  let frontier: State[] = [
    { board, hits: 0, inHand: playerMirror !== undefined },
  ];
  const seen = new Set([stateKey(frontier[0])]);

  for (let shots = 1; shots <= maxShots && frontier.length > 0; shots++) {
    const next: State[] = [];
    const choices = [...frontier];
    for (const state of frontier) {
      if (state.inHand && playerMirror !== undefined) {
        for (const placement of mirrorPlacements(state.board, playerMirror)) {
          choices.push({
            board: placement.board,
            hits: state.hits,
            inHand: false,
            untouched: { x: placement.move.x, y: placement.move.y },
          });
        }
      }
    }
    for (const state of choices) {
      for (let row = 0; row < board.height; row++) {
        const result = fire(state.board, row);
        const cells = new Set(result.path.map((p) => `${p.x},${p.y}`));
        let untouched = state.untouched;
        if (untouched && cells.has(`${untouched.x},${untouched.y}`)) {
          untouched = undefined;
        }
        // A mirror no shot has passed plays as if still in hand.
        const before = untouched
          ? withCell(state.board, { ...untouched, cell: "empty" })
          : state.board;
        const route = `${boardStateKey(before)}|${row}`;
        for (const key of cells) {
          const entry = entries.get(key);
          if (entry === undefined) {
            entries.set(key, { shots, routes: new Set([route]) });
          } else if (entry.shots === shots) {
            entry.routes.add(route);
          }
        }
        const after: State = {
          board: result.board,
          hits: state.hits + (result.outcome === "goal" ? 1 : 0),
          inHand: state.inHand,
          untouched,
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
  return new Map(
    [...entries].map(([key, { shots, routes }]) => [
      key,
      { shots, routes: routes.size },
    ]),
  );
}

/**
 * Bonus target placements for a level's board, fewest routes first (one
 * route is best), then routes firing more different rows, then fewest
 * board changes. Every placement keeps par, the
 * level's current par solution and its number of shortest solutions, and
 * puts the bonus target in an empty cell that the par solution never passes
 * through. Board changes only touch cells the par solution never reaches
 * (neither its paths nor where it places the player's mirror), so it plays
 * out exactly as before, cell by cell. Bonus targets already on the board
 * are removed first.
 */
export function findPlacements(
  levelBoard: Board,
  options: PlacementOptions,
): Placement[] {
  const { minShots, goalHits, bonusShots, playerMirror } = options;
  const solveOptions = { maxShots: minShots, goalHits, playerMirror };
  const start = withBonuses(levelBoard);
  const par = solveMoves(start, solveOptions);
  if (par === null) {
    throw new Error(`The level has no solution within ${minShots} shots`);
  }
  const solutionCount = (board: Board) =>
    shortestSolutions(board, minShots, goalHits, playerMirror).length;
  const parSolutions = solutionCount(start);
  const placements: Placement[] = [];
  const usesPiece = (board: Board, route: Move[]) =>
    options.uses === undefined ||
    playMoves(board, route).shots.some((shot) =>
      shot.path.some(({ x, y }) => options.uses!.includes(board.cells[y][x])),
    );

  const evaluate = (board: Board, changes: CellChange[]) => {
    // The par solution must still complete the level; note where it goes.
    const played = tryPlayMoves(board, par);
    const hits = (shots: ShotResult[]) =>
      shots.filter((shot) => shot.outcome === "goal").length;
    if (played === null || hits(played.shots) < goalHits) {
      return;
    }
    const used = reachedCells(par, played.shots);

    // Cells for the bonus target first: most changed boards have none, and
    // checking that a change keeps par is the slow part.
    const entries = firstEntries(board, bonusShots, goalHits, playerMirror);
    const cells: (Position & { routes: number })[] = [];
    board.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const entry = entries.get(`${x},${y}`);
        if (
          cell === "empty" &&
          !used.has(`${x},${y}`) &&
          entry?.shots === bonusShots
        ) {
          cells.push({ x, y, routes: entry.routes });
        }
      }),
    );
    if (cells.length === 0) {
      return;
    }
    if (changes.length > 0) {
      if (solve(board, minShots - 1, goalHits, playerMirror) !== null) {
        return;
      }
      if (solutionCount(board) > parSolutions) {
        return;
      }
    }

    for (const { x, y, routes } of cells) {
      const withBonus = withCell(board, { x, y, cell: "bonus" });
      const route =
        solveBonusMoves(
          withBonus,
          { x, y },
          { maxShots: bonusShots, goalHits, playerMirror },
        ) ?? [];
      if (usesPiece(withBonus, route)) {
        placements.push({
          changes,
          bonus: { x, y },
          board: withBonus,
          routes,
          route,
        });
      }
    }
  };

  // Cells the par solution reaches: its paths and the player's mirror.
  const parCells = reachedCells(par, playMoves(start, par).shots);
  const changeable = cellPositions(
    start,
    (cell, { x, y }) => cell !== "goal" && !parCells.has(`${x},${y}`),
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

  const variety = (placement: Placement) =>
    new Set(shotRows(placement.route)).size;
  return placements.sort(
    (a, b) =>
      a.routes - b.routes ||
      variety(b) - variety(a) ||
      a.changes.length - b.changes.length,
  );
}
