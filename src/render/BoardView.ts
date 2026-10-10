import { Container, Graphics, Rectangle } from "pixi.js";
import type { ShotResult } from "../game/simulate";
import type { Board, CellType } from "../game/types";
import { PelletAnimator } from "./PelletAnimator";
import type { ShotCallbacks } from "./PelletAnimator";
import { BONUS_PULSE_PERIOD_MS, prefersReducedMotion, pulse } from "./ambient";
import { BONUS_COLORS, COLORS, createBloom } from "./theme";

const MIRROR_TURN_MS = 150;
/** How often each bonus target gives off a sparkle, and how long it lasts. */
const SPARKLE_INTERVAL_MS = 170;
const SPARKLE_LIFE_MS = 750;
/** Turning speed of the bonus gem, in radians per millisecond. */
const BONUS_SPIN = (2 * Math.PI) / 9000;

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

/** A piece of a breakable wall flying off as it breaks. */
interface Debris {
  view: Graphics;
  vx: number;
  vy: number;
  spin: number;
  ageMs: number;
}

const DEBRIS_LIFE_MS = 600;

/** A small twinkle near a bonus target. */
interface Sparkle {
  view: Graphics;
  ageMs: number;
}

/**
 * Draws the board with a column of launchers on its left. Board cell (x, y)
 * is drawn at column x + 1, leaving column 0 for the launchers.
 *
 * Each cell has its own view, centred in the cell, so cells can change while
 * playing. Mirrors are all drawn as "\" and rotated 90° to show "/".
 *
 * A bloom filter on the whole view makes the bright pieces glow (beam,
 * mirrors, goal, selected emitter) while the dark panel stays unaffected.
 */
export class BoardView extends Container {
  private readonly boardWidth: number;
  private readonly boardHeight: number;
  private readonly cellSize: number;
  private readonly rowHighlight = new Graphics();
  private readonly cellViews: Graphics[][] = [];
  private readonly cells: CellType[][];
  /** Markers under goals that need several hits; see setGoalHits(). */
  private readonly goalMarkers = new Graphics();
  private readonly launchers: Graphics[] = [];
  private readonly animator: PelletAnimator;
  private turns: MirrorTurn[] = [];
  /** Sparkles around bonus targets, above the cells and under the beam. */
  private readonly sparkleLayer = new Container();
  private sparkles: Sparkle[] = [];
  private sparkleTimerMs = 0;
  /** Pieces of broken walls, above the cells. */
  private readonly debrisLayer = new Container();
  private debris: Debris[] = [];
  private selectedRow: number | null = null;
  /** Time for the ambient pulses of the goal and the selected emitter. */
  private ambientMs = 0;

