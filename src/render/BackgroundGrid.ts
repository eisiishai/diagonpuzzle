import { Container, Graphics } from "pixi.js";
import { drift, prefersReducedMotion } from "./ambient";
import { COLORS } from "./theme";

const SPACING = 48;
/** Pixels per second (CSS pixels) the grid drifts, down and to the right. */
const SPEED = 1.5;
const LINE_ALPHA = 0.35;

/**
 * A faint grid filling the screen behind every scene, slowly drifting
 * diagonally. Still when the player prefers reduced motion.
 *
 * Lines are one screen pixel wide and sit exactly on the screen's pixel grid,
 * and the grid moves in whole screen pixels, so lines stay crisp and never
 * shimmer between pixels while moving.
 */
export class BackgroundGrid extends Container {
  private readonly lines = new Graphics();
  /** Screen pixels per CSS pixel: the renderer's resolution. */
  private readonly resolution: number;
  private timeMs = 0;

  constructor(resolution: number) {
    super();
    this.resolution = resolution;
    this.eventMode = "none";
    this.addChild(this.lines);
  }

  /** Redraws the grid to cover a screen of the given size (CSS pixels). */
  resize(width: number, height: number): void {
    const pixel = 1 / this.resolution;
    // Centred on a screen pixel, so a one-pixel line covers exactly one.
    const align = pixel / 2;
    // One extra spacing on each side, so drifting never shows an edge.
    const g = this.lines.clear();
    for (let x = -SPACING; x <= width + SPACING; x += SPACING) {
      g.moveTo(x + align, -SPACING).lineTo(x + align, height + SPACING);
    }
    for (let y = -SPACING; y <= height + SPACING; y += SPACING) {
      g.moveTo(-SPACING, y + align).lineTo(width + SPACING, y + align);
    }
    g.stroke({ width: pixel, color: COLORS.grid, alpha: LINE_ALPHA });
  }

  update(deltaMs: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.timeMs += deltaMs;
    // Round down to whole screen pixels: the grid steps one pixel at a time.
    const exact = drift(this.timeMs, SPEED, SPACING);
    const offset = Math.floor(exact * this.resolution) / this.resolution;
    this.lines.position.set(offset, offset);
  }
}
