// Alternative solution search, used by `npm run alternatives`: lists the
// different ways to complete a level within a few shots of par, and finds
// small board changes that add new ones while keeping par, the par
// solution and the bonus target as they are. Rows and columns are 0-based
// here, like the solver's.

import { boardHas, withCell } from "../src/game/board";
import type { CellChange } from "../src/game/board";
import { bonusPositions, withBonuses } from "../src/game/bonus";
import {
  FIXED_MIRRORS,
  GATE_CELLS,
  GLASS_MIRRORS,
  MIRRORS,
} from "../src/game/cells";
import type { ShotResult } from "../src/game/simulate";
import {
  completesLevel,
  eachCompletion,
  shotRows,
  solve,
  solveBonusMoves,
  solveMoves,
  tryPlayMoves,
} from "../src/game/solver";
import type { Move } from "../src/game/solver";
import type { Board, CellType, MirrorType, Position } from "../src/game/types";
import { randomWinChance } from "./difficulty";
import { neededPieces } from "./pieces";

/**
 * True if every move of a solution is needed: leaving out any one shot (or
 * the mirror placement) no longer completes the level.
 */
export function isEssential(
  board: Board,
  moves: readonly Move[],
  goalHits: number,
): boolean {
  return moves.every(
    (_, i) =>
      !completesLevel(
        board,
        [...moves.slice(0, i), ...moves.slice(i + 1)],
        goalHits,
      ),
  );
}

/**
 * Every different way to complete the level within `maxShots` shots, as
 * they are found (not in order of shots). Only solutions without a wasted
 * move count (isEssential), and solutions whose shots take the same paths,
 * in any order, count once (so firing two independent shots the other way
 * round, or placing the mirror earlier, is not another solution). Searches
 * all sequences, so keep `maxShots` small, or stop early.
 */
function* eachSolution(
  board: Board,
  maxShots: number,
  goalHits: number,
  playerMirror?: MirrorType,
): Generator<Move[]> {
  const seen = new Set<string>();
  for (const { moves, shots } of eachCompletion(
    board,
    maxShots,
    goalHits,
    playerMirror,
  )) {
    const key = shots.map(pathKey).sort().join("|");
    if (!seen.has(key) && isEssential(board, moves, goalHits)) {
      seen.add(key);
      yield moves;
    }
  }
}

/** The cells a shot passes through, in order, as a string. */
export function pathKey({ path }: ShotResult): string {
  return path.map((p) => `${p.x},${p.y}`).join(" ");
}

/**
 * Every different way to complete the level within `maxShots` shots, fewest
 * shots first (see eachSolution for what counts as different).
 */
export function alternativeSolutions(
  board: Board,
  maxShots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): Move[][] {
  return [...eachSolution(board, maxShots, goalHits, playerMirror)].sort(
    (a, b) => shotRows(a).length - shotRows(b).length,
  );
}

/**
 * An alternative solution above par: a way to complete the level in
 * `minShots` + 1 shots, else in + 2 and so on up to + `extraShots`, with no
 * wasted move. Fewest shots first, so a player who strays from the par
 * route loses as little as possible. Null if there is none. Stops at the
 * first one found, so it is much faster than alternativeSolutions().
 */
export function findAlternative(
  board: Board,
  minShots: number,
  extraShots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): Move[] | null {
  for (let shots = minShots + 1; shots <= minShots + extraShots; shots++) {
    for (const moves of eachSolution(board, shots, goalHits, playerMirror)) {
      if (shotRows(moves).length === shots) {
        return moves;
      }
    }
  }
  return null;
}

export interface AlternativeOptions {
  /** The level's par, which every change keeps. */
  minShots: number;
  goalHits: number;
  /** Fewest shots to the bonus target, which every change keeps. */
  bonusShots?: number;
  playerMirror?: MirrorType;
  /** Look for solutions up to par + this many shots. */
  extraShots: number;
  /** Most board cells to change, 1 or 2. */
  changes: number;
}

export interface AlternativeChange {
  changes: CellChange[];
  /** The changed board, with the bonus target if the level has one. */
  board: Board;
  /** Solutions the changed board has that the level did not, fewest shots first. */
  added: Move[][];
  /** How many of `added` take only par shots (each one makes par easier). */
  addedAtPar: number;
  /** Chance that random play completes the changed level within par. */
  randomWinChance: number;
}

