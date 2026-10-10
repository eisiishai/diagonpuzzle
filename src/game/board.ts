import { DIRECTION_DELTAS } from "./types";
import type { Board, CellType, Direction, Position } from "./types";

export function isInside(board: Board, position: Position): boolean {
  return (
    position.x >= 0 &&
    position.x < board.width &&
    position.y >= 0 &&
    position.y < board.height
  );
}

/** Returns the cell at `position`, or undefined if it is outside the board. */
export function getCell(
  board: Board,
  position: Position,
): CellType | undefined {
  return isInside(board, position)
    ? board.cells[position.y][position.x]
    : undefined;
}

/** Returns the neighbouring position one cell away in `direction`. */
export function step(position: Position, direction: Direction): Position {
  const delta = DIRECTION_DELTAS[direction];
  return { x: position.x + delta.x, y: position.y + delta.y };
}
