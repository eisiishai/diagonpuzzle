import { Container, Graphics } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import { easeInOutCubic, easeOutCubic } from "./easing";
import { BONUS_COLORS, COLORS } from "./theme";

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

/** A small twinkle near a bonus target. */
interface Sparkle {
  view: Graphics;
  ageMs: number;
}

const SPARKLE_LIFE_MS = 750;

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
 * Short-lived effects over the board's cells: flashes, glints and sparks
 * (redrawn each frame), bonus target sparkles and pieces of broken walls.
 * Positions are in the board view's pixels. The owner adds the three layers
 * in its own drawing order and calls update() every frame.
 */
export class BoardEffects {
  /** Flashes, glints and sparks, redrawn each frame above the cells. */
  readonly lightLayer = new Graphics();
  /** Sparkles around bonus targets, above the cells and under the beam. */
  readonly sparkleLayer = new Container();
  /** Pieces of broken walls, above the cells. */
  readonly debrisLayer = new Container();
  private readonly cellSize: number;
  private flashes: Flash[] = [];
  private glints: Glint[] = [];
  private sparks: Spark[] = [];
  private sparkles: Sparkle[] = [];
  private debris: Debris[] = [];

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  /**
   * A flash where the beam reflects off a mirror, or on a goal crystal hit
   * (with a diamond ring, unless the player prefers reduced motion).
   */
  addFlash(x: number, y: number, kind: Flash["kind"]): void {
    this.flashes.push({ x, y, kind, ageMs: 0 });
  }

  /**
   * A glint along mirror `view` as it turns, replacing one still running on
   * it. Nothing when the player prefers reduced motion.
   */
  addGlint(view: Graphics): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.glints = this.glints.filter((glint) => glint.view !== view);
    this.glints.push({ view, ageMs: 0 });
  }

  /** Sparks fanning out from (x, y) in pixels, heading roughly (dx, dy). */
  addSparks(x: number, y: number, dx: number, dy: number): void {
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

  /** A four-pointed twinkle at a random spot around a bonus target at (x, y). */
  addSparkle(x: number, y: number): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = this.cellSize * (0.25 + Math.random() * 0.3);
    const r = this.cellSize * (0.05 + Math.random() * 0.05);
    const w = r * 0.25;
    const colors = [...BONUS_COLORS, COLORS.beamCore];
    const view = new Graphics()
      .poly([0, -r, w, -w, r, 0, w, w, 0, r, -w, w, -r, 0, -w, -w])
      .fill(colors[Math.floor(Math.random() * colors.length)]);
    view.position.set(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
    );
    view.scale.set(0);
    this.sparkleLayer.addChild(view);
    this.sparkles.push({ view, ageMs: 0 });
  }

  /** A breakable wall centred at (x, y) bursts into stone pieces that fall away. */
  addDebris(x: number, y: number): void {
    const size = this.cellSize;
    for (let i = 0; i < 10; i++) {
      const r = size * (0.06 + Math.random() * 0.07);
      const view = new Graphics()
        .poly([-r, -r * 0.6, r * 0.8, -r, r, r * 0.7, -r * 0.5, r])
        .fill(i % 3 === 0 ? COLORS.stoneEdge : COLORS.stone);
      view.position.set(
        x + (Math.random() - 0.5) * size * 0.6,
        y + (Math.random() - 0.5) * size * 0.6,
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

  /**
   * Stops the flashes, glints and sparks at once (as a level restarts).
   * Sparkles and falling debris finish on their own.
   */
  clearLight(): void {
    this.flashes = [];
    this.glints = [];
    this.sparks = [];
    this.lightLayer.clear();
  }

  update(deltaMs: number): void {
    this.updateDebris(deltaMs);
    this.updateSparkles(deltaMs);
    this.updateLight(deltaMs);
  }

  /** Moves and redraws flashes, glints and sparks. */
  private updateLight(deltaMs: number): void {
    const g = this.lightLayer.clear();
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
}
