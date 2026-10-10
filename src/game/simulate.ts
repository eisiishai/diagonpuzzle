import { getCell, step } from "./board";
import { CELL_BEHAVIORS } from "./cells";
import type { Board, Direction, Position } from "./types";

export type ShotOutcome = "goal" | "exit" | "blocked" | "loop";

export interface PathStep {
  x: number;
  y: number;
  /** Direction the pellet was moving when it entered the cell. */
  directionIn: Direction;
  /** Direction the pellet left the cell; equals directionIn where it stopped. */
  directionOut: Direction;
}

export interface ShotResult {
  /** Every cell the pellet entered, in order, including the one it stopped in. */
  path: PathStep[];
  outcome: ShotOutcome;
}

/** Fires a pellet into the board from the left edge at `row`, moving right. */
export function fire(board: Board, row: number): ShotResult {
  if (!Number.isInteger(row) || row < 0 || row >= board.height) {
    throw new RangeError(
      `Row ${row} is outside the board (0-${board.height - 1})`,
    );
  }

  const path: PathStep[] = [];
  const visited = new Set<string>();
  let position: Position = { x: 0, y: row };
  let direction: Direction = "right";

  // Terminates: each (cell, direction) pair is entered at most once.
  for (;;) {
    const cell = getCell(board, position);
    if (cell === undefined) {
      return { path, outcome: "exit" };
    }

    const key = `${position.x},${position.y},${direction}`;
    if (visited.has(key)) {
      return { path, outcome: "loop" };
    }
    visited.add(key);

    const effect = CELL_BEHAVIORS[cell](direction);
    if (effect.kind === "stop") {
      path.push({
        ...position,
        directionIn: direction,
        directionOut: direction,
      });
      return { path, outcome: effect.reason };
    }

    path.push({
      ...position,
      directionIn: direction,
      directionOut: effect.direction,
    });
    direction = effect.direction;
    position = step(position, direction);
  }
}
