import { Container, Graphics, Text } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import { easeInOutCubic, easeOutCubic } from "./easing";
import { SpectrumText } from "./spectrumText";
import { BONUS_COLORS, COLORS, createBloom, textStyle } from "./theme";

const BURST_COLORS = [COLORS.star, COLORS.success, COLORS.beamCore];
const BONUS_BURST_COLORS = [...BONUS_COLORS, COLORS.beamCore];
const RAIN_COLORS = [
  COLORS.star,
  COLORS.success,
  COLORS.beam,
  COLORS.glass,
  COLORS.beamCore,
];

const RING_LIFE_MS = 650;
const BANNER_POP_MS = 400;
const BANNER_HOLD_MS = 3500;
const BANNER_FADE_MS = 1000;

/** The game's ending (finale()): its banner stays longer. */
const FINALE_BANNER_HOLD_MS = 4800;
/**
 * The prism fan's rays appear one by one at the pace of the ending's bells
 * (FINALE_BELL_SECONDS in src/audio/effects.ts), each growing out over
 * RAY_GROW_MS; the fan turns slowly, then fades.
 */
const RAY_INTERVAL_MS = 140;
const RAY_GROW_MS = 380;
const RAY_SPREAD = Math.PI * 0.075;
const FAN_TURN = -0.25;
const FAN_HOLD_MS = 2600;
const FAN_FADE_MS = 1000;
/** The banner's light sweep: when it starts and how long it takes. */
const SWEEP_START_MS = 200;
const SWEEP_MS = 1100;
/** The second line fades in after the banner. */
const SUBTITLE_DELAY_MS = 900;
const SUBTITLE_FADE_MS = 600;
/** Specks of light drifting up the screen in the ending. */
const MOTE_COUNT = 70;

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
  view: Container;
  text: string;
  ageMs: number;
  holdMs: number;
  /** The ending's banner: letters lit by a sweeping light, a second line. */
  spectrum?: { letters: SpectrumText; light: Graphics; subtitle: Text };
}

/** The prism fan: six rays out of the gem at (x, y). */
interface Fan {
  x: number;
  y: number;
  /** Direction of the fan's middle, in radians. */
  angle: number;
  length: number;
  ageMs: number;
}

/** A speck of coloured light drifting up, twinkling; starts after a delay. */
interface Mote {
  view: Graphics;
  vx: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
  phase: number;
}

/**
 * Par and bonus celebrations, drawn on top of a scene: bursts of stars, an
 * expanding ring, stars raining over the scene and a banner. Runs on update() and
 * cleans up after itself; positions are in the parent scene's coordinates.
 */
export class Celebration extends Container {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private banner?: Banner;
  private fan?: Fan;
  private readonly fanLayer = new Graphics();
  private motes: Mote[] = [];

  constructor() {
    super();
    // Effects must never block clicks on the buttons underneath.
    this.eventMode = "none";
    this.filters = [createBloom()];
    this.addChild(this.fanLayer);
  }

  /** Level completed in par: stars burst from (x, y) and a ring expands. */
  parBurst(x: number, y: number, size: number): void {
    this.addRing(x, y, size, COLORS.star);
    this.addBurst(x, y, size, 26, BURST_COLORS);
  }

  /** A bonus target hit: stars in every bonus colour burst from (x, y). */
  bonusBurst(x: number, y: number, size: number): void {
    this.addRing(x, y, size, BONUS_COLORS[0]);
    this.addRing(x, y, size * 0.7, BONUS_COLORS[4]);
    this.addBurst(x, y, size, 36, BONUS_BURST_COLORS);
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
    this.addRing(x, y, size, COLORS.star);
    this.addBurst(x, y, size * 1.4, 60, BURST_COLORS);
    this.addRain(width, height, size, 140, RAIN_COLORS);
    this.addBanner(width / 2, height / 2, width, bannerText);
  }

  /**
   * The game's ending, the last bonus target found at (x, y): a white ring,
   * the gem splitting the beam into a fan of six coloured rays, specks of
   * coloured light drifting up the `width` × `height` area, and a banner
   * whose letters light up in the bonus colours as a light sweeps across
   * them, with `subtitle` under it. Under reduced motion the fan stands
   * still, nothing drifts and the banner is lit at once.
   */
  finale(
    x: number,
    y: number,
    size: number,
    width: number,
    height: number,
    bannerText: string,
    subtitle: string,
  ): void {
    this.addRing(x, y, size, COLORS.beamCore);
    // The fan opens towards the middle of the screen, where there is room.
    const dx = width / 2 - x;
    const dy = height / 2 - y;
    this.fan = {
      x,
      y,
      angle: Math.hypot(dx, dy) < size ? Math.PI / 2 : Math.atan2(dy, dx),
      length: Math.hypot(width, height),
      ageMs: 0,
    };
    if (!prefersReducedMotion()) {
      this.addMotes(width, height, size);
    }
    this.addSpectrumBanner(width, height, bannerText, subtitle);
  }