/** The paths and outcomes of `moves`' shots, or null if a move can't be played. */
function playedShots(board: Board, moves: readonly Move[]): string | null {
  const played = tryPlayMoves(board, moves);
  return (
    played?.shots.map((shot) => `${pathKey(shot)} ${shot.outcome}`).join("|") ??
    null
  );
}

/**
 * Board changes of up to `changes` cells that give the level new
 * alternative solutions within par + `extraShots` shots, fewest new
 * solutions at par first (those make the level easier), then fewest new
 * solutions, then fewest changes. Every change keeps par, plays the level's
 * par solution exactly as before (so it only touches cells that solution
 * never reaches), keeps the pieces par needs (see neededPieces) and keeps
 * the bonus target where it is, still taking `bonusShots` shots. Changes
 * may put an empty cell, a mirror or a wall in any cell but the goal and
 * the bonus target (or a portal, as they come in pairs), and a breakable
 * wall, a reflector, glass mirrors, fixed mirrors or one-way gates only in
 * levels that already have one.
 */
export function findAlternativeChanges(
  levelBoard: Board,
  options: AlternativeOptions,
): AlternativeChange[] {
  const { minShots, goalHits, bonusShots, playerMirror, extraShots } = options;
  const solveOptions = { maxShots: minShots, goalHits, playerMirror };
  const start = withBonuses(levelBoard);
  const par = solveMoves(start, solveOptions);
  if (par === null) {
    throw new Error(`The level has no solution within ${minShots} shots`);
  }
  const parShots = playedShots(start, par);
  const [bonus] = bonusPositions(levelBoard);
  const maxShots = minShots + extraShots;
  const known = new Set(
    alternativeSolutions(start, maxShots, goalHits, playerMirror).map((moves) =>
      JSON.stringify(moves),
    ),
  );
  const cellTypes: CellType[] = ["empty", ...MIRRORS, "wall"];
  const pieces: (readonly CellType[])[] = [
    ["breakable"],
    ["reflector"],
    GLASS_MIRRORS,
    FIXED_MIRRORS,
    GATE_CELLS,
  ];
  // Pieces the level already has may go elsewhere too.
  for (const piece of pieces) {
    if (boardHas(levelBoard, piece)) {
      cellTypes.push(...piece);
    }
  }

  // Pieces the level is built around must stay needed for par.
  const needed = neededPieces(start, minShots, goalHits, playerMirror);
  const found: AlternativeChange[] = [];
  const evaluate = (board: Board, changes: CellChange[]) => {
    const played = withBonuses(board);
    if (solve(played, minShots - 1, goalHits, playerMirror) !== null) {
      return;
    }
    const still = neededPieces(played, minShots, goalHits, playerMirror);
    if (!needed.every((piece) => still.includes(piece))) {
      return;
    }
    if (bonus && bonusShots !== undefined) {
      const route = solveBonusMoves(board, bonus, {
        maxShots: bonusShots,
        goalHits,
        playerMirror,
      });
      if (route === null || shotRows(route).length !== bonusShots) {
        return;
      }
    }
    const added = alternativeSolutions(
      played,
      maxShots,
      goalHits,
      playerMirror,
    ).filter((moves) => !known.has(JSON.stringify(moves)));
    if (added.length === 0) {
      return;
    }
    found.push({
      changes,
      board,
      added,
      addedAtPar: added.filter((moves) => shotRows(moves).length === minShots)
        .length,
      randomWinChance: randomWinChance(
        played,
        minShots,
        goalHits,
        playerMirror,
      ),
    });
  };

  const changeable: Position[] = [];
  levelBoard.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      // Portals stay where they are: they come in pairs.
      if (cell !== "goal" && cell !== "bonus" && cell !== "portal") {
        changeable.push({ x, y });
      }
    }),
  );
  const search = (board: Board, changes: CellChange[], from: number) => {
    for (let i = from; i < changeable.length; i++) {
      const { x, y } = changeable[i];
      for (const cell of cellTypes) {
        if (cell === board.cells[y][x]) {
          continue;
        }
        const change = { x, y, cell };
        const changed = withCell(board, change);
        // Cells the par solution reaches would change how it plays.
        if (playedShots(withBonuses(changed), par) !== parShots) {
          continue;
        }
        evaluate(changed, [...changes, change]);
        if (changes.length + 1 < options.changes) {
          search(changed, [...changes, change], i + 1);
        }
      }
    }
  };
  search(levelBoard, [], 0);

  return found.sort(
    (a, b) =>
      a.addedAtPar - b.addedAtPar ||
      a.added.length - b.added.length ||
      a.changes.length - b.changes.length,
  );
}
