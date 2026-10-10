import { Container, Graphics, Text } from "pixi.js";
import { TEXT_STYLE, UI_COLORS } from "./ui";

const BURST_COLORS = [0xfbbf24, 0xfde68a, 0x4ade80, 0xffffff];
const RAIN_COLORS = [0xfbbf24, 0x4ade80, 0x60a5fa, 0xf472b6, 0xffffff];

const RING_LIFE_MS = 650;
const BANNER_POP_MS = 400;
const BANNER_HOLD_MS = 3500;
const BANNER_FADE_MS = 1000;

interface Particle {
  view: Graphics;
  vx: number;
  vy: number;
  gravity: number;
  spin: number;
  ageMs: number;
  lifeMs: number;
}

interface Ring {
  view: Graphics;
  ageMs: number;
}

interface Banner {
  view: Text;
  ageMs: number;
}

/**
 * Par celebrations, drawn on top of a scene: bursts of stars, an expanding
 * ring, stars raining over the scene and a banner. Runs on update() and
 * cleans up after itself; positions are in the parent scene's coordinates.
 */
export class Celebration extends Container {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private banner?: Banner;

  constructor() {
    super();
    // Effects must never block clicks on the buttons underneath.
    this.eventMode = "none";
  }

  /** Level completed in par: stars burst from (x, y) and a ring expands. */
  parBurst(x: number, y: number, size: number): void {
    this.addRing(x, y, size);
    this.addBurst(x, y, size, 26);
  }

  /**
   * The last star earned: a bigger burst at (x, y), stars raining over the
   * `width` × `height` area from its top, and a banner in its middle.
   */
  allParCelebration(
    x: number,
    y: number,
    size: number,
    width: number,
    height: number,
    bannerText: string,
  ): void {
    this.addRing(x, y, size);
    this.addBurst(x, y, size * 1.4, 60);
    this.addRain(width, height, size, 140);
    this.addBanner(width / 2, height / 2, width, bannerText);
  }

  update(deltaMs: number): void {
    const seconds = deltaMs / 1000;

    for (const p of this.particles) {
      p.ageMs += deltaMs;
      p.vy += p.gravity * seconds;
      p.view.x += p.vx * seconds;
      p.view.y += p.vy * seconds;
      p.view.rotation += p.spin * seconds;
      const t = p.ageMs / p.lifeMs;
      p.view.alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
    }
    this.particles = this.removeExpired(
      this.particles,
      (p) => p.ageMs >= p.lifeMs,
    );

    for (const ring of this.rings) {
      ring.ageMs += deltaMs;
      const t = Math.min(1, ring.ageMs / RING_LIFE_MS);
      ring.view.scale.set(1 + 2.5 * (1 - (1 - t) ** 3));
      ring.view.alpha = 1 - t;
    }
    this.rings = this.removeExpired(
      this.rings,
      (ring) => ring.ageMs >= RING_LIFE_MS,
    );

    if (this.banner) {
      this.updateBanner(this.banner, deltaMs);
    }
  }

  private addRing(x: number, y: number, size: number): void {
    const view = new Graphics()
      .circle(0, 0, size * 0.32)
      .stroke({ width: 4, color: UI_COLORS.highlight });
    view.position.set(x, y);
    this.addChild(view);
    this.rings.push({ view, ageMs: 0 });
  }

  private addBurst(x: number, y: number, size: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = size * (2.5 + Math.random() * 4);
      this.addParticle(x, y, size * (0.08 + Math.random() * 0.08), {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - size * 1.5,
        gravity: size * 6,
        lifeMs: 900 + Math.random() * 600,
        colors: BURST_COLORS,
      });
    }
  }

  /** Stars starting above the area at staggered heights, falling through it. */
  private addRain(
    width: number,
    height: number,
    size: number,
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = -size - Math.random() * height * 0.8;
      const fallSpeed = size * (2 + Math.random() * 2);
      this.addParticle(x, y, size * (0.07 + Math.random() * 0.07), {
        vx: (Math.random() - 0.5) * size,
        vy: fallSpeed,
        gravity: size * 0.8,
        lifeMs: ((height - y) / fallSpeed) * 1000,
        colors: RAIN_COLORS,
      });
    }
  }

  private addParticle(
    x: number,
    y: number,
    radius: number,
    motion: {
      vx: number;
      vy: number;
      gravity: number;
      lifeMs: number;
      colors: number[];
    },
  ): void {
    const color =
      motion.colors[Math.floor(Math.random() * motion.colors.length)];
    const view = new Graphics()
      .star(0, 0, 5, radius, radius * 0.45)
      .fill(color);
    view.position.set(x, y);
    view.rotation = Math.random() * Math.PI;
    this.addChild(view);
    this.particles.push({
      view,
      vx: motion.vx,
      vy: motion.vy,
      gravity: motion.gravity,
      spin: (Math.random() - 0.5) * 8,
      ageMs: 0,
      lifeMs: motion.lifeMs,
    });
  }

  private addBanner(x: number, y: number, maxWidth: number, text: string) {
    this.banner?.view.destroy();
    const view = new Text({
      text,
      style: {
        ...TEXT_STYLE,
        fontSize: 40,
        fontWeight: "bold",
        fill: UI_COLORS.highlight,
        stroke: { color: 0x161a24, width: 8, join: "round" },
        align: "center",
        wordWrap: true,
        wordWrapWidth: maxWidth,
      },
    });
    view.anchor.set(0.5);
    view.position.set(x, y);
    view.scale.set(0);
    this.addChild(view);
    this.banner = { view, ageMs: 0 };
  }

  private updateBanner(banner: Banner, deltaMs: number): void {
    banner.ageMs += deltaMs;
    const { ageMs, view } = banner;
    if (ageMs < BANNER_POP_MS) {
      // Overshoots slightly, then settles: a "pop".
      const t = ageMs / BANNER_POP_MS;
      view.scale.set(1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2);
    } else {
      view.scale.set(1);
    }
    const fadeStart = BANNER_POP_MS + BANNER_HOLD_MS;
    view.alpha =
      ageMs < fadeStart
        ? 1
        : Math.max(0, 1 - (ageMs - fadeStart) / BANNER_FADE_MS);
    if (ageMs >= fadeStart + BANNER_FADE_MS) {
      view.destroy();
      this.banner = undefined;
    }
  }

  private removeExpired<T extends { view: Graphics }>(
    items: T[],
    expired: (item: T) => boolean,
  ): T[] {
    return items.filter((item) => {
      if (expired(item)) {
        item.view.destroy();
        return false;
      }
      return true;
    });
  }
}
