// Random level search, used by `npm run generate`: makes random boards and
// keeps the ones the solver says need exactly the wanted number of shots.
// Rows are 0-based here, like the solver's.

import { fire } from "../src/game/simulate";
import {
  eachCompletion,
  setupRoutes,
  shotRows,
  solve,
} from "../src/game/solver";
import type { Move } from "../src/game/solver";
import type { Board, CellType, MirrorType } from "../src/game/types";
import { formatLevel } from "../src/levels/parse";
import { findAlternative, pathKey } from "./alternativeSearch";

export interface GeneratorOptions {
  width: number;
  height: number;
  mirrors: number;
  walls: number;
  /**
   * Breakable walls. With any, only boards that need one broken for par
   * are kept (as solid walls, par would be higher).
   */
  breakable: number;
  /**
   * Reflectors. With any, only boards that need one for par are kept (with
   * them made walls, par would be higher).
   */
  reflectors: number;
  /**
   * Glass mirrors. With any, only boards that need one shattered for par
   * are kept (as ordinary mirrors, par would be higher).
   */
  glass: number;
  /**
   * A mirror the player may place on any empty cell. With one, only boards
   * that need it placed for par are kept.
   */
  playerMirror?: MirrorType;
  /** Reject boards where a shortest solution places the mirror before the first shot. */
  placeLater: boolean;
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
  /**
   * Every shortest solution (rows fired and mirrors placed); the best
   * levels have exactly one.
   */
  solutions: Move[][];
  /** Rows whose first shot reaches the goal on the starting board. */
  rowsHittingAtStart: number;
  setupRoutes: [number, number][];
  /** An alternative solution above par, once withAlternatives() found it. */
  alternative?: Move[];
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
 * A random board: the goal somewhere in the rightmost column, mirrors,
 * walls, breakable walls, reflectors and glass mirrors in random empty
 * cells left of it.
 * Asks for no more pieces than fit.
 */
export function randomBoard(
  options: Pick<
    GeneratorOptions,
    | "width"
    | "height"
    | "mirrors"
    | "walls"
    | "breakable"
    | "reflectors"
    | "glass"
  >,
  random: () => number,
): Board {
  const { width, height, mirrors, walls, breakable } = options;
  const { reflectors, glass } = options;
  if (mirrors + walls + breakable + reflectors + glass > (width - 1) * height) {
    throw new Error("Too many pieces for the board size");
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
  place(() => "breakable", breakable);
  place(() => "reflector", reflectors);
  place(() => (random() < 0.5 ? "glassBackslash" : "glassSlash"), glass);
  return { width, height, cells };
}

/** The board with every cell of type `cell` made a wall. */
export function withWalls(board: Board, cell: CellType): Board {
  return {
    ...board,
    cells: board.cells.map((row) => row.map((c) => (c === cell ? "wall" : c))),
  };
}

/** The board with every glass mirror made an ordinary mirror. */
export function withSolidGlass(board: Board): Board {
  const solid: Partial<Record<CellType, CellType>> = {
    glassBackslash: "mirrorBackslash",
    glassSlash: "mirrorSlash",
  };
  return {
    ...board,
    cells: board.cells.map((row) => row.map((c) => solid[c] ?? c)),
  };
}

/** The board with every breakable wall made solid. */
export function withSolidWalls(board: Board): Board {
  return withWalls(board, "breakable");
}

/**
 * Every sequence of exactly `shots` shots that completes the level on its
 * last shot, placing `playerMirror` (if given) on an empty cell before any
 * of them (searches all sequences, so keep `shots` small). Solutions that
 * play out the same, shot by shot, count once: placing the mirror earlier
 * than needed, or where no shot passes, is not a different solution.
 */
export function shortestSolutions(
  board: Board,
  shots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): Move[][] {
  const solutions = new Map<string, Move[]>();
  for (const completion of eachCompletion(
    board,
    shots,
    goalHits,
    playerMirror,
  )) {
    const key = completion.shots.map(pathKey).join("|");
    if (completion.shots.length === shots && !solutions.has(key)) {
      solutions.set(key, completion.moves);
    }
  }
  return [...solutions.values()];
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
    const { shots, goalHits, playerMirror } = options;
    const solution = solve(board, shots, goalHits, playerMirror);
    if (solution?.length !== options.shots) {
      continue;
    }
    if (
      options.breakable > 0 &&
      solve(withSolidWalls(board), shots, goalHits, playerMirror) !== null
    ) {
      continue;
    }
    if (
      options.reflectors > 0 &&
      solve(withWalls(board, "reflector"), shots, goalHits, playerMirror) !==
        null
    ) {
      continue;
    }
    if (
      options.glass > 0 &&
      solve(withSolidGlass(board), shots, goalHits, playerMirror) !== null
    ) {
      continue;
    }
    if (playerMirror !== undefined && solve(board, shots, goalHits) !== null) {
      continue;
    }
    const solutions = shortestSolutions(board, shots, goalHits, playerMirror);
    if (
      options.noRepeat &&
      solutions
        .map(shotRows)
        .some((rows) => rows.some((row, j) => row === rows[j - 1]))
    ) {
      continue;
    }
    if (
      options.placeLater &&
      solutions.some((moves) => typeof moves[0] !== "number")
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

/**
 * The first `count` candidates, in order, that have an alternative solution
 * within par + `extraShots` shots (see findAlternative), each with it.
 * Checks candidates only until it has `count`, since the check is slow
 * next to finding them.
 */
export function withAlternatives(
  candidates: readonly Candidate[],
  options: Pick<GeneratorOptions, "shots" | "goalHits" | "playerMirror">,
  extraShots: number,
  count: number,
): Candidate[] {
  const kept: Candidate[] = [];
  for (const candidate of candidates) {
    if (kept.length >= count) {
      break;
    }
    const alternative = findAlternative(
      candidate.board,
      options.shots,
      extraShots,
      options.goalHits,
      options.playerMirror,
    );
    if (alternative !== null) {
      kept.push({ ...candidate, alternative });
    }
  }
  return kept;
}
