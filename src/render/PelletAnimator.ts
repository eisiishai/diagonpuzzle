import { Container, Graphics } from "pixi.js";
import type { ShotOutcome, ShotResult } from "../game/simulate";
import type { CellType } from "../game/types";
import { prefersReducedMotion } from "./ambient";
import { pathPoints } from "./pathPoints";
import { distinctPoints, pointsAlong } from "./polyline";
import type { PathPoint } from "./pathPoints";
import { COLORS } from "./theme";

const SPEED_CELLS_PER_SECOND = 9;
/** The ghost of the previous shot fades in over this long. */
const GHOST_FADE_MS = 250;
/** While a new shot travels, the ghost dims to this, so the beam leads. */
const GHOST_IN_FLIGHT = 0.5;
/** Chevrons along the ghost: spacing and first one's distance, in cells. */
const GHOST_CHEVRON_SPACING = 1.5;
const GHOST_CHEVRON_START = 0.75;
/** The comet tail behind the moving front: its length in cells and dots. */
const TAIL_CELLS = 0.75;
const TAIL_DOTS = 12;

export interface ShotCallbacks {
  /**
   * Called as the pellet reaches each mirror, at board cell `at`; bounces
   * are numbered from 1 per shot.
   */
  onBounce: (bounceNumber: number, at: { x: number; y: number }) => void;
  /** Called as the pellet changes a cell, at the moment it hits it. */
  onCellChange: (x: number, y: number, cell: CellType) => void;
  /** Called once when the pellet reaches the end of its path. */
  onFinish: () => void;
}

interface PixelPoint {
  /** Position in pixels. */
  x: number;
  y: number;
  /** The path point in board cell coordinates. */
  cell: PathPoint;
}

/**
 * Moves a pellet along a shot's path as a laser beam. When the shot ends, a
 * beam that reached the goal turns green and one that hit a bonus target
 * gold; a miss dims and gets an end marker whose shape tells the outcome
 * (see docs/DESIGN.md, Readability).
 */
export class PelletAnimator extends Container {
  private readonly cellSize: number;
  private readonly toPixels: (x: number, y: number) => { x: number; y: number };
  private readonly trail = new Graphics();
  private readonly pellet = new Graphics();
  /**
   * Faint light on the panel under the beam, brightest around the moving
   * front. Not a child: the board view places it under the cells.
   */
  readonly light = new Graphics();
  /**
   * The previous shot's path while the next one plays and after it: a very
   * dim band with chevrons showing its direction. Not a child either: the
   * board view places it under the cells, with the light.
   */
  readonly ghost = new Graphics();
  /** Time since the ghost appeared, for its fade-in. */
  private ghostMs = 0;

  private points: PixelPoint[] = [];
  private outcome: ShotOutcome = "exit";
  private callbacks?: ShotCallbacks;
  /** Index of the last point the pellet has passed. */
  private segment = 0;
  /** Pixels travelled from points[segment] towards the next point. */
  private segmentProgress = 0;
  private bounces = 0;
  private playing = false;

