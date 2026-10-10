import { Container, Graphics } from "pixi.js";
import type { ShotOutcome, ShotResult } from "../game/simulate";
import { pathPoints } from "./pathPoints";

const SPEED_CELLS_PER_SECOND = 9;
const TRAIL_COLOR = 0xfbbf24;
const PELLET_COLOR = 0xfff7d6;

const OUTCOME_COLORS: Record<ShotOutcome, number> = {
  goal: 0x4ade80,
  exit: 0xf87171,
  blocked: 0xf87171,
  loop: 0xc084fc,
};

export interface ShotCallbacks {
  /** Called as the pellet reaches each mirror; numbered from 1 per shot. */
  onBounce: (bounceNumber: number) => void;
  /** Called once when the pellet reaches the end of its path. */
  onFinish: () => void;
}

interface PixelPoint {
  x: number;
  y: number;
  bounce: boolean;
}

/** Moves a pellet along a shot's path, drawing its trail behind it. */
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
    this.pellet.circle(0, 0, cellSize * 0.12).fill(PELLET_COLOR);
    this.pellet.visible = false;
    this.addChild(this.trail, this.pellet);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  play(result: ShotResult, callbacks: ShotCallbacks): void {
    this.points = pathPoints(result).map((p) => ({
      ...this.toPixels(p.x, p.y),
      bounce: p.bounce,
    }));
    this.outcome = result.outcome;
    this.callbacks = callbacks;
    this.segment = 0;
    this.segmentProgress = 0;
    this.bounces = 0;
    this.playing = true;
    this.pellet.visible = true;
    this.advance(0);
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
      if (to.bounce) {
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
    this.drawTrail(
      [...this.points.slice(0, this.segment + 1), head],
      TRAIL_COLOR,
    );
    this.pellet.position.set(head.x, head.y);
  }

  private finish(): void {
    this.playing = false;
    this.pellet.visible = false;
    const color = OUTCOME_COLORS[this.outcome];
    this.drawTrail(this.points, color);
    const end = this.points[this.points.length - 1];
    if (end) {
      this.trail.circle(end.x, end.y, this.cellSize * 0.12).fill(color);
    }
    this.callbacks?.onFinish();
  }

  private drawTrail(points: { x: number; y: number }[], color: number): void {
    const g = this.trail.clear();
    if (points.length < 2) {
      return;
    }
    g.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) {
      g.lineTo(p.x, p.y);
    }
    g.stroke({ width: 4, color, cap: "round", join: "round" });
  }
}
