import { Container, Graphics, Rectangle } from "pixi.js";
import type { ShotResult } from "../game/simulate";
import type { Board, CellType } from "../game/types";
import { PelletAnimator } from "./PelletAnimator";
import type { ShotCallbacks } from "./PelletAnimator";

const COLORS = {
  boardBackground: 0x252b3a,
  gridLine: 0x3a4256,
  rowHighlight: 0xffffff,
  mirror: 0xe8ecf4,
  wall: 0x6b7280,
  goal: 0x4ade80,
  launcher: 0xf59e0b,
};

const MIRROR_TURN_MS = 150;

export interface BoardViewHandlers {
  /** A launcher was clicked or tapped. */
  onLaunch: (row: number) => void;
  /** The pointer moved over a launcher. */
  onHover: (row: number) => void;
}

/** A mirror rotating by 90° after a flip. */
interface MirrorTurn {
  view: Graphics;
  from: number;
  to: number;
  elapsedMs: number;
}

/**
 * Draws the board with a column of launchers on its left. Board cell (x, y)
 * is drawn at column x + 1, leaving column 0 for the launchers.
 *
 * Each cell has its own view, centred in the cell, so cells can change while
 * playing. Mirrors are all drawn as "\" and rotated 90° to show "/".
 */
export class BoardView extends Container {
  private readonly boardWidth: number;
  private readonly boardHeight: number;
  private readonly cellSize: number;
  private readonly rowHighlight = new Graphics();
  private readonly cellViews: Graphics[][] = [];
  private readonly cells: CellType[][];
  private readonly launchers: Graphics[] = [];
  private readonly animator: PelletAnimator;
  private turns: MirrorTurn[] = [];

  constructor(board: Board, cellSize: number, handlers: BoardViewHandlers) {
    super();
    this.boardWidth = board.width;
    this.boardHeight = board.height;
    this.cellSize = cellSize;
    this.cells = board.cells.map((row) => [...row]);

    this.rowHighlight
      .rect(cellSize, 0, board.width * cellSize, cellSize)
      .fill({ color: COLORS.rowHighlight, alpha: 0.06 });
    this.rowHighlight.visible = false;
    this.addChild(this.drawGrid(), this.rowHighlight);

    for (let y = 0; y < board.height; y++) {
      const row: Graphics[] = [];
      for (let x = 0; x < board.width; x++) {
        const view = new Graphics();
        const center = this.cellCenter(x, y);
        view.position.set(center.x, center.y);
        row.push(view);
        this.addChild(view);
      }
      this.cellViews.push(row);
    }
    this.redrawCells();

    for (let row = 0; row < board.height; row++) {
      const launcher = this.createLauncher(row, handlers);
      this.launchers.push(launcher);
      this.addChild(launcher);
    }

    this.animator = new PelletAnimator(cellSize, (x, y) =>
      this.cellCenter(x, y),
    );
    this.addChild(this.animator);
  }

  /** Width in pixels: launcher column, board and a margin column on the right. */
  get contentWidth(): number {
    return (this.boardWidth + 2) * this.cellSize;
  }

  get contentHeight(): number {
    return this.boardHeight * this.cellSize;
  }

  /** Shows `board` immediately, stopping any shot and animation in progress. */
  showBoard(board: Board): void {
    this.animator.clear();
    this.turns = [];
    board.cells.forEach((row, y) =>
      row.forEach((cell, x) => (this.cells[y][x] = cell)),
    );
    this.redrawCells();
  }

  /** Highlights the launcher and board row of `row`, or nothing if null. */
  setSelectedRow(row: number | null): void {
    this.launchers.forEach((launcher, index) => {
      const selected = index === row;
      launcher.scale.set(selected ? 1.3 : 1);
      launcher.alpha = selected ? 1 : 0.55;
    });
    this.rowHighlight.visible = row !== null;
    if (row !== null) {
      this.rowHighlight.y = row * this.cellSize;
    }
  }

  /** Animates a shot, changing cells as the pellet hits them. */
  playShot(
    result: ShotResult,
    callbacks: Omit<ShotCallbacks, "onCellChange">,
  ): void {
    this.animator.play(result, {
      ...callbacks,
      onCellChange: (x, y, cell) => this.changeCell(x, y, cell),
    });
  }