  constructor(
    cellSize: number,
    toPixels: (x: number, y: number) => { x: number; y: number },
  ) {
    super();
    this.cellSize = cellSize;
    this.toPixels = toPixels;
    this.pellet
      .circle(0, 0, cellSize * 0.17)
      .fill({ color: COLORS.beam, alpha: 0.5 })
      .circle(0, 0, cellSize * 0.09)
      .fill(COLORS.beamCore);
    this.pellet.visible = false;
    this.addChild(this.trail, this.pellet);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  play(result: ShotResult, callbacks: ShotCallbacks): void {
    // The shot before this one stays as a ghost until the next shot.
    this.drawGhost(this.points);
    this.ghostMs = 0;
    this.points = pathPoints(result).map((cell) => ({
      ...this.toPixels(cell.x, cell.y),
      cell,
    }));
    // Start at the emitter's nozzle rather than its centre.
    if (this.points.length > 0) {
      this.points[0].x += this.cellSize * 0.3;
    }
    this.outcome = result.outcome;
    this.callbacks = callbacks;
    this.segment = 0;
    this.segmentProgress = 0;
    this.bounces = 0;
    this.playing = true;
    this.pellet.visible = true;
    this.advance(0);
  }

  /** Stops any shot in progress and removes the trail. */
  clear(): void {
    this.playing = false;
    this.callbacks = undefined;
    this.pellet.visible = false;
    this.trail.clear();
    this.light.clear();
    this.ghost.clear();
    this.points = [];
  }

  update(deltaMs: number): void {
    if (this.playing) {
      this.advance((SPEED_CELLS_PER_SECOND * this.cellSize * deltaMs) / 1000);
    }
    this.ghostMs += deltaMs;
    const fade = prefersReducedMotion()
      ? 1
      : Math.min(1, this.ghostMs / GHOST_FADE_MS);
    this.ghost.alpha = fade * (this.playing ? GHOST_IN_FLIGHT : 1);
  }

  /**
   * The ghost of a shot along `allPoints`: a very dim band in the beam's
   * colour with small chevrons pointing the way it went, without the beam's
   * bright core or end marker, so it reads as the past shot. Nothing if
   * there was no shot.
   */
  private drawGhost(allPoints: { x: number; y: number }[]): void {
    const g = this.ghost.clear();
    const points = distinctPoints(allPoints);
    if (points.length < 2) {
      return;
    }
    g.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) {
      g.lineTo(p.x, p.y);
    }
    g.stroke({
      width: this.cellSize * 0.2,
      color: COLORS.beam,
      alpha: 0.1,
      cap: "round",
      join: "round",
    });
    const size = this.cellSize * 0.07;
    const total = points
      .slice(1)
      .reduce(
        (sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y),
        0,
      );
    const start = this.cellSize * GHOST_CHEVRON_START;
    const spacing = this.cellSize * GHOST_CHEVRON_SPACING;
    const chevrons = pointsAlong(points, start, spacing).filter(
      // Leave the last stretch bare, where the shot ended.
      (_, i) => start + i * spacing < total - this.cellSize * 0.3,
    );
    for (const p of chevrons) {
      const cos = Math.cos(p.angle);
      const sin = Math.sin(p.angle);
      const at = (along: number, across: number) => ({
        x: p.x + along * cos - across * sin,
        y: p.y + along * sin + across * cos,
      });
      const back1 = at(-size * 0.75, -size);
      const tip = at(size * 0.5, 0);
      const back2 = at(-size * 0.75, size);
      g.moveTo(back1.x, back1.y).lineTo(tip.x, tip.y).lineTo(back2.x, back2.y);
    }
    g.stroke({
      width: 1.5,
      color: COLORS.beam,
      alpha: 0.5,
      cap: "round",
      join: "round",
    });
  }

  private advance(distance: number): void {
    const { points } = this;
    while (this.segment < points.length - 1) {
      const from = points[this.segment];
      const to = points[this.segment + 1];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const remaining = length - this.segmentProgress;
      if (distance < remaining) {
        this.segmentProgress += distance;
        break;
      }
      distance -= remaining;
      this.segment++;
      this.segmentProgress = 0;
      const { bounce, becomes, changedCell = to.cell } = to.cell;
      if (becomes) {
        this.callbacks?.onCellChange(changedCell.x, changedCell.y, becomes);
      }
      if (bounce) {
        this.callbacks?.onBounce(++this.bounces, to.cell);
      }
    }

    if (this.segment >= points.length - 1) {
      this.finish();
    } else {
      this.draw();
    }
  }

  private currentPosition(): { x: number; y: number } {
    const from = this.points[this.segment];
    const to = this.points[this.segment + 1];
    if (!to) {
      return from;
    }
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const t = length === 0 ? 0 : this.segmentProgress / length;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }

  private draw(): void {
    const head = this.currentPosition();
    const path = [...this.points.slice(0, this.segment + 1), head];
    this.drawBeam(path, { color: COLORS.beam, dimmed: false });
    this.drawTail();
    this.drawLight(path, COLORS.beam, 1, head);
    this.pellet.position.set(head.x, head.y);
  }

  /** A short fading comet tail behind the front, drawn over the beam. */
  private drawTail(): void {
    const g = this.trail;
    for (let i = TAIL_DOTS; i >= 1; i--) {
      const t = i / TAIL_DOTS;
      const p = this.pointBehind(t * this.cellSize * TAIL_CELLS);
      g.circle(p.x, p.y, this.cellSize * (0.16 - 0.1 * t)).fill({
        color: COLORS.beam,
        alpha: 0.32 * (1 - t),
      });
    }
  }

