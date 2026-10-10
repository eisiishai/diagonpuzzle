import { placeMirror, placementPositions } from "./placement";
import { boardStateKey, fire } from "./simulate";
import type { ShotResult } from "./simulate";
import type { Board, MirrorType, Position } from "./types";

/** Placing the player's mirror on an empty cell (takes no shot). */
export interface Placement extends Position {
  mirror: MirrorType;
}

/** One move of a solution: a row to fire from, or placing the mirror. */
export type Move = number | Placement;

/** The rows fired in `moves`, leaving out the mirror placement. */
export function shotRows(moves: readonly Move[]): number[] {
  return moves.filter((move): move is number => typeof move === "number");
}

/**
 * Plays `moves` from `board`: the result of each shot, in order, and the
 * board after the last move.
 */
export function playMoves(
  board: Board,
  moves: readonly Move[],
): { shots: ShotResult[]; board: Board } {
  const shots: ShotResult[] = [];
  let current = board;
  for (const move of moves) {
    if (typeof move === "number") {
      const result = fire(current, move);
      shots.push(result);
      current = result.board;
    } else {
      current = placeMirror(current, move, move.mirror);
    }
  }
  return { shots, board: current };
}

/** What a level gives the solver to work with besides the board. */
export interface SolveOptions {
  /** Most shots to search. */
  maxShots?: number;
  /** Goal hits needed to complete the level. */
  goalHits?: number;
  /** The mirror the player may place on any empty cell, if any. */
  playerMirror?: MirrorType;
}

/**
 * Breadth-first search over shots, shared by the solvers. Before any shot,
 * the player's mirror (if the level gives one and it is still in hand) may
 * be placed on any empty cell, a free move. A shot for which `wins` is true
 * ends the search; completing the level otherwise is a dead end. Returns the
 * shortest winning moves (fewest shots), or null if none within `maxShots`.
 */
function search(
  board: Board,
  { maxShots = 6, goalHits = 1, playerMirror }: SolveOptions,
  wins: (result: ShotResult, hits: number) => boolean,
): Move[] | null {
  type State = { board: Board; hits: number; inHand: boolean; moves: Move[] };
  const stateKey = (state: Omit<State, "moves">) =>
    `${state.hits}|${state.inHand}|${boardStateKey(state.board)}`;
  let frontier: State[] = [
    { board, hits: 0, inHand: playerMirror !== undefined, moves: [] },
  ];
  const seen = new Set([stateKey(frontier[0])]);

  for (let shots = 1; shots <= maxShots && frontier.length > 0; shots++) {
    // Placing the mirror takes no shot, so states with it placed join this
    // round, before any state reached by this round's shots is seen.
    const placed: State[] = [];
    for (const state of frontier) {
      if (!state.inHand || playerMirror === undefined) {
        continue;
      }
      for (const position of placementPositions(state.board)) {
        const variant = {
          board: placeMirror(state.board, position, playerMirror),
          hits: state.hits,
          inHand: false,
          moves: [...state.moves, { ...position, mirror: playerMirror }],
        };
        const key = stateKey(variant);
        if (!seen.has(key)) {
          seen.add(key);
          placed.push(variant);
        }
      }
    }

    const next: State[] = [];
    for (const state of [...frontier, ...placed]) {
      for (let row = 0; row < board.height; row++) {
        const result = fire(state.board, row);
        const moves = [...state.moves, row];
        const hits = state.hits + (result.outcome === "goal" ? 1 : 0);
        if (wins(result, hits)) {
          return moves;
        }
        if (hits >= goalHits) {
          continue;
        }
        const after = { ...state, board: result.board, hits, moves };
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
 * Finds a shortest sequence of moves that completes the level: `goalHits`
 * shots reaching the goal (each shot can hit it at most once, since the
 * goal stops the beam), placing the player's mirror where that helps.
 * Tries every row after every reachable state of board, hits so far and
 * mirror in hand (breadth-first). Returns null if there is no solution
 * within `maxShots` shots.
 */
export function solveMoves(
  board: Board,
  options: SolveOptions = {},
): Move[] | null {
  const goalHits = options.goalHits ?? 1;
  return search(board, options, (_, hits) => hits >= goalHits);
}

/** The rows fired by solveMoves()' solution, or null if there is none. */
export function solve(
  board: Board,
  maxShots = 6,
  goalHits = 1,
  playerMirror?: MirrorType,
): number[] | null {
  const moves = solveMoves(board, { maxShots, goalHits, playerMirror });
  return moves && shotRows(moves);
}

/**
 * Two-shot "setup" routes: [first, second] row pairs where the first shot
 * misses, and the second wins only because of what the first shot changed
 * (the second row does not win on the original board). Shots only: a
 * player-placed mirror is not used.
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

/**
 * Finds a shortest sequence of moves that hits the bonus target at `bonus`,
 * starting from `board` (which has it). Completing the level ends the try,
 * so the last goal hit is a dead end; earlier hits of a multi-hit goal are
 * allowed. Returns null if there is no such sequence within `maxShots`.
 */
export function solveBonusMoves(
  board: Board,
  bonus: Position,
  options: SolveOptions = {},
): Move[] | null {
  return search(board, options, (result) => {
    const end = result.path[result.path.length - 1];
    return result.outcome === "bonus" && end.x === bonus.x && end.y === bonus.y;
  });
}

/** The rows fired by solveBonusMoves()' route, or null if there is none. */
export function solveBonus(
  board: Board,
  bonus: Position,
  maxShots = 6,
  goalHits = 1,
  playerMirror?: MirrorType,
): number[] | null {
  const moves = solveBonusMoves(board, bonus, {
    maxShots,
    goalHits,
    playerMirror,
  });
  return moves && shotRows(moves);
}
