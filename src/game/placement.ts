import type { Board, MirrorType, Position } from "./types";

/**
 * The player-placed mirror: in levels that give the player one, it may be
 * placed once, on any empty cell, between shots. Placing takes no shot. The
 * placed mirror is an ordinary mirror from then on (it flips when hit), and
 * only a restart takes it back. See docs/DESIGN.md, Player-placed mirror.
 */

/** True if a mirror may be placed at `position`: an empty cell. */
export function canPlaceAt(board: Board, position: Position): boolean {
  return board.cells[position.y]?.[position.x] === "empty";
}

/**
 * The board with `mirror` placed at `position`. Throws if the cell is not
 * empty. The given board is not modified.
 */
export function placeMirror(
  board: Board,
  position: Position,
  mirror: MirrorType,
): Board {
  if (!canPlaceAt(board, position)) {
    throw new Error(`Cell (${position.x}, ${position.y}) is not empty`);
  }
  const cells = board.cells.map((row) => [...row]);
  cells[position.y][position.x] = mirror;
  return { width: board.width, height: board.height, cells };
}

/** Every position where a mirror may be placed, in reading order. */
export function placementPositions(board: Board): Position[] {
  const positions: Position[] = [];
  board.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell === "empty") {
        positions.push({ x, y });
      }
    }),
  );
  return positions;
}
