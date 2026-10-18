import { Graphics } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import { mixColor } from "./color";
import type { BeamLight } from "./PelletAnimator";
import { distanceToPath } from "./polyline";
import type { Point } from "./polyline";

/** The table's holes catch the beam's light up to this far away, in cells. */
const HOLE_REACH = 0.75;
/** Dust shows this close to the beam, in cells. */
const DUST_REACH = 0.32;
/** Specks of dust per cell of the board. */
const DUST_PER_CELL = 4;
/** The finish's wave: its speed in cells a second, and its width in cells. */
const WAVE_SPEED = 10;
const WAVE_WIDTH = 0.9;

/** A rectangle in pixels. */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A speck of dust in the air over the table; speeds in pixels a second. */
export interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  brightness: number;
}

/**
 * How brightly a hole `distance` pixels from the beam catches its light
 * (0–1), for a beam of `strength` (0–1).
 */
export function holeGlow(
  distance: number,
  cellSize: number,
  strength: number,
): number {
  const near = 1 - distance / (cellSize * HOLE_REACH);
  return Math.max(0, near) * 0.85 * strength;
}

/**
 * How brightly a hole `distance` pixels from the wave's origin is lit by a
 * ring `radius` pixels out (0–1): brightest on the ring, fading either side.
 */
export function waveGlow(
  distance: number,
  radius: number,
  cellSize: number,
): number {
  return Math.max(0, 1 - Math.abs(distance - radius) / (cellSize * WAVE_WIDTH));
}

/**
 * Where `mote` is after `seconds` of drifting, wrapped around inside
 * `area`, so the air never runs out of dust.
 */
export function motePosition(mote: Mote, seconds: number, area: Area): Point {
  const wrap = (value: number, start: number, size: number) =>
    start + ((((value - start) % size) + size) % size);
  return {
    x: wrap(mote.x + mote.vx * seconds, area.x, area.width),
    y: wrap(mote.y + mote.vy * seconds, area.y, area.height),
  };
}

/**
 * The beam's light on the lab around it (see docs/DESIGN.md, Beam light):
 * the optical table's holes near it catch its colour, and it is seen
 * through a faint haze in which specks of dust glint where it crosses
 * them. A wave of light can also run across the holes (the finish).
 *
 * `holeLayer` goes under the cells, `hazeLayer` over them; the owner adds
 * both and calls update() every frame.
 */
export class TableLight {
  readonly holeLayer = new Graphics();
  readonly hazeLayer = new Graphics();
  private readonly cellSize: number;
  private readonly holes: readonly Point[];
  private readonly area: Area;
  private readonly motes: Mote[];
  private timeMs = 0;
  private lastBeam: BeamLight | null = null;
  private wave: { origin: Point; ageMs: number; color: number } | null = null;

  /**
   * `holes` are the table's holes and `area` the air over the board, both
   * in the owner's pixels.
   */
  constructor(cellSize: number, holes: readonly Point[], area: Area) {
    this.cellSize = cellSize;
    this.holes = holes;
    this.area = area;
    const count = Math.round(
      (DUST_PER_CELL * area.width * area.height) / cellSize ** 2,
    );
    const scale = cellSize / 44;
    this.motes = Array.from({ length: count }, () => ({
      x: area.x + Math.random() * area.width,
      y: area.y + Math.random() * area.height,
      vx: (Math.random() * 6 - 3) * scale,
      vy: (Math.random() * 4 - 2.5) * scale,
      size: (0.6 + Math.random() * 0.9) * scale,
      brightness: 0.55 + Math.random() * 0.45,
    }));
  }

  /**
   * A wave of `color` spreading from `origin` across the holes. Nothing
   * when the player prefers reduced motion.
   */
  playWave(origin: Point, color: number): void {
    if (!prefersReducedMotion()) {
      this.wave = { origin, ageMs: 0, color };
    }
  }

  /** Stops the wave at once (as a level restarts). */
  clear(): void {
    this.wave = null;
    this.lastBeam = null;
    this.holeLayer.clear();
    this.hazeLayer.clear();
  }

  update(deltaMs: number, beam: BeamLight | null): void {
    const still = prefersReducedMotion();
    if (!still) {
      this.timeMs += deltaMs;
    }
    // Drawn once more as the wave ends, to take its last ring away.
    const waving = this.wave !== null;
    if (this.wave) {
      this.wave.ageMs += deltaMs;
      const far = Math.hypot(this.area.width, this.area.height);
      if (this.radius() > far + this.cellSize * WAVE_WIDTH) {
        this.wave = null;
      }
    }
    // The holes change only with the beam or the wave; the haze with the
    // beam, and while its dust drifts.
    const changed = beam !== this.lastBeam;
    if (changed || waving) {
      this.drawHoles(beam);
    }
    if (changed || (beam && !still)) {
      this.drawHaze(beam);
    }
    this.lastBeam = beam;
  }

  private radius(): number {
    return this.wave
      ? (this.wave.ageMs / 1000) * WAVE_SPEED * this.cellSize
      : 0;
  }

  private drawHoles(beam: BeamLight | null): void {
    const g = this.holeLayer.clear();
    const { cellSize, wave } = this;
    const radius = this.radius();
    for (const hole of this.holes) {
      let glow = 0;
      let color = beam?.color ?? 0;
      if (beam) {
        for (const line of beam.lines) {
          const distance = distanceToPath(hole.x, hole.y, line);
          glow = Math.max(glow, holeGlow(distance, cellSize, beam.strength));
        }
      }
      if (wave) {
        const distance = Math.hypot(
          hole.x - wave.origin.x,
          hole.y - wave.origin.y,
        );
        const lit = waveGlow(distance, radius, cellSize);
        if (lit > glow) {
          glow = lit;
          color = wave.color;
        }
      }
      if (glow > 0.01) {
        for (const [size, alpha] of [
          [0.12, 0.25],
          [0.07, 0.5],
          [0.04, 0.8],
        ]) {
          g.circle(hole.x, hole.y, cellSize * size).fill({
            color,
            alpha: alpha * glow,
          });
        }
      }
    }
  }

  /**
   * A soft scatter around the beam, and the specks of dust near it, each
   * as bright as it is close to the beam.
   */
  private drawHaze(beam: BeamLight | null): void {
    const g = this.hazeLayer.clear();
    g.visible = beam !== null;
    if (!beam) {
      return;
    }
    const { cellSize } = this;
    for (const [width, alpha] of [
      [0.62, 0.045],
      [0.3, 0.06],
    ]) {
      for (const line of beam.lines) {
        g.moveTo(line[0].x, line[0].y);
        for (const p of line.slice(1)) {
          g.lineTo(p.x, p.y);
        }
      }
      g.stroke({
        width: cellSize * width,
        color: beam.color,
        alpha: alpha * beam.strength,
        cap: "round",
        join: "round",
      });
    }
    const speck = mixColor(beam.color, 0xffffff, 0.6);
    const seconds = this.timeMs / 1000;
    for (const mote of this.motes) {
      const { x, y } = motePosition(mote, seconds, this.area);
      let distance = Infinity;
      for (const line of beam.lines) {
        distance = Math.min(distance, distanceToPath(x, y, line));
      }
      const near = 1 - distance / (cellSize * DUST_REACH);
      if (near > 0) {
        g.circle(x, y, mote.size).fill({
          color: speck,
          alpha: near * mote.brightness * 0.9 * beam.strength,
        });
      }
    }
  }
}
