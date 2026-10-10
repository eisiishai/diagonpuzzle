import { getCell, step } from "./board";
import { CELL_BEHAVIORS } from "./cells";
import type { Board, CellType, Direction, Position } from "./types";

export type ShotOutcome = "goal" | "bonus" | "exit" | "blocked" | "loop";

export interface PathStep {
  x: number;
  y: number;
  /** Direction the pellet was moving when it entered the cell. */
  directionIn: Direction;
  /** Direction the pellet left the cell; equals directionIn where it stopped. */
  directionOut: Direction;
  /** What the cell turned into when the pellet hit it, if it changed. */
  becomes?: CellType;
}

export interface ShotResult {
  /** Every cell the pellet entered, in order, including the one it stopped in. */
  path: PathStep[];
  outcome: ShotOutcome;
  /** The board after the shot, with every change the pellet made. */
  board: Board;
}

/**
 * Fires a pellet into the board from the left edge at `row`, moving right.
 * The given board is not modified; the changed board is returned.
 */
export function fire(board: Board, row: number): ShotResult {
  if (!Number.isInteger(row) || row < 0 || row >= board.height) {
    throw new RangeError(
      `Row ${row} is outside the board (0-${board.height - 1})`,
    );
  }

  const cells = board.cells.map((cellRow) => [...cellRow]);
  const current: Board = { width: board.width, height: board.height, cells };
  const path: PathStep[] = [];
  const done = (outcome: ShotOutcome): ShotResult => ({
    path,
    outcome,
    board: current,
  });

  // The pellet is in a loop if it repeats a position and direction on an
  // identical board, so the board is part of the visited key. Every state is
  // visited at most once, so the loop terminates.
  // With the current cells a loop can't happen (every step can be traced
  // back uniquely, see docs/DESIGN.md), so no test builds one; the check
  // guards future block types.
  const visited = new Set<string>();
  let boardKey = boardStateKey(current);
  let position: Position = { x: 0, y: row };
  let direction: Direction = "right";

  for (;;) {
    const cell = getCell(current, position);
    if (cell === undefined) {
      return done("exit");
    }

    const key = `${position.x},${position.y},${direction}|${boardKey}`;
    if (visited.has(key)) {
      return done("loop");
    }
    visited.add(key);

    const effect = CELL_BEHAVIORS[cell](direction);
    if (effect.kind === "stop") {
      path.push({
        ...position,
        directionIn: direction,
        directionOut: direction,
        ...(effect.becomes && { becomes: effect.becomes }),
      });
      if (effect.becomes) {
        cells[position.y][position.x] = effect.becomes;
      }
      return done(effect.reason);
    }

    path.push({
      ...position,
      directionIn: direction,
      directionOut: effect.direction,
      ...(effect.becomes && { becomes: effect.becomes }),
    });
    if (effect.becomes) {
      cells[position.y][position.x] = effect.becomes;
      boardKey = boardStateKey(current);
    }
    direction = effect.direction;
    position = step(position, direction);
  }
}

/** A string that is equal for two boards exactly when their cells are equal. */
export function boardStateKey(board: Board): string {
  return board.cells.map((row) => row.join(",")).join(";");
}