  constructor(board: Board, cellSize: number, handlers: BoardViewHandlers) {
    super();
    this.boardWidth = board.width;
    this.boardHeight = board.height;
    this.cellSize = cellSize;
    this.cells = board.cells.map((row) => [...row]);
    this.filters = [createBloom()];

    this.rowHighlight
      .rect(cellSize, 0, board.width * cellSize, cellSize)
      .fill({ color: COLORS.beam, alpha: 0.06 });
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
    this.addChild(this.goalMarkers, this.sparkleLayer, this.debrisLayer);

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

  /**
   * For a goal that needs several hits: one small diamond per hit needed at
   * the bottom of each goal cell, filled for each hit so far. Nothing is
   * shown when one hit is enough.
   */
  setGoalHits(hits: number, required: number): void {
    const g = this.goalMarkers.clear();
    if (required <= 1) {
      return;
    }
    const r = this.cellSize * 0.06;
    const gap = this.cellSize * 0.3;
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell !== "goal") {
          return;
        }
        const center = this.cellCenter(x, y);
        const markerY = center.y + this.cellSize * 0.4;
        for (let i = 0; i < required; i++) {
          const mx = center.x + (i - (required - 1) / 2) * gap;
          g.poly([
            mx,
            markerY - r,
            mx + r,
            markerY,
            mx,
            markerY + r,
            mx - r,
            markerY,
          ]);
          if (i < hits) {
            g.fill(COLORS.success);
          } else {
            g.fill(COLORS.panel).stroke({ width: 1.5, color: COLORS.success });
          }
        }
      }),
    );
  }

  /** Highlights the launcher and board row of `row`, or nothing if null. */
  setSelectedRow(row: number | null): void {
    this.selectedRow = row;
    this.launchers.forEach((launcher, index) => {
      this.drawLauncher(launcher, index === row);
      launcher.alpha = 1;
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
    this.updateDebris(deltaMs);
    this.updateAmbient(deltaMs);
  }

  /**
   * Goal crystals breathe (grow slightly and glow), and the selected
   * emitter's glow pulses. Bonus targets turn, pulse faster and deeper, and
   * give off sparkles. Still when the player prefers reduced motion.
   */
  private updateAmbient(deltaMs: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.ambientMs += deltaMs;
    const breath = pulse(this.ambientMs);
    const bonusBreath = pulse(this.ambientMs, BONUS_PULSE_PERIOD_MS);
    this.sparkleTimerMs += deltaMs;
    const sparkle = this.sparkleTimerMs >= SPARKLE_INTERVAL_MS;
    if (sparkle) {
      this.sparkleTimerMs %= SPARKLE_INTERVAL_MS;
    }
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const view = this.cellViews[y][x];
        if (cell === "goal") {
          view.scale.set(1 + 0.07 * breath);
          view.alpha = 0.8 + 0.2 * breath;
        } else if (cell === "bonus") {
          view.scale.set(1 + 0.16 * bonusBreath);
          view.alpha = 0.85 + 0.15 * bonusBreath;
          view.rotation = this.ambientMs * BONUS_SPIN;
          if (sparkle) {
            this.addSparkle(x, y);
          }
        }
      }),
    );
    this.updateSparkles(deltaMs);
    if (this.selectedRow !== null) {
      this.launchers[this.selectedRow].alpha = 0.75 + 0.25 * breath;
    }
  }

  /** A four-pointed twinkle at a random spot around bonus target (x, y). */
  private addSparkle(x: number, y: number): void {
    const center = this.cellCenter(x, y);
    const angle = Math.random() * Math.PI * 2;
    const distance = this.cellSize * (0.25 + Math.random() * 0.3);
    const r = this.cellSize * (0.05 + Math.random() * 0.05);
    const w = r * 0.25;
    const colors = [...BONUS_COLORS, COLORS.beamCore];
    const view = new Graphics()
      .poly([0, -r, w, -w, r, 0, w, w, 0, r, -w, w, -r, 0, -w, -w])
      .fill(colors[Math.floor(Math.random() * colors.length)]);
    view.position.set(
      center.x + Math.cos(angle) * distance,
      center.y + Math.sin(angle) * distance,
    );
    view.scale.set(0);
    this.sparkleLayer.addChild(view);
    this.sparkles.push({ view, ageMs: 0 });
  }

  /** Sparkles grow and shrink once, turning a little, then disappear. */
  private updateSparkles(deltaMs: number): void {
    this.sparkles = this.sparkles.filter((sparkle) => {
      sparkle.ageMs += deltaMs;
      const t = sparkle.ageMs / SPARKLE_LIFE_MS;
      if (t >= 1) {
        sparkle.view.destroy();
        return false;
      }
      sparkle.view.scale.set(Math.sin(Math.PI * t));
      sparkle.view.rotation = t * 0.8;
      return true;
    });
  }

  /** Changes a cell; a mirror flipping to the other mirror rotates into place. */
  private changeCell(x: number, y: number, cell: CellType): void {
    const view = this.cellViews[y][x];
    const previous = this.cells[y][x];
    this.cells[y][x] = cell;
    if (!(isMirror(previous) && isMirror(cell))) {
      this.drawCell(view, cell);
      if (previous === "breakable") {
        this.addDebris(x, y);
      }
      return;
    }

    // Always turn clockwise. If the mirror is still turning from an earlier
    // flip, continue from where it is towards one more quarter turn.
    const existing = this.turns.find((turn) => turn.view === view);
    const target = (existing ? existing.to : view.rotation) + Math.PI / 2;
    this.turns = this.turns.filter((turn) => turn !== existing);
    this.turns.push({ view, from: view.rotation, to: target, elapsedMs: 0 });
  }

  /** A breakable wall at (x, y) bursts into stone pieces that fall away. */
  private addDebris(x: number, y: number): void {
    const center = this.cellCenter(x, y);
    const size = this.cellSize;
    for (let i = 0; i < 10; i++) {
      const r = size * (0.06 + Math.random() * 0.07);
      const view = new Graphics()
        .poly([-r, -r * 0.6, r * 0.8, -r, r, r * 0.7, -r * 0.5, r])
        .fill(i % 3 === 0 ? COLORS.stoneEdge : COLORS.stone);
      view.position.set(
        center.x + (Math.random() - 0.5) * size * 0.6,
        center.y + (Math.random() - 0.5) * size * 0.6,
      );
      view.rotation = Math.random() * Math.PI;
      const angle = Math.random() * Math.PI * 2;
      const speed = size * (1.5 + Math.random() * 2.5);
      this.debrisLayer.addChild(view);
      this.debris.push({
        view,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - size * 1.5,
        spin: (Math.random() - 0.5) * 10,
        ageMs: 0,
      });
    }
  }

  private updateDebris(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    const gravity = this.cellSize * 9;
    this.debris = this.debris.filter((piece) => {
      piece.ageMs += deltaMs;
      if (piece.ageMs >= DEBRIS_LIFE_MS) {
        piece.view.destroy();
        return false;
      }
      piece.vy += gravity * seconds;
      piece.view.x += piece.vx * seconds;
      piece.view.y += piece.vy * seconds;
      piece.view.rotation += piece.spin * seconds;
      piece.view.alpha = 1 - piece.ageMs / DEBRIS_LIFE_MS;
      return true;
    });
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
  cellCenter(x: number, y: number): { x: number; y: number } {
    return {
      x: (x + 1.5) * this.cellSize,
      y: (y + 0.5) * this.cellSize,
    };
  }

  private drawGrid(): Graphics {
    const { boardWidth: width, boardHeight: height, cellSize } = this;
    const g = new Graphics();
    const left = cellSize;
    const right = (width + 1) * cellSize;
    const bottom = height * cellSize;

    g.roundRect(left, 0, width * cellSize, bottom, 10).fill(COLORS.panel);
    for (let x = 1; x < width; x++) {
      g.moveTo(left + x * cellSize, 0).lineTo(left + x * cellSize, bottom);
    }
    for (let y = 1; y < height; y++) {
      g.moveTo(left, y * cellSize).lineTo(right, y * cellSize);
    }
    g.stroke({ width: 1, color: COLORS.grid });
    g.roundRect(left, 0, width * cellSize, bottom, 10).stroke({
      width: 1.5,
      color: COLORS.panelBorder,
    });
    return g;
  }

  /** Draws `cell` into `g`, centred on g's origin. */
  private drawCell(g: Graphics, cell: CellType): void {
    const half = this.cellSize / 2;
    g.clear();
    g.rotation = 0;
    g.scale.set(1);
    g.alpha = 1;

    switch (cell) {
      case "empty":
        break;
      case "mirrorBackslash":
      case "mirrorSlash": {
        // A glass bar with a bright centre line.
        const reach = half * 0.7;
        g.moveTo(-reach, -reach)
          .lineTo(reach, reach)
          .stroke({ width: 7, color: COLORS.glass, cap: "round" })
          .moveTo(-reach + 2, -reach + 2)
          .lineTo(reach - 2, reach - 2)
          .stroke({ width: 1.5, color: COLORS.glassHighlight, cap: "round" });
        g.rotation = cell === "mirrorSlash" ? Math.PI / 2 : 0;
        break;
      }
      case "wall": {
        // A dark block with diagonal hatching.
        const edge = half * 0.87;
        g.roundRect(-edge, -edge, edge * 2, edge * 2, 6)
          .fill(COLORS.wall)
          .stroke({ width: 1.5, color: COLORS.wallEdge });
        const h = edge * 0.75;
        g.moveTo(-h, h)
          .lineTo(h, -h)
          .moveTo(-h, h * 0.1)
          .lineTo(h * 0.1, -h)
          .moveTo(-h * 0.1, h)
          .lineTo(h, h * 0.1)
          .stroke({ width: 4, color: COLORS.wallHatch, cap: "round" });
        break;
      }
      case "breakable": {
        // A stone block with cracks running through it: it breaks when hit.
        const edge = half * 0.87;
        g.roundRect(-edge, -edge, edge * 2, edge * 2, 6)
          .fill(COLORS.stone)
          .stroke({ width: 1.5, color: COLORS.stoneEdge });
        const crack = (points: number[]) => {
          g.moveTo(points[0] * edge, points[1] * edge);
          for (let i = 2; i < points.length; i += 2) {
            g.lineTo(points[i] * edge, points[i + 1] * edge);
          }
        };
        crack([-0.2, -0.98, -0.05, -0.55, -0.28, -0.2, 0.05, 0.15]);
        crack([0.05, 0.15, -0.12, 0.55, 0.08, 0.98]);
        crack([0.05, 0.15, 0.45, 0.3, 0.6, 0.72]);
        crack([0.98, -0.45, 0.55, -0.35, 0.38, -0.65]);
        crack([-0.98, 0.35, -0.6, 0.45, -0.5, 0.75]);
        g.stroke({
          width: 2.5,
          color: COLORS.stoneCrack,
          cap: "round",
          join: "round",
        });
        break;
      }
      case "bonus": {
        // A prism gem: a hexagon cut into facets of every bonus colour
        // around a bright core. It turns slowly, so the colours swirl.
        const outer = half * 0.62;
        const inner = half * 0.2;
        const corner = (i: number, radius: number) => {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          return [Math.cos(angle) * radius, Math.sin(angle) * radius];
        };
        for (let i = 0; i < 6; i++) {
          g.poly([0, 0, ...corner(i, outer), ...corner(i + 1, outer)]).fill(
            BONUS_COLORS[i],
          );
        }
        for (let i = 0; i < 6; i++) {
          const [cx, cy] = corner(i, outer);
          g.moveTo(0, 0).lineTo(cx, cy);
        }
        g.stroke({ width: 1, color: COLORS.panel, alpha: 0.6 });
        const hexagon = (radius: number) =>
          Array.from({ length: 6 }, (_, i) => corner(i, radius)).flat();
        g.poly(hexagon(outer))
          .stroke({ width: 2, color: COLORS.glassHighlight, join: "miter" })
          .poly(hexagon(inner))
          .fill(COLORS.beamCore);
        break;
      }
      case "goal": {
        // A crystal: a diamond outline around a solid diamond.
        const outer = half * 0.85;
        const inner = half * 0.4;
        g.poly([0, -outer, outer, 0, 0, outer, -outer, 0])
          .stroke({ width: 3, color: COLORS.success, join: "miter" })
          .poly([0, -inner, inner, 0, 0, inner, -inner, 0])
          .fill(COLORS.success);
        break;
      }
    }
  }

  /** An emitter centred in the launcher cell of `row`. */
  private createLauncher(row: number, handlers: BoardViewHandlers): Graphics {
    const size = this.cellSize;
    const g = new Graphics();
    this.drawLauncher(g, false);
    g.position.set(size / 2, (row + 0.5) * size);
    g.eventMode = "static";
    g.cursor = "pointer";
    g.hitArea = new Rectangle(-size / 2, -size / 2, size, size);
    g.on("pointerover", () => handlers.onHover(row));
    g.on("pointertap", () => handlers.onLaunch(row));
    return g;
  }

  /** A rounded box with a nozzle; the selected one is lit in the beam colour. */
  private drawLauncher(g: Graphics, selected: boolean): void {
    const size = this.cellSize;
    const w = size * (selected ? 0.62 : 0.56);
    const h = size * (selected ? 0.52 : 0.46);
    const r = size * 0.12;
    g.clear()
      .roundRect(-w / 2, -h / 2, w, h, 7)
      .fill(selected ? COLORS.emitterSelected : COLORS.panel)
      .stroke({
        width: selected ? 2 : 1.5,
        color: selected ? COLORS.beam : COLORS.panelBorder,
      })
      .poly([-r * 0.6, -r, r * 1.1, 0, -r * 0.6, r])
      .fill(selected ? COLORS.beam : COLORS.emitterIdle);
  }
}

function isMirror(cell: CellType): boolean {
  return cell === "mirrorBackslash" || cell === "mirrorSlash";
}
