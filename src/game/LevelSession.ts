import { fire } from "./simulate";
import type { ShotOutcome, ShotResult } from "./simulate";
import type { Board } from "./types";

/**
 * Aiming: waiting for a shot. Firing: a shot is in progress (the pellet is
 * being animated) until `finishShot()`. Complete: the goal was reached.
 */
export type LevelPhase = "aiming" | "firing" | "complete";

/**
 * The state of one level being played: current board, shots fired, selected
 * row and phase. Presentation code calls these methods and draws the state;
 * all rules about what is allowed when live here.
 */
export class LevelSession {
  readonly startBoard: Board;
  private _board: Board;
  private _phase: LevelPhase = "aiming";
  private _shots = 0;
  private _selectedRow: number;
  /** Outcome of the shot in progress, applied by finishShot(). */
  private pendingOutcome?: ShotOutcome;

  constructor(startBoard: Board) {
    this.startBoard = startBoard;
    this._board = startBoard;
    this._selectedRow = Math.floor(startBoard.height / 2);
  }

  /** The board as changed by the shots so far. */
  get board(): Board {
    return this._board;
  }

  get phase(): LevelPhase {
    return this._phase;
  }

  get shots(): number {
    return this._shots;
  }

  get selectedRow(): number {
    return this._selectedRow;
  }

  get canFire(): boolean {
    return this._phase === "aiming";
  }

  /** Selects a row, clamped to the board. Ignored once the level is complete. */
  select(row: number): void {
    if (this._phase === "complete") {
      return;
    }
    const lastRow = this._board.height - 1;
    this._selectedRow = Math.max(0, Math.min(lastRow, row));
  }

  moveSelection(step: number): void {
    this.select(this._selectedRow + step);
  }

  /**
   * Fires from `row` (default: the selected row), selecting it. The board and
   * shot count update immediately; the phase stays "firing" until
   * finishShot(). Returns null, changing nothing, if a shot can't be fired now.
   */
  fire(row = this._selectedRow): ShotResult | null {
    if (!this.canFire) {
      return null;
    }
    this.select(row);
    const result = fire(this._board, this._selectedRow);
    this._board = result.board;
    this._shots++;
    this._phase = "firing";
    this.pendingOutcome = result.outcome;
    return result;
  }

  /** Ends the shot in progress; the level is complete if it reached the goal. */
  finishShot(): ShotOutcome {
    if (this._phase !== "firing" || this.pendingOutcome === undefined) {
      throw new Error("finishShot() called with no shot in progress");
    }
    const outcome = this.pendingOutcome;
    this.pendingOutcome = undefined;
    this._phase = outcome === "goal" ? "complete" : "aiming";
    return outcome;
  }

  /**
   * Back to the starting board with no shots fired, from any phase. A shot in
   * progress is abandoned; the selected row is kept.
   */
  restart(): void {
    this._board = this.startBoard;
    this._shots = 0;
    this._phase = "aiming";
    this.pendingOutcome = undefined;
  }
}
