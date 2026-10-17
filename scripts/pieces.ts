// The pieces a level is built around, for the level design tools: boards
// with a kind of piece swapped for a plainer one, and which kinds a board
// needs for par. src/levels/levels.test.ts checks every level the same way.

import { boardHas } from "../src/game/board";
import { FIXED_MIRRORS, GATE_CELLS, GLASS_MIRRORS } from "../src/game/cells";
import { eachCompletion, solve } from "../src/game/solver";
import type { Board, CellType, MirrorType } from "../src/game/types";

/** The board with every cell of type `cell` made a wall. */
export function withWalls(board: Board, cell: CellType): Board {
  return {
    ...board,
    cells: board.cells.map((row) => row.map((c) => (c === cell ? "wall" : c))),
  };
}

/** The board with every glass mirror made an ordinary mirror. */
export function withSolidGlass(board: Board): Board {
  return withReplaced(board, {
    glassBackslash: "mirrorBackslash",
    glassSlash: "mirrorSlash",
  });
}

/** The board with every fixed mirror made an ordinary one, which flips. */
export function withFlippingMirrors(board: Board): Board {
  return withReplaced(board, {
    fixedBackslash: "mirrorBackslash",
    fixedSlash: "mirrorSlash",
  });
}

/** The board with every one-way gate made a wall, which nothing passes. */
export function withClosedGates(board: Board): Board {
  return withReplaced(
    board,
    Object.fromEntries(GATE_CELLS.map((gate) => [gate, "wall"])),
  );
}

/** The board with every one-way gate taken away, which lets anything pass. */
export function withOpenGates(board: Board): Board {
  return withReplaced(
    board,
    Object.fromEntries(GATE_CELLS.map((gate) => [gate, "empty"])),
  );
}

/**
 * True if `board`'s one-way gates stop another way to par: with them taken
 * away, the level takes fewer than `shots` shots, or has more shortest
 * solutions.
 */
export function gatesBlock(
  board: Board,
  shots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): boolean {
  const open = withOpenGates(board);
  return (
    solve(open, shots - 1, goalHits, playerMirror) !== null ||
    waysToPar(open, shots, goalHits, playerMirror) >
      waysToPar(board, shots, goalHits, playerMirror)
  );
}

/**
 * How many different ways complete the level in exactly `shots` shots,
 * counting those whose shots pass the same cells once.
 */
function waysToPar(
  board: Board,
  shots: number,
  goalHits: number,
  playerMirror?: MirrorType,
): number {
  const ways = new Set<string>();
  for (const completion of eachCompletion(
    board,
    shots,
    goalHits,
    playerMirror,
  )) {
    if (completion.shots.length === shots) {
      ways.add(
        completion.shots
          .map(({ path }) => path.map(({ x, y }) => `${x},${y}`).join(" "))
          .join("|"),
      );
    }
  }
  return ways.size;
}

function withReplaced(
  board: Board,
  replacements: Partial<Record<CellType, CellType>>,
): Board {
  return {
    ...board,
    cells: board.cells.map((row) => row.map((c) => replacements[c] ?? c)),
  };
}

/** The board with every breakable wall made solid. */
export function withSolidWalls(board: Board): Board {
  return withWalls(board, "breakable");
}

/** A kind of piece a level can be built around. */
export type Piece =
  | "breakable"
  | "reflector"
  | "glass"
  | "fixed"
  | "portal"
  | "gate"
  | "playerMirror";

/** Each kind of piece on a board, and the board with it swapped for a plainer one. */
const SWAPS: {
  piece: Piece;
  cells: readonly CellType[];
  swap: (b: Board) => Board;
}[] = [
  { piece: "breakable", cells: ["breakable"], swap: withSolidWalls },
  {
    piece: "reflector",
    cells: ["reflector"],
    swap: (b) => withWalls(b, "reflector"),
  },
  { piece: "glass", cells: GLASS_MIRRORS, swap: withSolidGlass },
  { piece: "fixed", cells: FIXED_MIRRORS, swap: withFlippingMirrors },
  { piece: "portal", cells: ["portal"], swap: (b) => withWalls(b, "portal") },
  { piece: "gate", cells: GATE_CELLS, swap: withClosedGates },
];

/**
 * How many cells of each kind of piece `board` has, in the order the game
 * adds them (a portal pair counts 2); kinds it doesn't have are left out.
 * The player's mirror is not on the board, so it is never listed.
 */
export function piecesOn(board: Board): { piece: Piece; count: number }[] {
  return SWAPS.map(({ piece, cells }) => ({
    piece,
    count: board.cells.flat().filter((cell) => cells.includes(cell)).length,
  })).filter(({ count }) => count > 0);
}

/**
 * The board with every `piece` swapped for a plainer one, as neededPieces
 * does; unchanged for the player's mirror, which is not on the board.
 */
export function withoutPiece(board: Board, piece: Piece): Board {
  const swap = SWAPS.find((entry) => entry.piece === piece);
  return swap ? swap.swap(board) : board;
}

/**
 * The kinds of piece `board` needs for par in `shots` shots: those it has
 * (and the player's mirror, if given) without which par is out of reach,
 * with breakable walls made solid, reflectors, portals and one-way gates
 * made walls (gates count only if they also block another way, see
 * gatesBlock), glass
 * and fixed mirrors made ordinary ones, or no mirror for the player.
 */
export function neededPieces(
  board: Board,
  shots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): Piece[] {
  const needed: Piece[] = SWAPS.filter(
    ({ piece, cells, swap }) =>
      boardHas(board, cells) &&
      solve(swap(board), shots, goalHits, playerMirror) === null &&
      (piece !== "gate" || gatesBlock(board, shots, goalHits, playerMirror)),
  ).map(({ piece }) => piece);
  if (playerMirror !== undefined && solve(board, shots, goalHits) === null) {
    needed.push("playerMirror");
  }
  return needed;
}