  /** The banner's text while one shows (for the smoke tests' test hook). */
  get bannerText(): string | null {
    return this.banner?.text ?? null;
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

    this.updateFan(deltaMs);
    this.updateMotes(deltaMs);
    if (this.banner) {
      this.updateBanner(this.banner, deltaMs);
    }
  }

  /** Redraws the prism fan's rays, growing, turning and fading. */
  private updateFan(deltaMs: number): void {
    const g = this.fanLayer.clear();
    const fan = this.fan;
    if (!fan) {
      return;
    }
    fan.ageMs += deltaMs;
    const t = fan.ageMs;
    const fade = 1 - Math.min(1, Math.max(0, (t - FAN_HOLD_MS) / FAN_FADE_MS));
    if (fade <= 0) {
      this.fan = undefined;
      return;
    }
    const still = prefersReducedMotion();
    const turn = still
      ? 0
      : FAN_TURN * easeInOutCubic(Math.min(1, t / (FAN_HOLD_MS + FAN_FADE_MS)));
    BONUS_COLORS.forEach((color, i) => {
      const age = t - i * RAY_INTERVAL_MS;
      if (age < 0) {
        return;
      }
      const grow = still ? 1 : easeOutCubic(Math.min(1, age / RAY_GROW_MS));
      const length = fan.length * grow;
      // A line needs two distinct points.
      if (length < 1) {
        return;
      }
      const angle = fan.angle + (i - 2.5) * RAY_SPREAD + turn;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      // Brightest at the gem, fading along the ray, in four steps.
      for (let k = 0; k < 4; k++) {
        const from = (length * k) / 4;
        const to = (length * (k + 1)) / 4;
        const alpha = fade * (0.75 - 0.2 * k);
        g.moveTo(fan.x + ux * from, fan.y + uy * from)
          .lineTo(fan.x + ux * to, fan.y + uy * to)
          .stroke({ width: 9, color, alpha: alpha * 0.4, cap: "round" })
          .moveTo(fan.x + ux * from, fan.y + uy * from)
          .lineTo(fan.x + ux * to, fan.y + uy * to)
          .stroke({ width: 2, color, alpha, cap: "round" });
      }
    });
    // The prism's bright core while the fan shines.
    g.circle(fan.x, fan.y, 16).fill({ color: 0xffffff, alpha: 0.25 * fade });
    g.circle(fan.x, fan.y, 7).fill({ color: 0xffffff, alpha: 0.9 * fade });
  }

