import { Container, Graphics, Rectangle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { cellPositions } from "../game/board";
import { isGlassMirror, isMirror } from "../game/cells";
import type { ShotResult } from "../game/simulate";
import { DIRECTION_DELTAS } from "../game/types";
import type {
  Board,
  BounceKind,
  CellType,
  MirrorType,
  Position,
} from "../game/types";
import { PelletAnimator } from "./PelletAnimator";
import type { ShotCallbacks } from "./PelletAnimator";
import { BONUS_PULSE_PERIOD_MS, prefersReducedMotion, pulse } from "./ambient";
import { BoardEffects } from "./BoardEffects";
import { PORTAL_FIELD, drawCell, drawCellBase } from "./cellGraphics";
import { drawEmitter, drawRail } from "./emitterGraphics";
import { drawTable, tableHoles } from "./opticalTable";
import { TableLight } from "./TableLight";
import type { GoalHits } from "./cellGraphics";
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
/** How often each bonus target gives off a sparkle. */
const SPARKLE_INTERVAL_MS = 170;
/** Turning speed of the bonus gem, in radians per millisecond. */
const BONUS_SPIN = (2 * Math.PI) / 9000;
/** Ripples drift into a portal, one every PORTAL_RIPPLE_MS / 3. */
const PORTAL_RIPPLE_MS = 2600;
const PORTAL_RIPPLES = 3;

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

/** A mirror rotating by 90° after a flip, or a half turn in the ending. */
interface MirrorTurn {
  view: Graphics;
  from: number;
  to: number;
  elapsedMs: number;
  durationMs: number;
}

/**
 * The game's ending: a ring in the bonus colours spreading over the board
 * from `origin` (pixels), `radius` pixels out so far. Pieces it has
 * reached are in `reached` ("x,y").
 */
interface FinaleWave {
  origin: { x: number; y: number };
  radius: number;
  reached: Set<string>;
}

/** The ending's wave: speed in cells a second, ring spacing in pixels. */
const WAVE_SPEED = 9.5;
const WAVE_BAND = 5;
/** A mirror the wave passes makes a half turn in this time. */
const WAVE_TURN_MS = 300;

/** The board shakes this many pixels, fading out, when stone breaks. */
const SHAKE_PIXELS = 2;
const SHAKE_MS = 220;

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
  /** Mounts under the goal crystal and bonus gems; see drawCellBase(). */
  private readonly bases = new Graphics();
  /** Ripples drifting into the portals, over their fields. */
  private readonly ripples = new Graphics();
  /** The rail the emitters sit on. */
  private readonly rail = new Graphics();
  private readonly rowHighlight = new Graphics();
  private readonly cellViews: Graphics[][] = [];
  private readonly cells: CellType[][];
  /** Where the board's portals are; they never change. */
  private readonly portals: Position[];
  /** Goal hits so far and needed; see setGoalHits(). */
  private goalHits: GoalHits = { hits: 0, required: 1 };
  private readonly launchers: Graphics[] = [];
  private readonly animator: PelletAnimator;
  private turns: MirrorTurn[] = [];
  private placings: Placing[] = [];
  /** Where the player's mirror would go; see showPlacePreview(). */
  private readonly placePreview = new Graphics();
  /** Pointer events over the board's cells, while placing; see setPlacing(). */
  private cellPointer!: Container;
  private readonly boardEffects: BoardEffects;
  /** The beam's light on the table's holes and in the air over it. */
  private readonly tableLight: TableLight;
  private sparkleTimerMs = 0;
  /** Time into a shake of the board, while it shakes. */
  private shakeMs: number | null = null;
  private selectedRow: number | null = null;
  /** A frame around the emitter the second hint points at; see setHintRow(). */
  private readonly hintMark = new Graphics();
  private _hintRow: number | null = null;
  /** Time for the ambient pulses of the goal and the selected emitter. */
  private ambientMs = 0;
  private wave: FinaleWave | null = null;
  /** The ending's rings, under the cells, cut to the panel's shape. */
  private readonly waveLayer = new Graphics();
  /** Time into the level-start intro while it plays; see playIntro(). */
  private introMs: number | null = null;
  private introIgnited = false;

  /**
   * `tint` is the chapter's light on the table (see CHAPTER_LIGHTS), or
   * null for none.
   */
  constructor(
    board: Board,
    cellSize: number,
    tint: number | null,
    handlers: BoardViewHandlers,
  ) {
    super();
    this.boardWidth = board.width;
    this.boardHeight = board.height;
    this.cellSize = cellSize;
    this.cells = board.cells.map((row) => [...row]);
    this.portals = cellPositions(board, (cell) => cell === "portal");
    this.boardEffects = new BoardEffects(cellSize);
    this.tableLight = new TableLight(
      cellSize,
      tableHoles(board.width, board.height, cellSize).map(({ x, y }) => ({
        x: x + cellSize,
        y,
      })),
      {
        x: 0,
        y: 0,
        width: (board.width + 1) * cellSize,
        height: board.height * cellSize,
      },
    );
    this.filters = [createBloom()];

    this.rowHighlight
      .rect(cellSize, 0, board.width * cellSize, cellSize)
      .fill({ color: COLORS.beam, alpha: 0.06 });
    this.rowHighlight.visible = false;
    this.panel = this.drawPanel(tint);
    this.animator = new PelletAnimator(cellSize, (x, y) =>
      this.cellCenter(x, y),
    );
    const waveMask = new Graphics()
      .roundRect(
        cellSize,
        0,
        board.width * cellSize,
        board.height * cellSize,
        10,
      )
      .fill(0xffffff);
    this.waveLayer.mask = waveMask;
    this.addChild(
      this.panel,
      this.tableLight.holeLayer,
      this.rowHighlight,
      this.bases,
      waveMask,
      this.waveLayer,
      this.animator.ghost,
      this.animator.light,
    );

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
    this.drawRipples(0.5);
    this.addChild(
      this.ripples,
      this.tableLight.hazeLayer,
      this.boardEffects.lightLayer,
      this.placePreview,
      this.boardEffects.sparkleLayer,
      this.boardEffects.debrisLayer,
      this.createCellPointer(handlers),
    );

    this.hintMark
      .roundRect(
        -cellSize * 0.44,
        -cellSize * 0.4,
        cellSize * 0.88,
        cellSize * 0.8,
        10,
      )
      .stroke({ width: 2.5, color: COLORS.hint });
    this.hintMark.x = cellSize / 2;
    this.hintMark.visible = false;
    drawRail(this.rail, cellSize, board.height);
    this.addChild(this.rail, this.hintMark);
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
    const center = this.cellCenter(x, y);
    this.boardEffects.addFlash(center.x, center.y, "goal");
  }

  /**
   * The level is complete: green light runs back along the finished shot's
   * path to its emitter, which flashes, and a wave of green spreads from
   * the goal across the table's holes. Nothing when the player prefers
   * reduced motion.
   */
  playGoalSurge(result: ShotResult): void {
    const first = result.path[0];
    const last = result.path[result.path.length - 1];
    if (!first || !last) {
      return;
    }
    this.animator.playSurge(() => {
      const emitter = this.cellCenter(-1, first.y);
      this.boardEffects.addFlash(emitter.x, emitter.y, "emitter");
      this.tableLight.playWave(this.cellCenter(last.x, last.y), COLORS.success);
    });
  }

  /**
   * The game's ending, from the bonus target at board cell (x, y): a ring
   * in the bonus colours spreads over the board, and each piece it passes
   * flashes in the colour passing over it; mirrors make a half turn, so
   * they end as they were. Nothing when the player prefers reduced motion.
   */
  playFinaleWave(x: number, y: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.wave = {
      origin: this.cellCenter(x, y),
      radius: 0,
      reached: new Set(),
    };
  }

  /** Shows `board` immediately, stopping any shot and animation in progress. */
  showBoard(board: Board): void {
    this.finishIntro();
    this.animator.clear();
    this.wave = null;
    this.waveLayer.clear();
    this.turns = [];
    this.placings = [];
    this.boardEffects.clearLight();
    this.tableLight.clear();
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
          this.drawCell(x, y);
        }
      }),
    );
  }

  /** Frames the emitter of `row` for the second hint, or nothing if null. */
  setHintRow(row: number | null): void {
    this._hintRow = row;
    this.hintMark.visible = row !== null;
    if (row !== null) {
      this.hintMark.y = (row + 0.5) * this.cellSize;
    }
  }

  /** The row whose emitter the second hint frames, if any. */
  get hintRow(): number | null {
    return this._hintRow;
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
    this.boardEffects.clearResidue();
    this.animator.play(result, {
      ...callbacks,
      onBounce: (bounceNumber, at) => {
        // A pellet going through a portal lights up both of them.
        const flashed = at.bounceKind === "portal" ? this.portals : [at];
        for (const { x, y } of flashed) {
          const center = this.cellCenter(x, y);
          this.boardEffects.addFlash(center.x, center.y, "mirror");
          this.leaveLight(x, y, at.bounceKind);
        }
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
    this.drawCell(x, y);
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
    this.tableLight.update(deltaMs, this.animator.beamLight);
    this.updateWave(deltaMs);
    this.updateTurns(deltaMs);
    this.updatePlacings(deltaMs);
    this.updateAmbient(deltaMs);
    this.updateIntro(deltaMs);
    this.boardEffects.update(deltaMs);
    this.updateShake(deltaMs);
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
      this.boardEffects.addSparks(impact.x, impact.y, -delta.x, -delta.y);
      if (last.cell === "wall") {
        this.boardEffects.addResidue({
          kind: "face",
          ...impact,
          dx: delta.x,
          dy: delta.y,
        });
      }
      if (last.becomes && !prefersReducedMotion()) {
        this.shakeMs = 0;
      }
    }
  }

  /**
   * Leaves the beam's light on the piece at board cell (x, y) that turned
   * it: along a mirror's glass, a spot on a reflector or portal. A glass
   * mirror shatters, so it keeps none.
   */
  private leaveLight(x: number, y: number, kind: BounceKind | undefined): void {
    if (kind === "mirror" || kind === "fixed") {
      this.boardEffects.addResidue({
        kind: "glass",
        view: this.cellViews[y][x],
      });
    } else if (kind === "reflector" || kind === "portal") {
      this.boardEffects.addResidue({ kind: "spot", ...this.cellCenter(x, y) });
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
    this.bases.alpha = panelAlpha;
    this.rail.alpha = panelAlpha;
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
    this.bases.alpha = 1;
    this.rail.alpha = 1;
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

  /** Shakes the board for a moment after stone breaks. */
  private updateShake(deltaMs: number): void {
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
   * emitter's glow and the hint's frame pulse. Bonus targets turn, pulse
   * faster, and give off sparkles; ripples drift into the portals. Still
   * when the player prefers reduced motion.
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
          view.scale.set(1 + 0.08 * bonusBreath);
          view.alpha = 0.85 + 0.15 * bonusBreath;
          view.rotation = this.ambientMs * BONUS_SPIN;
          if (sparkle) {
            const center = this.cellCenter(x, y);
            this.boardEffects.addSparkle(center.x, center.y);
          }
        }
      }),
    );
    this.drawRipples((this.ambientMs / PORTAL_RIPPLE_MS) % 1);
    this.placePreview.alpha = 0.65 + 0.35 * breath;
    this.hintMark.alpha = 0.55 + 0.45 * breath;
    if (this.selectedRow !== null) {
      this.launchers[this.selectedRow].alpha = 0.75 + 0.25 * breath;
    }
  }

  /**
   * Changes a cell; a mirror flipping to the other mirror rotates into
   * place, and a broken wall or shattered glass mirror bursts into pieces.
   */
  private changeCell(x: number, y: number, cell: CellType): void {
    const view = this.cellViews[y][x];
    const previous = this.cells[y][x];
    this.cells[y][x] = cell;
    if (!(isMirror(previous) && isMirror(cell))) {
      this.drawCell(x, y);
      if (previous === "breakable" || isGlassMirror(previous)) {
        const center = this.cellCenter(x, y);
        this.boardEffects.addDebris(
          center.x,
          center.y,
          previous === "breakable" ? "stone" : "glass",
        );
      }
      return;
    }

    // Always turn clockwise. If the mirror is still turning from an earlier
    // flip, continue from where it is towards one more quarter turn.
    const existing = this.turns.find((turn) => turn.view === view);
    const target = (existing ? existing.to : view.rotation) + Math.PI / 2;
    this.turns = this.turns.filter((turn) => turn !== existing);
    this.turns.push({
      view,
      from: view.rotation,
      to: target,
      elapsedMs: 0,
      durationMs: MIRROR_TURN_MS,
    });
    this.boardEffects.addGlint(view);
  }

  /** Spreads the ending's wave and lights the pieces it reaches. */
  private updateWave(deltaMs: number): void {
    const wave = this.wave;
    const g = this.waveLayer.clear();
    if (!wave) {
      return;
    }
    wave.radius += (this.cellSize * WAVE_SPEED * deltaMs) / 1000;
    const { origin, radius } = wave;
    const far = Math.hypot(
      (this.boardWidth + 1) * this.cellSize,
      this.boardHeight * this.cellSize,
    );
    if (radius > far + WAVE_BAND * BONUS_COLORS.length) {
      this.wave = null;
      return;
    }
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const key = `${x},${y}`;
        if (cell === "empty" || wave.reached.has(key)) {
          return;
        }
        const center = this.cellCenter(x, y);
        const distance = Math.hypot(center.x - origin.x, center.y - origin.y);
        if (distance > radius) {
          return;
        }
        wave.reached.add(key);
        const color =
          BONUS_COLORS[
            Math.floor(distance / (this.cellSize * 0.7)) % BONUS_COLORS.length
          ];
        this.boardEffects.addFlash(center.x, center.y, "wave", color);
        if (isMirror(cell)) {
          this.halfTurn(this.cellViews[y][x]);
        }
      }),
    );
    const fade = Math.max(0, 1 - radius / far);
    BONUS_COLORS.forEach((color, i) => {
      const r = radius - i * WAVE_BAND;
      if (r > 0) {
        g.circle(origin.x, origin.y, r).stroke({
          width: 3,
          color,
          alpha: 0.55 * fade,
        });
      }
    });
  }

  /**
   * A mirror turns half way round, ending as it was; one still turning
   * from a flip keeps that flip.
   */
  private halfTurn(view: Graphics): void {
    const existing = this.turns.find((turn) => turn.view === view);
    const target = (existing ? existing.to : view.rotation) + Math.PI;
    this.turns = this.turns.filter((turn) => turn !== existing);
    this.turns.push({
      view,
      from: view.rotation,
      to: target,
      elapsedMs: 0,
      durationMs: WAVE_TURN_MS,
    });
    this.boardEffects.addGlint(view);
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
      const t = Math.min(1, turn.elapsedMs / turn.durationMs);
      const eased = 1 - (1 - t) ** 3;
      turn.view.rotation = turn.from + (turn.to - turn.from) * eased;
    }
    this.turns = this.turns.filter((turn) => {
      if (turn.elapsedMs < turn.durationMs) {
        return true;
      }
      // Keep rotations small; a half turn looks the same for a mirror.
      turn.view.rotation = turn.to % Math.PI;
      return false;
    });
  }

  private redrawCells(): void {
    this.cells.forEach((row, y) => row.forEach((_, x) => this.drawCell(x, y)));
    this.drawBases();
  }

  /** The mounts under the goal crystal and bonus gems, as the cells are now. */
  private drawBases(): void {
    const g = this.bases.clear();
    this.cells.forEach((row, y) =>
      row.forEach((cell, x) => {
        const center = this.cellCenter(x, y);
        drawCellBase(g, cell, this.cellSize, center.x, center.y);
      }),
    );
  }

  /**
   * Rings drifting into each portal's field, `phase` (0–1) of the way
   * through a ring's journey from the rim to the centre; brightest half
   * way in.
   */
  private drawRipples(phase: number): void {
    const g = this.ripples.clear();
    const field = (this.cellSize / 2) * PORTAL_FIELD;
    for (const { x, y } of this.portals) {
      const center = this.cellCenter(x, y);
      for (let i = 0; i < PORTAL_RIPPLES; i++) {
        const k = 1 - ((i / PORTAL_RIPPLES + phase) % 1);
        if (k > 0.05) {
          g.circle(center.x, center.y, field * k).stroke({
            width: 1.4,
            color: COLORS.portalRipple,
            alpha: 0.33 * 4 * k * (1 - k),
          });
        }
      }
    }
  }

  /**
   * The cells as they look now, for the browser smoke tests: a mirror's or
   * glass mirror's direction is read from its drawing's rotation (drawn as
   * `\`, a quarter turn shows `/`), so a turn ending at the wrong angle
   * shows. Null for a mirror still turning.
   */
  shownCells(): (CellType | null)[][] {
    return this.cells.map((row, y) =>
      row.map((cell, x) => {
        const glass = isGlassMirror(cell);
        if (!isMirror(cell) && !glass) {
          return cell;
        }
        const quarters = this.cellViews[y][x].rotation / (Math.PI / 2);
        const nearest = Math.round(quarters);
        if (Math.abs(quarters - nearest) > 0.01) {
          return null;
        }
        if (glass) {
          return nearest % 2 === 0 ? "glassBackslash" : "glassSlash";
        }
        return nearest % 2 === 0 ? "mirrorBackslash" : "mirrorSlash";
      }),
    );
  }

  /** Pixel centre of board cell (x, y); x = -1 is the launcher column. */
  cellCenter(x: number, y: number): { x: number; y: number } {
    return {
      x: (x + 1.5) * this.cellSize,
      y: (y + 0.5) * this.cellSize,
    };
  }

  /** The optical table under the cells; see drawTable(). */
  private drawPanel(tint: number | null): Graphics {
    const g = new Graphics();
    g.x = this.cellSize;
    drawTable(g, this.boardWidth, this.boardHeight, this.cellSize, tint);
    return g;
  }

  /** Draws board cell (x, y) as it is now into its view. */
  private drawCell(x: number, y: number): void {
    drawCell(
      this.cellViews[y][x],
      this.cells[y][x],
      this.cellSize,
      this.goalHits,
    );
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

  /** A laser head; the selected one is lit in the beam colour. */
  private drawLauncher(g: Graphics, selected: boolean): void {
    drawEmitter(g, this.cellSize, selected);
  }
}
