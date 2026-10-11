import { cellPositions, withCells } from "./board";
import type { Board, Position } from "./types";

/**
 * Positions of the board's bonus targets, in reading order (row by row, left
 * to right). A bonus target's index in this list identifies it in saved
 * progress.
 */
export function bonusPositions(board: Board): Position[] {
  return cellPositions(board, (cell) => cell === "bonus");
}

/**
 * The index of the bonus target at `position` in bonusPositions(board),
 * which identifies it in saved progress. `board` must be the level's full
 * board, with every bonus target; throws if there is none at `position`.
 */
export function bonusIndexAt(board: Board, position: Position): number {
  const index = bonusPositions(board).findIndex(
    ({ x, y }) => x === position.x && y === position.y,
  );
  if (index < 0) {
    throw new Error(`No bonus target at (${position.x}, ${position.y})`);
  }
  return index;
}

/**
 * The board with only the bonus targets for which `show(index)` is true;
 * the others become empty cells. Without `show`, all are removed.
 */
export function withBonuses(
  board: Board,
  show: (index: number) => boolean = () => false,
): Board {
  const hidden = bonusPositions(board).filter((_, index) => !show(index));
  return withCells(
    board,
    hidden.map((position) => ({ ...position, cell: "empty" })),
  );
}