  private addMotes(width: number, height: number, size: number): void {
    for (let i = 0; i < MOTE_COUNT; i++) {
      const r = size * (0.025 + Math.random() * 0.03);
      const color = BONUS_COLORS[i % BONUS_COLORS.length];
      const view = new Graphics()
        .circle(0, 0, r * 2.5)
        .fill({ color, alpha: 0.25 })
        .circle(0, 0, r)
        .fill(color)
        .circle(0, 0, r * 0.45)
        .fill(0xffffff);
      view.position.set(
        Math.random() * width,
        height * (0.1 + Math.random() * 0.9),
      );
      view.alpha = 0;
      this.addChild(view);
      this.motes.push({
        view,
        vx: (Math.random() - 0.5) * size * 0.25,
        vy: -size * (0.2 + Math.random() * 0.4),
        // Some start later, so the dust keeps rising for a while.
        ageMs: -Math.random() * 1600,
        lifeMs: 2600 + Math.random() * 1800,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateMotes(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const mote of this.motes) {
      mote.ageMs += deltaMs;
      if (mote.ageMs < 0) {
        continue;
      }
      mote.view.x += mote.vx * seconds;
      mote.view.y += mote.vy * seconds;
      const t = mote.ageMs / mote.lifeMs;
      const twinkle = 0.6 + 0.4 * Math.sin(mote.ageMs * 0.008 + mote.phase);
      mote.view.alpha =
        Math.max(0, Math.sin(Math.PI * Math.min(1, t))) * twinkle;
    }
    this.motes = this.removeExpired(
      this.motes,
      (mote) => mote.ageMs >= mote.lifeMs,
    );
  }

  private addRing(x: number, y: number, size: number, color: number): void {
    const view = new Graphics()
      .circle(0, 0, size * 0.32)
      .stroke({ width: 4, color });
    view.position.set(x, y);
    this.addChild(view);
    this.rings.push({ view, ageMs: 0 });
  }

  private addBurst(
    x: number,
    y: number,
    size: number,
    count: number,
    colors: readonly number[],
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = size * (2.5 + Math.random() * 4);
      this.addParticle(x, y, size * (0.08 + Math.random() * 0.08), {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - size * 1.5,
        gravity: size * 6,
        lifeMs: 900 + Math.random() * 600,
        colors,
      });
    }
  }

  /** Stars starting above the area at staggered heights, falling through it. */
  private addRain(
    width: number,
    height: number,
    size: number,
    count: number,
    colors: readonly number[],
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
        colors,
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
      colors: readonly number[];
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
    this.banner?.view.destroy({ children: true });
    const view = new Text({
      text,
      style: textStyle("title", {
        fontSize: 38,
        letterSpacing: 3,
        fill: COLORS.star,
        stroke: { color: COLORS.background, width: 8, join: "round" },
        align: "center",
        wordWrap: true,
        wordWrapWidth: maxWidth,
      }),
    });
    view.anchor.set(0.5);
    view.position.set(x, y);
    view.scale.set(0);
    this.addChild(view);
    this.banner = { view, text, ageMs: 0, holdMs: BANNER_HOLD_MS };
  }

  /**
   * The ending's banner, centred in the `width` × `height` area: letters
   * in the bonus colours, lit as a light sweeps across them, and a quiet
   * second line under them.
   */
  private addSpectrumBanner(
    width: number,
    height: number,
    text: string,
    subtitle: string,
  ): void {
    this.banner?.view.destroy({ children: true });
    const view = new Container();
    const letters = new SpectrumText(
      text,
      textStyle("title", {
        fontSize: 38,
        letterSpacing: 3,
        stroke: { color: COLORS.background, width: 8, join: "round" },
      }),
      width - 24,
    );
    const second = new Text({
      text: subtitle,
      style: textStyle("value", {
        fontSize: 15,
        letterSpacing: 3,
        fill: COLORS.text,
        stroke: { color: COLORS.background, width: 5, join: "round" },
      }),
    });
    second.anchor.set(0.5, 0);
    second.y = letters.height + 10;
    second.alpha = 0;
    const light = new Graphics();
    view.addChild(letters, light, second);
    // Centred on the banner block's middle, so it pops from there.
    view.pivot.set(0, (second.y + second.height) / 2);
    view.position.set(width / 2, height / 2);
    view.scale.set(0);
    this.addChild(view);
    if (prefersReducedMotion()) {
      letters.light();
    } else {
      letters.unlit();
    }
    this.banner = {
      view,
      text,
      ageMs: 0,
      holdMs: FINALE_BANNER_HOLD_MS,
      spectrum: { letters, light, subtitle: second },
    };
  }

  /** The ending's banner: the sweeping light and the second line. */
  private updateSpectrum(banner: Banner): void {
    const { spectrum, ageMs } = banner;
    if (!spectrum) {
      return;
    }
    const { letters, light, subtitle } = spectrum;
    subtitle.alpha = Math.min(
      1,
      Math.max(0, (ageMs - SUBTITLE_DELAY_MS) / SUBTITLE_FADE_MS),
    );
    const g = light.clear();
    if (prefersReducedMotion()) {
      return;
    }
    const t = (ageMs - SWEEP_START_MS) / SWEEP_MS;
    if (t < 0 || t > 1) {
      if (t > 1) {
        letters.light();
      }
      return;
    }
    const half = letters.width / 2 + 40;
    const x = -half + 2 * half * easeInOutCubic(t);
    letters.lightUpTo(x);
    // A soft vertical band of white light, brightest in the middle.
    const h = letters.height;
    for (let k = 0; k < 5; k++) {
      const w = 60 - k * 12;
      g.rect(x - w / 2, -4, w, h + 8).fill({ color: 0xffffff, alpha: 0.1 });
    }
  }

  private updateBanner(banner: Banner, deltaMs: number): void {
    banner.ageMs += deltaMs;
    this.updateSpectrum(banner);
    const { ageMs, view } = banner;
    if (ageMs < BANNER_POP_MS) {
      // Overshoots slightly, then settles: a "pop".
      const t = ageMs / BANNER_POP_MS;
      view.scale.set(1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2);
    } else {
      view.scale.set(1);
    }
    const fadeStart = BANNER_POP_MS + banner.holdMs;
    view.alpha =
      ageMs < fadeStart
        ? 1
        : Math.max(0, 1 - (ageMs - fadeStart) / BANNER_FADE_MS);
    if (ageMs >= fadeStart + BANNER_FADE_MS) {
      view.destroy({ children: true });
      this.banner = undefined;
    }
  }

  private removeExpired<T extends { view: Container }>(
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
