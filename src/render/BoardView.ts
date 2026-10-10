import { Container, Graphics, Rectangle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { ShotResult } from "../game/simulate";
import { DIRECTION_DELTAS } from "../game/types";
import type { Board, CellType, MirrorType, Position } from "../game/types";
import { PelletAnimator } from "./PelletAnimator";
import type { ShotCallbacks } from "./PelletAnimator";
import { BONUS_PULSE_PERIOD_MS, prefersReducedMotion, pulse } from "./ambient";
import { easeInOutCubic, easeOutCubic } from "./easing";
import { diamondFill } from "./goalFill";
import {
  introCell,
  introGoal,
  introGoalStartMs,
  introLauncher,
  introLengthMs,
  introPanelAlpha,
} from "./intro";
import { BONUS_COLORS, COLORS, createBloom } from "./theme";

const MIRROR_TURN_MS = 150;
/** How long a placed mirror takes to drop into place. */
const MIRROR_PLACE_MS = 220;
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
  /** The pointer moved onto board cell `position`, or off the board (null). */
  onCellHover: (position: Position | null, pointerType: string) => void;
  /** A board cell was clicked or tapped. */
  onCellTap: (position: Position, pointerType: string) => void;
}

/** A placed mirror settling into place. */
interface Placing {
  view: Graphics;
  elapsedMs: number;
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

/**
 * A short flash of light at a point in pixels: where the beam reflects, or
 * a goal crystal hit (which also sends out a diamond ring).
 */
interface Flash {
  x: number;
  y: number;
  kind: "mirror" | "goal";
  ageMs: number;
}

const MIRROR_FLASH_MS = 170;
const GOAL_FLASH_MS = 450;

/** A bright spot running along a mirror's glass as it turns. */
interface Glint {
  view: Graphics;
  ageMs: number;
}

const GLINT_MS = 260;

/** A spark bouncing back from a wall; position and speed in pixels. */
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  lifeMs: number;
  ageMs: number;
}

/** Sparks from a wall hit: how many, and their speed in cells a second. */
const SPARK_COUNT = 5;
const SPARK_SPEED = 4.5;
const SPARK_LIFE_MS = 240;

