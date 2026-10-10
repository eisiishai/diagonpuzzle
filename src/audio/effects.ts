// The sound effects, as picked on the sound lab page (variant in brackets).
// See docs/DESIGN.md, Sound.

import type { Synth } from "./synth";
import { midi } from "./synth";

export type SoundEffect =
  "fire" | "wall" | "exit" | "loop" | "goal" | "par" | "allPar";

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
