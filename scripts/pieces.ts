// The pieces a level is built around, for the level design tools: boards
// with a kind of piece swapped for a plainer one, and which kinds a board
// needs for par. src/levels/levels.test.ts checks every level the same way.

import { boardHas } from "../src/game/board";
import { FIXED_MIRRORS, GLASS_MIRRORS } from "../src/game/cells";
import { solve } from "../src/game/solver";
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
  "breakable" | "reflector" | "glass" | "fixed" | "portal" | "playerMirror";

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
];

/**
 * The kinds of piece `board` needs for par in `shots` shots: those it has
 * (and the player's mirror, if given) without which par is out of reach,
 * with breakable walls made solid, reflectors and portals made walls, glass
 * and fixed mirrors made ordinary ones, or no mirror for the player.
 */
export function neededPieces(
  board: Board,
  shots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): Piece[] {
  const needed: Piece[] = SWAPS.filter(
    ({ cells, swap }) =>
      boardHas(board, cells) &&
      solve(swap(board), shots, goalHits, playerMirror) === null,
  ).map(({ piece }) => piece);
  if (playerMirror !== undefined && solve(board, shots, goalHits) === null) {
    needed.push("playerMirror");
  }
  return needed;
}
