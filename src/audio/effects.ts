// The sound effects, as picked on the sound lab page (variant in brackets).
// See docs/DESIGN.md, Sound.

import type { Synth } from "./synth";
import { midi } from "./synth";

export type SoundEffect =
  | "fire"
  | "wall"
  | "break"
  | "place"
  | "exit"
  | "loop"
  | "goal"
  | "par"
  | "allPar"
  | "bonus"
  | "allBonus";

export interface EffectDefinition {
  /** About how long the sound lasts, for limiting overlapping sounds. */
  seconds: number;
  /** Always played, even when many other sounds are playing. */
  important?: boolean;
  /** Lowers the music for this many seconds, so the sound stands out. */
  duckSeconds?: number;
  /**
   * Plays the sound at time `t` into `dest`. `pitch` is a small random
   * factor near 1 for effects that vary a little each time.
   */
  play: (synth: Synth, dest: AudioNode, t: number, pitch: number) => void;
}

export const EFFECTS: Record<SoundEffect, EffectDefinition> = {
  // Fire (C, "Soft pulse"): a gentle falling tone with a breath of air.
  fire: {
    seconds: 0.15,
    play: (s, dest, t, pitch) => {
      s.tone({
        type: "triangle",
        f: 700 * pitch,
        f2: 330 * pitch,
        t,
        d: 0.14,
        vol: 0.2,
        dest,
        wet: 0.15,
      });
      s.noise({ t, d: 0.12, vol: 0.05, f: 2500, f2: 900, q: 0.8, dest });
    },
  },
  // Wall (C, "Soft knock").
  wall: {
    seconds: 0.12,
    play: (s, dest, t, pitch) => {
      s.tone({
        type: "triangle",
        f: 240 * pitch,
        f2: 110 * pitch,
        t,
        d: 0.11,
        vol: 0.3,
        dest,
      });
      s.noise({ t, d: 0.02, vol: 0.12, f: 2000, q: 1.5, dest });
    },
  },
  // Breakable wall: a crunch of noise over a low thud, with a few small
  // pieces clattering after it. Not from the sound lab; tune by ear.
  break: {
    seconds: 0.3,
    play: (s, dest, t, pitch) => {
      s.tone({
        type: "triangle",
        f: 170 * pitch,
        f2: 60 * pitch,
        t,
        d: 0.2,
        vol: 0.3,
        dest,
      });
      s.noise({ t, d: 0.16, vol: 0.16, f: 1800, f2: 500, q: 0.7, dest });
      for (const [delay, f] of [
        [0.07, 3200],
        [0.12, 2600],
        [0.19, 3600],
      ]) {
        s.noise({
          t: t + delay,
          d: 0.025,
          vol: 0.06,
          f: f * pitch,
          q: 3,
          dest,
        });
      }
    },
  },
  // Mirror placed: a glassy click as it settles into place, then a
  // short bell. Not from the sound lab; tune by ear.
  place: {
    seconds: 0.5,
    play: (s, dest, t, pitch) => {
      s.noise({ t, d: 0.03, vol: 0.08, f: 4200 * pitch, q: 2, dest });
      s.tone({
        type: "triangle",
        f: 520 * pitch,
        f2: 380 * pitch,
        t,
        d: 0.08,
        vol: 0.15,
        dest,
      });
      s.notes([81, 88], t + 0.04, 0.07, (f, tt) =>
        s.bell({ f: f * pitch, t: tt, d: 0.4, vol: 0.07, dest, wet: 0.35 }),
      );
    },
  },
  // Off the board (C, "Two-tone drop"): a polite "missed".
  exit: {
    seconds: 0.3,
    play: (s, dest, t, pitch) =>
      s.notes([76, 69], t, 0.13, (f, tt) =>
        s.tone({
          type: "triangle",
          f: f * pitch,
          t: tt,
          d: 0.16,
          vol: 0.2,
          dest,
          wet: 0.15,
        }),
      ),
  },
  // Loop (C, "Question chime"): two bells rising.
  loop: {
    seconds: 0.9,
    play: (s, dest, t) =>
      s.notes([69, 74], t, 0.18, (f, tt) =>
        s.bell({ f, t: tt, d: 0.7, vol: 0.1, dest, wet: 0.4 }),
      ),
  },
  // Goal (A, "Crystal chime"): glassy notes rising, with overtones.
  goal: {
    seconds: 1,
    important: true,
    play: (s, dest, t) =>
      s.notes([84, 88, 91, 96], t, 0.08, (f, tt) => {
        s.tone({ f, t: tt, d: 0.7, vol: 0.13, dest, wet: 0.45 });
        s.tone({ f: f * 2.76, t: tt, d: 0.25, vol: 0.03, dest, wet: 0.45 });
      }),
  },
  // Par (A, "Chime and sparkle").
  par: {
    seconds: 1.4,
    important: true,
    duckSeconds: 1.6,
    play: (s, dest, t) => {
      s.notes([84, 88, 91, 96], t, 0.08, (f, tt) =>
        s.tone({ f, t: tt, d: 0.8, vol: 0.13, dest, wet: 0.5 }),
      );
      s.notes([103, 100, 108, 105, 112, 108], t + 0.34, 0.055, (f, tt) =>
        s.tone({ f, t: tt, d: 0.14, vol: 0.05, dest, wet: 0.6 }),
      );
    },
  },
  // Final star (A, "Synth fanfare"): brassy chords stepping up, opening
  // into a bright final chord, with sparkles.
  allPar: {
    seconds: 2.4,
    important: true,
    duckSeconds: 3.2,
    play: (s, dest, t) => {
      const chords = [
        [60, 64, 67],
        [62, 65, 69],
        [64, 67, 71],
        [65, 69, 72, 77],
      ];
      chords.forEach((chord, i) => {
        const last = i === chords.length - 1;
        for (const note of chord) {
          s.tone({
            type: "sawtooth",
            f: midi(note),
            t: t + i * 0.22,
            a: 0.02,
            d: last ? 1.5 : 0.2,
            vol: 0.05,
            filter: { f: 900 },
            filterEnd: last ? 4000 : 1800,
            dest,
            wet: 0.35,
          });
        }
      });
      s.notes([96, 100, 103, 108], t + 0.9, 0.09, (f, tt) =>
        s.tone({ f, t: tt, d: 0.3, vol: 0.05, dest, wet: 0.6 }),
      );
    },
  },
  // Bonus target: a quick glissando of bells up a pentatonic scale, then a
  // shimmer of high sparkles. Not from the sound lab; tune by ear.
  bonus: {
    seconds: 1.2,
    important: true,
    duckSeconds: 1.2,
    play: (s, dest, t) => {
      s.notes([79, 81, 84, 86, 88, 91, 93, 96], t, 0.04, (f, tt) =>
        s.bell({
          f,
          t: tt,
          d: 0.6,
          vol: 0.06,
          ratio: 3.5,
          index: 1.2,
          dest,
          wet: 0.5,
        }),
      );
      s.notes([108, 103, 110, 105, 112, 115], t + 0.34, 0.05, (f, tt) =>
        s.tone({ f, t: tt, d: 0.16, vol: 0.04, dest, wet: 0.6 }),
      );
    },
  },
  // Last bonus target of the game: like the final-star fanfare, with
  // brighter major-seventh chords, bells on each chord and a long shimmer.
  allBonus: {
    seconds: 3,
    important: true,
    duckSeconds: 3.8,
    play: (s, dest, t) => {
      const chords = [
        [60, 64, 67, 71],
        [62, 65, 69, 72],
        [65, 69, 72, 76],
        [67, 71, 74, 79],
      ];
      chords.forEach((chord, i) => {
        const last = i === chords.length - 1;
        chord.forEach((note, j) => {
          s.tone({
            type: "sawtooth",
            f: midi(note),
            t: t + i * 0.24,
            a: 0.02,
            d: last ? 1.8 : 0.22,
            vol: 0.04,
            filter: { f: 1000 },
            filterEnd: last ? 5000 : 2000,
            dest,
            wet: 0.4,
          });
          s.bell({
            f: midi(note + 24),
            t: t + i * 0.24 + j * 0.04,
            d: 0.5,
            vol: 0.035,
            dest,
            wet: 0.5,
          });
        });
      });
      s.notes([96, 98, 100, 103, 105, 108, 110, 112], t + 1, 0.06, (f, tt) =>
        s.tone({ f, t: tt, d: 0.3, vol: 0.045, dest, wet: 0.6 }),
      );
    },
  },
};

/** Seconds a mirror bounce lasts, for limiting overlapping sounds. */
export const BOUNCE_SECONDS = 0.5;

/**
 * Mirror bounce (B, "Crystal ping"): a small bell, two semitones higher for
 * each further bounce in the same shot (capped).
 */
export function playBounce(
  s: Synth,
  dest: AudioNode,
  t: number,
  bounceNumber: number,
): void {
  const step = 2 ** ((Math.min(bounceNumber - 1, 10) * 2) / 12);
  s.bell({
    f: 784 * step,
    t,
    d: 0.5,
    vol: 0.12,
    ratio: 3.5,
    index: 1.4,
    dest,
    wet: 0.3,
  });
}
