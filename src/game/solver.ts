import { canPlaceAt, placeMirror, placementPositions } from "./placement";
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
 * board after the last move. Throws if a move places the player's mirror
 * on a cell that is not empty.
 */
export function playMoves(
  board: Board,
  moves: readonly Move[],
): { shots: ShotResult[]; board: Board } {
  const played = tryPlayMoves(board, moves);
  if (played === null) {
    throw new Error(
      "A move places the player's mirror on a cell that is not empty",
    );
  }
  return played;
}

/**
 * Like playMoves(), but null instead of throwing if a move places the
 * player's mirror on a cell that is not empty.
 */
export function tryPlayMoves(
  board: Board,
  moves: readonly Move[],
): { shots: ShotResult[]; board: Board } | null {
  const shots: ShotResult[] = [];
  let current = board;
  for (const move of moves) {
    if (typeof move === "number") {
      const result = fire(current, move);
      shots.push(result);
      current = result.board;
    } else if (canPlaceAt(current, move)) {
      current = placeMirror(current, move, move.mirror);
    } else {
      return null;
    }
  }
  return { shots, board: current };
}

/**
 * True if playing `moves` from `board` completes the level: `goalHits` of
 * its shots reach the goal. Moves after the shot that completes it are not
 * played. False if a move before that can't be played (the player's mirror
 * on a cell that is not empty).
 */
export function completesLevel(
  board: Board,
  moves: readonly Move[],
  goalHits: number,
): boolean {
  let current = board;
  let hits = 0;
  for (const move of moves) {
    if (typeof move !== "number") {
      if (!canPlaceAt(current, move)) {
        return false;
      }
      current = placeMirror(current, move, move.mirror);
      continue;
    }
    const result = fire(current, move);
    hits += result.outcome === "goal" ? 1 : 0;
    if (hits >= goalHits) {
      return true;
    }
    current = result.board;
  }
  return false;
}

/**
 * Every way to place the player's `mirror` on `board` (a free move, on any
 * empty cell, in reading order): the move and the board after it. The
 * searches offer these before each shot while the mirror is in hand.
 */
export function mirrorPlacements(
  board: Board,
  mirror: MirrorType,
): { move: Placement; board: Board }[] {
  return placementPositions(board).map((position) => ({
    move: { ...position, mirror },
    board: placeMirror(board, position, mirror),
  }));
}

/** A sequence of moves that completes a level, and its shots' results. */
export interface Completion {
  moves: Move[];
  shots: ShotResult[];
}

/**
 * Every sequence of moves that completes the level with its last shot,
 * within `maxShots` shots, depth first: before each shot, the board as it
 * is first, then (while the player's mirror is in hand) with the mirror
 * placed on each empty cell; then the rows from the top. Sequences that
 * play out the same are all listed, so callers remove the ones they count
 * as the same. Searches all sequences, so keep `maxShots` small, or stop
 * early.
 */
export function* eachCompletion(
  board: Board,
  maxShots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): Generator<Completion> {
  function* search(
    current: Board,
    inHand: boolean,
    hits: number,
    moves: Move[],
    shots: ShotResult[],
  ): Generator<Completion> {
    const choices: { board: Board; placed: Move[]; inHand: boolean }[] = [
      { board: current, placed: [], inHand },
    ];
    if (inHand && playerMirror !== undefined) {
      for (const placement of mirrorPlacements(current, playerMirror)) {
        choices.push({
          board: placement.board,
          placed: [placement.move],
          inHand: false,
        });
      }
    }
    for (const choice of choices) {
      for (let row = 0; row < board.height; row++) {
        const result = fire(choice.board, row);
        const newHits = hits + (result.outcome === "goal" ? 1 : 0);
        const newMoves = [...moves, ...choice.placed, row];
        const newShots = [...shots, result];
        if (newHits >= goalHits) {
          yield { moves: newMoves, shots: newShots };
        } else if (newShots.length < maxShots) {
          yield* search(
            result.board,
            choice.inHand,
            newHits,
            newMoves,
            newShots,
          );
        }
      }
    }
  }
  yield* search(board, playerMirror !== undefined, 0, [], []);
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
      for (const placement of mirrorPlacements(state.board, playerMirror)) {
        const variant = {
          board: placement.board,
          hits: state.hits,
          inHand: false,
          moves: [...state.moves, placement.move],
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
