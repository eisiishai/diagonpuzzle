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

export interface BoardViewHandlers {
  /** A launcher was clicked or tapped. */
  onLaunch: (row: number) => void;
  /** The pointer moved over a launcher. */
  onHover: (row: number) => void;
}

/**
 * Draws the board with a column of launchers on its left. Board cell (x, y)
 * is drawn at column x + 1, leaving column 0 for the launchers.
 */
export class BoardView extends Container {
  private readonly board: Board;
  private readonly cellSize: number;
  private readonly rowHighlight = new Graphics();
  private readonly launchers: Graphics[] = [];
  private readonly animator: PelletAnimator;

  constructor(board: Board, cellSize: number, handlers: BoardViewHandlers) {
    super();
    this.board = board;
    this.cellSize = cellSize;

    this.rowHighlight
      .rect(cellSize, 0, board.width * cellSize, cellSize)
      .fill({ color: COLORS.rowHighlight, alpha: 0.06 });
    this.rowHighlight.visible = false;

    this.addChild(this.drawBoard(), this.rowHighlight);
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
    return (this.board.width + 2) * this.cellSize;
  }

  get contentHeight(): number {
    return this.board.height * this.cellSize;
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

  playShot(result: ShotResult, callbacks: ShotCallbacks): void {
    this.animator.play(result, callbacks);
  }

  update(deltaMs: number): void {
    this.animator.update(deltaMs);
  }

  /** Pixel centre of board cell (x, y); x = -1 is the launcher column. */
  private cellCenter(x: number, y: number): { x: number; y: number } {
    return {
      x: (x + 1.5) * this.cellSize,
      y: (y + 0.5) * this.cellSize,
    };
  }

  private drawBoard(): Graphics {
    const { board, cellSize } = this;
    const g = new Graphics();

    g.rect(cellSize, 0, board.width * cellSize, board.height * cellSize).fill(
      COLORS.boardBackground,
    );
    for (let x = 0; x <= board.width; x++) {
      g.moveTo((x + 1) * cellSize, 0).lineTo(
        (x + 1) * cellSize,
        board.height * cellSize,
      );
    }
    for (let y = 0; y <= board.height; y++) {
      g.moveTo(cellSize, y * cellSize).lineTo(
        (board.width + 1) * cellSize,
        y * cellSize,
      );
    }
    g.stroke({ width: 1, color: COLORS.gridLine });

    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        this.drawCell(g, board.cells[y][x], (x + 1) * cellSize, y * cellSize);
      }
    }
    return g;
  }

  private drawCell(g: Graphics, cell: CellType, left: number, top: number) {
    const size = this.cellSize;
    const pad = size * 0.15;
    const right = left + size;
    const bottom = top + size;

    switch (cell) {
      case "empty":
        break;
      case "mirrorBackslash":
        g.moveTo(left + pad, top + pad)
          .lineTo(right - pad, bottom - pad)
          .stroke({ width: 5, color: COLORS.mirror, cap: "round" });
        break;
      case "mirrorSlash":
        g.moveTo(left + pad, bottom - pad)
          .lineTo(right - pad, top + pad)
          .stroke({ width: 5, color: COLORS.mirror, cap: "round" });
        break;
      case "wall":
        g.rect(left + 2, top + 2, size - 4, size - 4).fill(COLORS.wall);
        break;
      case "goal":
        g.circle(left + size / 2, top + size / 2, size * 0.3)
          .stroke({ width: 4, color: COLORS.goal })
          .circle(left + size / 2, top + size / 2, size * 0.12)
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
