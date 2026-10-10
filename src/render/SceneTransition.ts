import { Container, Graphics } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import { easeInOutCubic } from "./easing";
import { COLORS } from "./theme";

const WIPE_MS = 500;
/** The beam's glow: widths in pixels and opacities, widest first. */
const BEAM_LAYERS = [
  { width: 52, color: COLORS.beam, alpha: 0.1 },
  { width: 22, color: COLORS.beam, alpha: 0.22 },
  { width: 6, color: COLORS.beam, alpha: 0.75 },
  { width: 2, color: COLORS.beamCore, alpha: 1 },
];

/** Which way the beam sweeps: into a level rightwards, back to the title leftwards. */
export type WipeDirection = "right" | "left";

interface Wipe {
  from: Container;
  to: Container;
  direction: WipeDirection;
  elapsedMs: number;
}

/**
 * The beam wipe between two scenes: a laser line sweeps across the screen,
 * revealing the new scene behind it while the old one still shows ahead of
 * it. The old scene ignores input during the wipe and is destroyed at its
 * end. An instant cut when the player prefers reduced motion. See
 * docs/DESIGN.md, Light and motion.
 */
export class SceneTransition extends Container {
  private readonly oldMask = new Graphics();
  private readonly newMask = new Graphics();
  private readonly beam = new Graphics();
  private wipe: Wipe | null = null;
  private screenWidth = 0;
  private screenHeight = 0;

  constructor() {
    super();
    this.eventMode = "none";
    this.addChild(this.oldMask, this.newMask, this.beam);
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.update(0);
  }

  /** Wipes from scene `from` to `to`; `to` must already be on the stage. */
  start(from: Container, to: Container, direction: WipeDirection): void {
    this.finish();
    if (prefersReducedMotion()) {
      from.destroy({ children: true });
      return;
    }
    from.eventMode = "none";
    from.interactiveChildren = false;
    from.mask = this.oldMask;
    to.mask = this.newMask;
    this.wipe = { from, to, direction, elapsedMs: 0 };
    this.update(0);
  }

  update(deltaMs: number): void {
    const wipe = this.wipe;
    if (!wipe) {
      return;
    }
    wipe.elapsedMs += deltaMs;
    if (wipe.elapsedMs >= WIPE_MS) {
      this.finish();
      return;
    }
    const width = this.screenWidth;
    const progress = easeInOutCubic(wipe.elapsedMs / WIPE_MS);
    const x =
      wipe.direction === "right" ? width * progress : width * (1 - progress);
    const [left, right] =
      wipe.direction === "right"
        ? [this.newMask, this.oldMask]
        : [this.oldMask, this.newMask];
    this.drawStrip(left, -10, x);
    this.drawStrip(right, x, width + 10);

    const g = this.beam.clear();
    for (const layer of BEAM_LAYERS) {
      g.rect(x - layer.width / 2, 0, layer.width, this.screenHeight).fill({
        color: layer.color,
        alpha: layer.alpha,
      });
    }
  }

  /** Ends any wipe in progress at once. */
  finish(): void {
    const wipe = this.wipe;
    if (!wipe) {
      return;
    }
    this.wipe = null;
    wipe.to.mask = null;
    wipe.from.mask = null;
    wipe.from.destroy({ children: true });
    this.oldMask.clear();
    this.newMask.clear();
    this.beam.clear();
  }

  /**
   * A full-height mask from x = `from` to `to`. An empty strip becomes a
   * tiny rectangle off screen, so the masked scene is hidden rather than
   * shown unmasked.
   */
  private drawStrip(mask: Graphics, from: number, to: number): void {
    mask.clear();
    if (to - from < 0.5) {
      mask.rect(-20, -20, 1, 1).fill(0xffffff);
      return;
    }
    mask.rect(from, -10, to - from, this.screenHeight + 20).fill(0xffffff);
  }
}
