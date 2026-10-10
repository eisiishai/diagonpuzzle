import type { LevelSession } from "./LevelSession";
import { canPlaceAt, placementPositions } from "./placement";
import type { Position } from "./types";

/** Keys while choosing a cell with the keyboard. */
export type PlacementKey =
  "up" | "down" | "left" | "right" | "place" | "cancel";

/**
 * What a placement input did, for the scene to show:
 * - placed: the mirror was placed
 * - previewed: a first tap on a touch screen chose a cell; a second tap
 *   on it places the mirror
 * - moved: the keyboard cursor moved
 * - cancelled: choosing with the keyboard ended without placing
 * - ignored: nothing changed
 */
export type PlacementResult =
  "placed" | "previewed" | "moved" | "cancelled" | "ignored";

/** Where the mirror would go, and whether it can go there now. */
export interface PlacementPreview {
  position: Position;
  placeable: boolean;
}

/**
 * Choosing the cell for the player's mirror (see docs/DESIGN.md,
 * Player-placed mirror) with a mouse, a touch screen or the keyboard:
 * - mouse: hovering previews an empty cell, a click places at once
 * - touch: there is no hover, so a first tap previews the cell and a
 *   second tap on the same cell places, so a stray tap doesn't use up
 *   the mirror
 * - keyboard: start() puts a cursor on an empty cell, arrows move it,
 *   place puts the mirror there and cancel stops
 * Whether the mirror may go somewhere is up to the LevelSession; this only
 * tracks the cell being chosen.
 */
export class MirrorPlacement {
  private readonly session: LevelSession;
  /**
   * The cell chosen while choosing with the keyboard, or by a first tap on
   * a touch screen.
   */
  private cursor: { position: Position; by: "keyboard" | "touch" } | null =
    null;
  /** The empty cell under the mouse, while no cursor is shown. */
  private hovered: Position | null = null;

  constructor(session: LevelSession) {
    this.session = session;
  }

  /** True while choosing a cell with the keyboard: keys go to key(). */
  get choosingByKeyboard(): boolean {
    return this.cursor?.by === "keyboard";
  }

  /** The cell to mark as where the mirror would go, if any. */
  get preview(): PlacementPreview | null {
    const position = this.cursor?.position ?? this.hovered;
    if (position === null || this.session.playerMirror === undefined) {
      return null;
    }
    return { position, placeable: this.session.canPlace(position) };
  }

  /**
   * The pointer moved onto board cell `position`, or off the board (null).
   * Only a mouse previews, and not while a cursor is shown.
   */
  hover(position: Position | null, pointerType: string): void {
    if (pointerType !== "mouse" || this.cursor) {
      return;
    }
    this.hovered =
      position && canPlaceAt(this.session.board, position) ? position : null;
  }

  /** A click or tap on board cell `position`. */
  tap(position: Position, pointerType: string): PlacementResult {
    if (!this.session.canPlace(position)) {
      return "ignored";
    }
    const cursor = this.cursor?.position;
    const confirmed = cursor?.x === position.x && cursor?.y === position.y;
    if (pointerType === "mouse" || confirmed) {
      return this.place(position);
    }
    this.cursor = { position, by: "touch" };
    return "previewed";
  }

  /**
   * Starts choosing with the keyboard, on an empty cell in the selected row
   * if there is one, else the first empty cell. False if the mirror can't
   * be placed now.
   */
  start(): boolean {
    const { session } = this;
    if (!session.mirrorInHand || !session.canFire) {
      return false;
    }
    const empty = placementPositions(session.board);
    const position = empty.find((p) => p.y === session.selectedRow) ??
      empty[0] ?? { x: 0, y: session.selectedRow };
    this.cursor = { position, by: "keyboard" };
    this.hovered = null;
    return true;
  }

  /** A key while choosing with the keyboard (see choosingByKeyboard). */
  key(key: PlacementKey): PlacementResult {
    if (!this.cursor) {
      return "ignored";
    }
    const { position } = this.cursor;
    const { width, height } = this.session.board;
    const move = (dx: number, dy: number): PlacementResult => {
      this.cursor = {
        position: {
          x: Math.max(0, Math.min(width - 1, position.x + dx)),
          y: Math.max(0, Math.min(height - 1, position.y + dy)),
        },
        by: "keyboard",
      };
      return "moved";
    };
    switch (key) {
      case "up":
        return move(0, -1);
      case "down":
        return move(0, 1);
      case "left":
        return move(-1, 0);
      case "right":
        return move(1, 0);
      case "place":
        return this.place(position);
      case "cancel":
        this.clear();
        return "cancelled";
    }
  }

  /** Stops choosing and hides the preview (as a shot fires or the level restarts). */
  clear(): void {
    this.cursor = null;
    this.hovered = null;
  }

  private place(position: Position): PlacementResult {
    if (!this.session.place(position)) {
      return "ignored";
    }
    this.clear();
    return "placed";
  }
}