  update(deltaMs: number): void {
    this.animator.update(deltaMs);
    this.updateTurns(deltaMs);
  }

  /** Changes a cell; a mirror flipping to the other mirror rotates into place. */
  private changeCell(x: number, y: number, cell: CellType): void {
    const view = this.cellViews[y][x];
    const previous = this.cells[y][x];
    this.cells[y][x] = cell;
    if (!(isMirror(previous) && isMirror(cell))) {
      this.drawCell(view, cell);
      return;
    }

    // Always turn clockwise. If the mirror is still turning from an earlier
    // flip, continue from where it is towards one more quarter turn.
    const existing = this.turns.find((turn) => turn.view === view);
    const target = (existing ? existing.to : view.rotation) + Math.PI / 2;
    this.turns = this.turns.filter((turn) => turn !== existing);
    this.turns.push({ view, from: view.rotation, to: target, elapsedMs: 0 });
  }

  private updateTurns(deltaMs: number): void {
    for (const turn of this.turns) {
      turn.elapsedMs += deltaMs;
      const t = Math.min(1, turn.elapsedMs / MIRROR_TURN_MS);
      const eased = 1 - (1 - t) ** 3;
      turn.view.rotation = turn.from + (turn.to - turn.from) * eased;
    }
    this.turns = this.turns.filter((turn) => {
      if (turn.elapsedMs < MIRROR_TURN_MS) {
        return true;
      }
      // Keep rotations small; a half turn looks the same for a mirror.
      turn.view.rotation = turn.to % Math.PI;
      return false;
    });
  }

  private redrawCells(): void {
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => this.drawCell(this.cellViews[y][x], cell)),
    );
  }

  /** Pixel centre of board cell (x, y); x = -1 is the launcher column. */
  private cellCenter(x: number, y: number): { x: number; y: number } {
    return {
      x: (x + 1.5) * this.cellSize,
      y: (y + 0.5) * this.cellSize,
    };
  }

  private drawGrid(): Graphics {
    const { boardWidth: width, boardHeight: height, cellSize } = this;
    const g = new Graphics();

    g.rect(cellSize, 0, width * cellSize, height * cellSize).fill(
      COLORS.boardBackground,
    );
    for (let x = 0; x <= width; x++) {
      g.moveTo((x + 1) * cellSize, 0).lineTo(
        (x + 1) * cellSize,
        height * cellSize,
      );
    }
    for (let y = 0; y <= height; y++) {
      g.moveTo(cellSize, y * cellSize).lineTo(
        (width + 1) * cellSize,
        y * cellSize,
      );
    }
    g.stroke({ width: 1, color: COLORS.gridLine });
    return g;
  }

  /** Draws `cell` into `g`, centred on g's origin. */
  private drawCell(g: Graphics, cell: CellType): void {
    const half = this.cellSize / 2;
    const reach = half * 0.7;
    g.clear();
    g.rotation = 0;

    switch (cell) {
      case "empty":
        break;
      case "mirrorBackslash":
      case "mirrorSlash":
        g.moveTo(-reach, -reach)
          .lineTo(reach, reach)
          .stroke({ width: 5, color: COLORS.mirror, cap: "round" });
        g.rotation = cell === "mirrorSlash" ? Math.PI / 2 : 0;
        break;
      case "wall":
        g.rect(-half + 2, -half + 2, half * 2 - 4, half * 2 - 4).fill(
          COLORS.wall,
        );
        break;
      case "goal":
        g.circle(0, 0, half * 0.6)
          .stroke({ width: 4, color: COLORS.goal })
          .circle(0, 0, half * 0.24)
          .fill(COLORS.goal);
        break;
    }
  }

  /** A right-pointing triangle centred in the launcher cell of `row`. */
  private createLauncher(row: number, handlers: BoardViewHandlers): Graphics {
    const size = this.cellSize;
    const r = size * 0.22;

    const g = new Graphics().poly([-r, -r, r, 0, -r, r]).fill(COLORS.launcher);
    g.position.set(size / 2, (row + 0.5) * size);
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = new Rectangle(-size / 2, -size / 2, size, size);
    g.on("pointerover", () => handlers.onHover(row));
    g.on("pointertap", () => handlers.onLaunch(row));
    return g;
  }
}

function isMirror(cell: CellType): boolean {
  return cell === "mirrorBackslash" || cell === "mirrorSlash";
}
