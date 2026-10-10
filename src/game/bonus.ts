import type { Board, Position } from "./types";

/**
 * Positions of the board's bonus targets, in reading order (row by row, left
 * to right). A bonus target's index in this list identifies it in saved
 * progress.
 */
export function bonusPositions(board: Board): Position[] {
  const positions: Position[] = [];
  board.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell === "bonus") {
        positions.push({ x, y });
      }
    }),
  );
  return positions;
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
  return withEmptyCells(board, hidden);
}

/** The board with the cells at `positions` emptied. */
export function withEmptyCells(
  board: Board,
  positions: readonly Position[],
): Board {
  if (positions.length === 0) {
    return board;
  }
  const cells = board.cells.map((row) => [...row]);
  for (const { x, y } of positions) {
    cells[y][x] = "empty";
  }
  return { width: board.width, height: board.height, cells };
}