  /** The point `distance` pixels back along the path from the front. */
  private pointBehind(distance: number): { x: number; y: number } {
    let { x, y } = this.currentPosition();
    let remaining = distance;
    for (let i = this.segment; i >= 0; i--) {
      const p = this.points[i];
      const length = Math.hypot(x - p.x, y - p.y);
      if (length >= remaining && length > 0) {
        const t = remaining / length;
        return { x: x + (p.x - x) * t, y: y + (p.y - y) * t };
      }
      remaining -= length;
      x = p.x;
      y = p.y;
    }
    return { x, y };
  }

  /**
   * Faint light on the panel along `allPoints`, at `strength` (0–1), with
   * a soft glow around `head` while the beam is still moving.
   */
  private drawLight(
    allPoints: { x: number; y: number }[],
    color: number,
    strength: number,
    head?: { x: number; y: number },
  ): void {
    const g = this.light.clear();
    const points = distinctPoints(allPoints);
    if (points.length >= 2) {
      for (const width of [0.95, 0.5]) {
        g.moveTo(points[0].x, points[0].y);
        for (const p of points.slice(1)) {
          g.lineTo(p.x, p.y);
        }
        g.stroke({
          width: this.cellSize * width,
          color,
          alpha: 0.05 * strength,
          cap: "round",
          join: "round",
        });
      }
    }
    if (head) {
      for (const radius of [1, 0.75, 0.5, 0.3]) {
        g.circle(head.x, head.y, this.cellSize * radius).fill({
          color,
          alpha: 0.05,
        });
      }
    }
  }

  private finish(): void {
    this.playing = false;
    this.pellet.visible = false;
    if (this.outcome === "goal") {
      this.drawBeam(this.points, { color: COLORS.success, dimmed: false });
      this.drawLight(this.points, COLORS.success, 1);
    } else if (this.outcome === "bonus") {
      this.drawBeam(this.points, { color: COLORS.star, dimmed: false });
      this.drawLight(this.points, COLORS.star, 1);
    } else {
      this.drawBeam(this.points, { color: COLORS.beam, dimmed: true });
      this.drawEndMarker();
      this.drawLight(this.points, COLORS.beam, 0.4);
    }
    this.callbacks?.onFinish();
  }

  /** A coloured band with a thin bright core; dimmed for a missed shot. */
  private drawBeam(
    allPoints: { x: number; y: number }[],
    style: { color: number; dimmed: boolean },
  ): void {
    const g = this.trail.clear();
    // The moving head can sit exactly on the last corner; a repeated point
    // breaks the stroke on some phone GPUs (see polyline.ts).
    const points = distinctPoints(allPoints);
    if (points.length < 2) {
      return;
    }
    const path = () => {
      g.moveTo(points[0].x, points[0].y);
      for (const p of points.slice(1)) {
        g.lineTo(p.x, p.y);
      }
    };
    path();
    g.stroke({
      width: this.cellSize * 0.2,
      color: style.color,
      alpha: style.dimmed ? 0.12 : 0.4,
      cap: "round",
      join: "round",
    });
    path();
    g.stroke({
      width: 2.5,
      color: COLORS.beamCore,
      alpha: style.dimmed ? 0.3 : 1,
      cap: "round",
      join: "round",
    });
  }

  /**
   * Marks where a missed shot ended, by shape: × at a wall, a chevron pointing
   * the way it left the board, a ring for a loop.
   */
  private drawEndMarker(): void {
    const end = this.points[this.points.length - 1];
    const before = this.points[this.points.length - 2];
    if (!end || !before) {
      return;
    }
    const g = this.trail;
    const r = this.cellSize * 0.15;
    const stroke = {
      width: 3,
      color: COLORS.beam,
      cap: "round",
      join: "round",
    } as const;

    if (this.outcome === "blocked") {
      g.moveTo(end.x - r, end.y - r)
        .lineTo(end.x + r, end.y + r)
        .moveTo(end.x + r, end.y - r)
        .lineTo(end.x - r, end.y + r)
        .stroke(stroke);
    } else if (this.outcome === "exit") {
      const length = Math.hypot(end.x - before.x, end.y - before.y) || 1;
      const dx = (end.x - before.x) / length;
      const dy = (end.y - before.y) / length;
      g.moveTo(end.x - dx * r - dy * r, end.y - dy * r + dx * r)
        .lineTo(end.x + dx * r, end.y + dy * r)
        .lineTo(end.x - dx * r + dy * r, end.y - dy * r - dx * r)
        .stroke(stroke);
    } else {
      g.circle(end.x, end.y, r).stroke(stroke);
    }
  }
}
