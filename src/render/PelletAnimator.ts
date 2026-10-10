import { Container, Graphics } from "pixi.js";
import type { ShotOutcome, ShotResult } from "../game/simulate";
import type { CellType } from "../game/types";
import { pathPoints } from "./pathPoints";
import type { PathPoint } from "./pathPoints";
import { COLORS } from "./theme";

const SPEED_CELLS_PER_SECOND = 9;

export interface ShotCallbacks {
  /** Called as the pellet reaches each mirror; numbered from 1 per shot. */
  onBounce: (bounceNumber: number) => void;
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
 * beam that reached the goal turns green; a miss dims and gets an end marker
 * whose shape tells the outcome (see docs/DESIGN.md, Readability).
 */
export class PelletAnimator extends Container {
  private readonly cellSize: number;
  private readonly toPixels: (x: number, y: number) => { x: number; y: number };
  private readonly trail = new Graphics();
  private readonly pellet = new Graphics();

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
  }

  update(deltaMs: number): void {
    if (this.playing) {
      this.advance((SPEED_CELLS_PER_SECOND * this.cellSize * deltaMs) / 1000);
    }
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
      const { bounce, becomes, x, y } = to.cell;
      if (becomes) {
        this.callbacks?.onCellChange(x, y, becomes);
      }
      if (bounce) {
        this.callbacks?.onBounce(++this.bounces);
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
    this.drawBeam([...this.points.slice(0, this.segment + 1), head], {
      color: COLORS.beam,
      dimmed: false,
    });
    this.pellet.position.set(head.x, head.y);
  }

  private finish(): void {
    this.playing = false;
    this.pellet.visible = false;
    if (this.outcome === "goal") {
      this.drawBeam(this.points, { color: COLORS.success, dimmed: false });
    } else {
      this.drawBeam(this.points, { color: COLORS.beam, dimmed: true });
      this.drawEndMarker();
    }
    this.callbacks?.onFinish();
  }

  /** A coloured band with a thin bright core; dimmed for a missed shot. */
  private drawBeam(
    points: { x: number; y: number }[],
    style: { color: number; dimmed: boolean },
  ): void {
    const g = this.trail.clear();
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
