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

/** True if any cell of the board is one of `cells`. */
export function boardHas(board: Board, cells: readonly CellType[]): boolean {
  return board.cells.some((row) => row.some((cell) => cells.includes(cell)));
}

/** Returns the neighbouring position one cell away in `direction`. */
export function step(position: Position, direction: Direction): Position {
  const delta = DIRECTION_DELTAS[direction];
  return { x: position.x + delta.x, y: position.y + delta.y };
}

/** A cell of the board set to `cell`. */
export interface CellChange extends Position {
  cell: CellType;
}

/** The board with `changes` made. The given board is not modified. */
export function withCells(board: Board, changes: readonly CellChange[]): Board {
  if (changes.length === 0) {
    return board;
  }
  const cells = board.cells.map((row) => [...row]);
  for (const { x, y, cell } of changes) {
    cells[y][x] = cell;
  }
  return { width: board.width, height: board.height, cells };
}

/** The board with one cell changed. The given board is not modified. */
export function withCell(board: Board, change: CellChange): Board {
  return withCells(board, [change]);
}

/** Positions of the cells for which `matches` is true, in reading order. */
export function cellPositions(
  board: Board,
  matches: (cell: CellType, position: Position) => boolean,
): Position[] {
  const positions: Position[] = [];
  board.cells.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (matches(cell, { x, y })) {
        positions.push({ x, y });
      }
    }),
  );
  return positions;
}