/** The board shakes this many pixels, fading out, when stone breaks. */
const SHAKE_PIXELS = 2;
const SHAKE_MS = 220;

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
  private readonly panel: Graphics;
  private readonly rowHighlight = new Graphics();
  private readonly cellViews: Graphics[][] = [];
  private readonly cells: CellType[][];
  /** Goal hits so far and needed; see setGoalHits(). */
  private goalHits = { hits: 0, required: 1 };
  private readonly launchers: Graphics[] = [];
  private readonly animator: PelletAnimator;
  private turns: MirrorTurn[] = [];
  private placings: Placing[] = [];
  /** Where the player's mirror would go; see showPlacePreview(). */
  private readonly placePreview = new Graphics();
  /** Pointer events over the board's cells, while placing; see setPlacing(). */
  private cellPointer!: Container;
  /** Sparkles around bonus targets, above the cells and under the beam. */
  private readonly sparkleLayer = new Container();
  private sparkles: Sparkle[] = [];
  private sparkleTimerMs = 0;
  /** Pieces of broken walls, above the cells. */
  private readonly debrisLayer = new Container();
  private debris: Debris[] = [];
  /** Flashes, glints and sparks, redrawn each frame above the cells. */
  private readonly effectLayer = new Graphics();
  private flashes: Flash[] = [];
  private glints: Glint[] = [];
  private sparks: Spark[] = [];
  /** Time into a shake of the board, while it shakes. */
  private shakeMs: number | null = null;
  private selectedRow: number | null = null;
  /** Time for the ambient pulses of the goal and the selected emitter. */
  private ambientMs = 0;
  /** Time into the level-start intro while it plays; see playIntro(). */
  private introMs: number | null = null;
  private introIgnited = false;

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
    this.panel = this.drawGrid();
    this.animator = new PelletAnimator(cellSize, (x, y) =>
      this.cellCenter(x, y),
    );
    this.addChild(this.panel, this.rowHighlight, this.animator.light);

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
    this.addChild(
      this.effectLayer,
      this.placePreview,
      this.sparkleLayer,
      this.debrisLayer,
      this.createCellPointer(handlers),
    );

    for (let row = 0; row < board.height; row++) {
      const launcher = this.createLauncher(row, handlers);
      this.launchers.push(launcher);
      this.addChild(launcher);
    }

    this.addChild(this.animator);
  }

  /** Width in pixels: launcher column, board and a margin column on the right. */
  get contentWidth(): number {
    return (this.boardWidth + 2) * this.cellSize;
  }

  get contentHeight(): number {
    return this.boardHeight * this.cellSize;
  }

  /** The panel under the cells, in this view's coordinates. */
  get panelBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.cellSize,
      y: 0,
      width: this.boardWidth * this.cellSize,
      height: this.boardHeight * this.cellSize,
    };
  }

  /** How far the panel has faded in: below 1 only during the intro. */
  get panelAlpha(): number {
    return this.panel.alpha;
  }

  /**
   * Builds the board in as a level starts: the panel fades in, emitters
   * slide in, cells pop in column by column and the goal ignites last.
   * Anything the player does ends it at once. Nothing when the player
   * prefers reduced motion.
   */
  playIntro(): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.introMs = 0;
    this.introIgnited = false;
    this.updateIntro(0);
  }

  /**
   * A goal crystal at board cell (x, y) flashes and sends out a diamond
   * ring (just the flash when the player prefers reduced motion).
   */
  flashGoal(x: number, y: number): void {
    this.flashes.push({ ...this.cellCenter(x, y), kind: "goal", ageMs: 0 });
  }

  /** Shows `board` immediately, stopping any shot and animation in progress. */
  showBoard(board: Board): void {
    this.finishIntro();
    this.animator.clear();
    this.turns = [];
    this.placings = [];
    this.flashes = [];
    this.glints = [];
    this.sparks = [];
    this.shakeMs = null;
    this.pivot.set(0, 0);
    board.cells.forEach((row, y) =>
      row.forEach((cell, x) => (this.cells[y][x] = cell)),
    );
    this.redrawCells();
  }

  /**
   * For a goal that needs several hits: its core fills from the bottom, a
   * part per hit so far. A goal needing one hit looks as usual.
   */
  setGoalHits(hits: number, required: number): void {
    this.goalHits = { hits, required };
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === "goal") {
          this.drawCell(this.cellViews[y][x], cell);
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
    this.finishIntro();
    this.animator.play(result, {
      ...callbacks,
      onBounce: (bounceNumber, at) => {
        this.flashes.push({
          ...this.cellCenter(at.x, at.y),
          kind: "mirror",
          ageMs: 0,
        });
        callbacks.onBounce(bounceNumber, at);
      },
      onCellChange: (x, y, cell) => this.changeCell(x, y, cell),
      onFinish: () => {
        this.shotEnded(result);
        callbacks.onFinish();
      },
    });
  }

  /**
   * Shows the player's mirror placed at (x, y): `cell` is the mirror. It
   * drops in from slightly larger, fading in.
   */
  placeMirror(x: number, y: number, cell: CellType): void {
    this.finishIntro();
    const view = this.cellViews[y][x];
    this.cells[y][x] = cell;
    this.drawCell(view, cell);
    if (!prefersReducedMotion()) {
      this.placings.push({ view, elapsedMs: 0 });
      this.updatePlacings(0);
    }
  }

  /**
   * Marks board cell `position` as where the player's `mirror` would go:
   * corner brackets, and the mirror's outline in dashes if it can go there
   * (`placeable`). Null hides it.
   */
  showPlacePreview(
    position: Position | null,
    mirror: MirrorType,
    placeable: boolean,
  ): void {
    const g = this.placePreview.clear();
    g.visible = position !== null;
    if (position === null) {
      return;
    }
    const center = this.cellCenter(position.x, position.y);
    g.position.set(center.x, center.y);
    const half = this.cellSize / 2;
    if (placeable) {
      const reach = half * 0.7;
      const dashes = 5;
      for (let i = 0; i < dashes; i++) {
        const from = -reach + (2 * reach * (i + 0.2)) / dashes;
        const to = -reach + (2 * reach * (i + 0.8)) / dashes;
        // Drawn as "\"; a "/" is the same line mirrored left to right.
        const sx = mirror === "mirrorSlash" ? -1 : 1;
        g.moveTo(sx * from, from).lineTo(sx * to, to);
      }
      g.stroke({ width: 4, color: COLORS.glass, alpha: 0.8, cap: "round" });
    }
    const edge = half * 0.82;
    const arm = half * 0.28;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      g.moveTo(sx * edge, sy * (edge - arm))
        .lineTo(sx * edge, sy * edge)
        .lineTo(sx * (edge - arm), sy * edge);
    }
    g.stroke({
      width: 2,
      color: placeable ? COLORS.glass : COLORS.dim,
      alpha: placeable ? 0.7 : 0.4,
      cap: "round",
      join: "round",
    });
  }

  /**
   * Turns pointer events over the board's cells on or off: on while the
   * player has a mirror to place.
   */
  setPlacing(placing: boolean): void {
    this.cellPointer.eventMode = placing ? "static" : "none";
    if (!placing) {
      this.showPlacePreview(null, "mirrorSlash", false);
    }
  }

  update(deltaMs: number): void {
    this.animator.update(deltaMs);
    this.updateTurns(deltaMs);
    this.updatePlacings(deltaMs);
    this.updateDebris(deltaMs);
    this.updateAmbient(deltaMs);
    this.updateIntro(deltaMs);
    this.updateEffects(deltaMs);
  }

  /**
   * Light at the end of a shot: sparks bounce back from a wall (and the
   * board shakes if the wall broke), and a goal hit flashes the crystal.
   */
  private shotEnded(result: ShotResult): void {
    const last = result.path[result.path.length - 1];
    if (!last) {
      return;
    }
    if (result.outcome === "goal") {
      this.flashGoal(last.x, last.y);
    } else if (result.outcome === "blocked") {
      const delta = DIRECTION_DELTAS[last.directionIn];
      const impact = this.cellCenter(
        last.x - delta.x / 2,
        last.y - delta.y / 2,
      );
      this.addSparks(impact.x, impact.y, -delta.x, -delta.y);
      if (last.becomes && !prefersReducedMotion()) {
        this.shakeMs = 0;
      }
    }
  }

  /** Sparks fanning out from (x, y) in pixels, heading roughly (dx, dy). */
  private addSparks(x: number, y: number, dx: number, dy: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < SPARK_COUNT; i++) {
      const angle = base + (Math.random() - 0.5) * 2.2;
      const speed = this.cellSize * SPARK_SPEED * (0.5 + Math.random() * 0.5);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() < 0.4 ? COLORS.beamCore : COLORS.beam,
        lifeMs: SPARK_LIFE_MS * (0.6 + Math.random() * 0.4),
        ageMs: 0,
      });
    }
  }

  /** Applies the intro's look for this moment, over the ambient motion. */
  private updateIntro(deltaMs: number): void {
    if (this.introMs === null) {
      return;
    }
    this.introMs += deltaMs;
    const t = this.introMs;
    if (t >= introLengthMs(this.boardWidth)) {
      this.finishIntro();
      return;
    }
    const panelAlpha = introPanelAlpha(t);
    this.panel.alpha = panelAlpha;
    this.rowHighlight.alpha = panelAlpha;
    this.launchers.forEach((launcher, row) => {
      const { alpha, offset } = introLauncher(t, row);
      launcher.alpha = alpha;
      launcher.x = this.cellSize * (0.5 + offset);
    });
    const ignite = !this.introIgnited && t >= introGoalStartMs(this.boardWidth);
    this.introIgnited ||= ignite;
    const goal = introGoal(t, this.boardWidth);
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const look = cell === "goal" ? goal : introCell(t, x);
        const view = this.cellViews[y][x];
        view.alpha = look.alpha;
        view.scale.set(look.scale);
        if (cell === "goal" && ignite) {
          this.flashGoal(x, y);
        }
      }),
    );
  }

  /** Ends the intro, leaving every piece at rest. */
  private finishIntro(): void {
    if (this.introMs === null) {
      return;
    }
    this.introMs = null;
    this.panel.alpha = 1;
    this.rowHighlight.alpha = 1;
    this.launchers.forEach((launcher) => {
      launcher.alpha = 1;
      launcher.x = this.cellSize / 2;
    });
    this.cellViews.forEach((row) =>
      row.forEach((view) => {
        view.alpha = 1;
        view.scale.set(1);
      }),
    );
  }

  /** Moves and redraws flashes, glints and sparks, and shakes the board. */
  private updateEffects(deltaMs: number): void {
    const g = this.effectLayer.clear();
    const size = this.cellSize;
    const reduced = prefersReducedMotion();

    this.flashes = this.flashes.filter((flash) => {
      flash.ageMs += deltaMs;
      const goal = flash.kind === "goal";
      const t = flash.ageMs / (goal ? GOAL_FLASH_MS : MIRROR_FLASH_MS);
      if (t >= 1) {
        return false;
      }
      const { x, y } = flash;
      const fade = (1 - t) ** 2;
      const color = goal ? COLORS.success : COLORS.glass;
      const radius = size * (goal ? 0.4 + 0.3 * t : 0.38 + 0.17 * t);
      g.circle(x, y, radius).fill({ color, alpha: (goal ? 0.45 : 0.5) * fade });
      if (!goal) {
        g.circle(x, y, radius * 0.4).fill({
          color: COLORS.glassHighlight,
          alpha: 0.8 * fade,
        });
      } else if (!reduced) {
        const r = size * (0.3 + 0.75 * easeOutCubic(t));
        g.poly([x, y - r, x + r, y, x, y + r, x - r, y]).stroke({
          width: 2.5 * (1 - 0.6 * t),
          color: COLORS.success,
          alpha: 0.9 * (1 - t),
          join: "miter",
        });
      }
      return true;
    });

    // The glint runs from one end of the glass to the other, following the
    // mirror's rotation as it turns.
    const reach = (size / 2) * 0.7;
    this.glints = this.glints.filter((glint) => {
      glint.ageMs += deltaMs;
      const t = glint.ageMs / GLINT_MS;
      if (t >= 1 || glint.view.destroyed) {
        return false;
      }
      const k = -reach + 2 * reach * easeInOutCubic(t);
      const cos = Math.cos(glint.view.rotation);
      const sin = Math.sin(glint.view.rotation);
      const x = glint.view.x + k * cos - k * sin;
      const y = glint.view.y + k * sin + k * cos;
      const strength = Math.sin(Math.PI * t);
      g.circle(x, y, size * 0.11).fill({
        color: COLORS.glassHighlight,
        alpha: 0.35 * strength,
      });
      g.circle(x, y, size * 0.05).fill({
        color: 0xffffff,
        alpha: 0.95 * strength,
      });
      return true;
    });

    const seconds = deltaMs / 1000;
    this.sparks = this.sparks.filter((spark) => {
      spark.ageMs += deltaMs;
      const t = spark.ageMs / spark.lifeMs;
      if (t >= 1) {
        return false;
      }
      const drag = Math.max(0, 1 - 2.5 * seconds);
      spark.vx *= drag;
      spark.vy = spark.vy * drag + size * 6 * seconds;
      spark.x += spark.vx * seconds;
      spark.y += spark.vy * seconds;
      // A short streak behind the spark; skipped once too short to draw.
      const speed = Math.hypot(spark.vx, spark.vy);
      const length = size * 0.2 * (1 - t);
      if (speed > 1 && length > 0.5) {
        g.moveTo(spark.x, spark.y)
          .lineTo(
            spark.x - (spark.vx / speed) * length,
            spark.y - (spark.vy / speed) * length,
          )
          .stroke({
            width: 2,
            color: spark.color,
            alpha: 1 - t,
            cap: "round",
          });
      }
      return true;
    });

    if (this.shakeMs !== null) {
      this.shakeMs += deltaMs;
      const t = this.shakeMs / SHAKE_MS;
      if (t >= 1) {
        this.shakeMs = null;
        this.pivot.set(0, 0);
      } else {
        const amount = SHAKE_PIXELS * (1 - t);
        this.pivot.set(
          (Math.random() * 2 - 1) * amount,
          (Math.random() * 2 - 1) * amount,
        );
      }
    }
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
    this.placePreview.alpha = 0.65 + 0.35 * breath;
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
    if (!prefersReducedMotion()) {
      this.glints = this.glints.filter((glint) => glint.view !== view);
      this.glints.push({ view, ageMs: 0 });
    }
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

  private updatePlacings(deltaMs: number): void {
    this.placings = this.placings.filter((placing) => {
      placing.elapsedMs += deltaMs;
      const t = Math.min(1, placing.elapsedMs / MIRROR_PLACE_MS);
      const eased = 1 - (1 - t) ** 3;
      placing.view.scale.set(1.35 - 0.35 * eased);
      placing.view.alpha = eased;
      return t < 1;
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
        // A crystal: a diamond outline around a solid diamond. When the
        // goal needs several hits, the core fills from the bottom per hit.
        const outer = half * 0.85;
        const inner = half * 0.4;
        g.poly([0, -outer, outer, 0, 0, outer, -outer, 0]).stroke({
          width: 3,
          color: COLORS.success,
          join: "miter",
        });
        const { hits, required } = this.goalHits;
        if (required <= 1) {
          g.poly([0, -inner, inner, 0, 0, inner, -inner, 0]).fill(
            COLORS.success,
          );
          break;
        }
        g.poly([0, -inner, inner, 0, 0, inner, -inner, 0]).stroke({
          width: 1.5,
          color: COLORS.success,
          alpha: 0.5,
          join: "miter",
        });
        const filled = diamondFill(inner, hits / required);
        if (filled.length > 0) {
          g.poly(filled).fill(COLORS.success);
        }
        break;
      }
    }
  }

  /**
   * An invisible area over the board's cells reporting which cell the
   * pointer is over or taps. Off until setPlacing(true).
   */
  private createCellPointer(handlers: BoardViewHandlers): Container {
    const area = new Container();
    const { cellSize } = this;
    area.hitArea = new Rectangle(
      cellSize,
      0,
      this.boardWidth * cellSize,
      this.boardHeight * cellSize,
    );
    area.eventMode = "none";
    area.cursor = "pointer";
    const cellAt = (event: FederatedPointerEvent): Position | null => {
      const local = area.toLocal(event.global);
      const x = Math.floor(local.x / cellSize) - 1;
      const y = Math.floor(local.y / cellSize);
      return x >= 0 && x < this.boardWidth && y >= 0 && y < this.boardHeight
        ? { x, y }
        : null;
    };
    area.on("pointermove", (event) =>
      handlers.onCellHover(cellAt(event), event.pointerType),
    );
    area.on("pointerleave", (event) =>
      handlers.onCellHover(null, event.pointerType),
    );
    area.on("pointertap", (event) => {
      const position = cellAt(event);
      if (position) {
        handlers.onCellTap(position, event.pointerType);
      }
    });
    this.cellPointer = area;
    return area;
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
