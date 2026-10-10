import { Container, Graphics, Rectangle } from "pixi.js";
import type { ShotOutcome, ShotResult } from "../game/simulate";
import { DIRECTION_DELTAS } from "../game/types";
import type { Board, CellType } from "../game/types";

const COLORS = {
  boardBackground: 0x252b3a,
  gridLine: 0x3a4256,
  mirror: 0xe8ecf4,
  wall: 0x6b7280,
  goal: 0x4ade80,
  launcher: 0xf59e0b,
};

const PATH_COLORS: Record<ShotOutcome, number> = {
  goal: 0x4ade80,
  exit: 0xf87171,
  blocked: 0xf87171,
  loop: 0xc084fc,
};

/**
 * Draws the board with a column of launchers on its left. Board cell (x, y)
 * is drawn at column x + 1, leaving column 0 for the launchers.
 */
export class BoardView extends Container {
  private readonly board: Board;
  private readonly cellSize: number;
  private readonly pathGraphics = new Graphics();

  constructor(board: Board, cellSize: number, onLaunch: (row: number) => void) {
    super();
    this.board = board;
    this.cellSize = cellSize;

    this.addChild(this.drawBoard());
    for (let row = 0; row < board.height; row++) {
      this.addChild(this.createLauncher(row, () => onLaunch(row)));
    }
    this.addChild(this.pathGraphics);
  }

  /** Width in pixels: launcher column, board and a margin column on the right. */
  get contentWidth(): number {
    return (this.board.width + 2) * this.cellSize;
  }

  get contentHeight(): number {
    return this.board.height * this.cellSize;
  }

  showPath(result: ShotResult): void {
    const g = this.pathGraphics.clear();
    const { path, outcome } = result;
    if (path.length === 0) {
      return;
    }

    const points = [
      { x: -1, y: path[0].y },
      ...path.map(({ x, y }) => ({ x, y })),
    ];
    const last = path[path.length - 1];
    if (outcome === "exit") {
      // Continue one cell past the edge to show the pellet leaving.
      const delta = DIRECTION_DELTAS[last.directionOut];
      points.push({ x: last.x + delta.x, y: last.y + delta.y });
    } else if (outcome === "blocked") {
      // Stop at the wall's edge rather than its centre.
      const delta = DIRECTION_DELTAS[last.directionIn];
      points[points.length - 1] = {
        x: last.x - delta.x / 2,
        y: last.y - delta.y / 2,
      };
    }

    const color = PATH_COLORS[outcome];
    const pixels = points.map(({ x, y }) => this.cellCenter(x, y));
    g.moveTo(pixels[0].x, pixels[0].y);
    for (const p of pixels.slice(1)) {
      g.lineTo(p.x, p.y);
    }
    g.stroke({ width: 4, color, cap: "round", join: "round" });

    const end = pixels[pixels.length - 1];
    g.circle(end.x, end.y, this.cellSize * 0.12).fill(color);
  }

  clearPath(): void {
    this.pathGraphics.clear();
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

  private createLauncher(row: number, onTap: () => void): Graphics {
    const size = this.cellSize;
    const cx = size / 2;
    const cy = (row + 0.5) * size;
    const r = size * 0.22;

    const g = new Graphics()
      .poly([cx - r, cy - r, cx + r, cy, cx - r, cy + r])
      .fill(COLORS.launcher);
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = new Rectangle(0, row * size, size, size);
    g.on("pointertap", onTap);
    return g;
  }
}
