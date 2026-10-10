// The sound effects, as picked on the sound lab page (variant in brackets).
// See docs/DESIGN.md, Sound.

import type { Harmony } from "./music";
import type { Synth } from "./synth";
import { midi } from "./synth";

export type SoundEffect =
  | "fire"
  | "wall"
  | "break"
  | "place"
  | "levelStart"
  | "tick"
  | "click"
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
   * factor near 1 for effects that vary a little each time; `harmony` is
   * the music's at that moment, for sounds tuned to it.
   */
  play: (
    synth: Synth,
    dest: AudioNode,
    t: number,
    pitch: number,
    harmony: Harmony,
  ) => void;
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
  // Level start: a soft, airy swoosh that follows the beam wipe. Kept
  // quiet and toneless so it doesn't wear on the ear when moving through
  // many levels (sound lab 2's "Rising sweep" was too noticeable).
  levelStart: {
    seconds: 0.5,
    play: (s, dest, t, pitch) => {
      s.noise({
        t,
        a: 0.22,
        d: 0.22,
        vol: 0.028,
        f: 500 * pitch,
        f2: 1600 * pitch,
        q: 0.8,
        dest,
        wet: 0.2,
      });
    },
  },
  // Selection moved (sound lab 2, "Soft tick"): a tiny filtered click,
  // quieter than on the lab page since it repeats often.
  tick: {
    seconds: 0.05,
    play: (s, dest, t, pitch) => {
      s.noise({ t, d: 0.015, vol: 0.04, f: 3500 * pitch, q: 4, dest });
      s.tone({ f: 1800 * pitch, t, d: 0.02, vol: 0.02, dest });
    },
  },
  // Button pressed (sound lab 2, "Glass tap"): a click with a small bell,
  // quieter than on the lab page.
  click: {
    seconds: 0.25,
    play: (s, dest, t, pitch) => {
      s.noise({ t, d: 0.015, vol: 0.035, f: 4200 * pitch, q: 2, dest });
      s.bell({
        f: midi(91) * pitch,
        t,
        d: 0.22,
        vol: 0.035,
        index: 1,
        dest,
        wet: 0.2,
      });
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
  // Goal (A, "Crystal chime"): glassy notes rising, with overtones, on the
  // chord the music is playing.
  goal: {
    seconds: 1,
    important: true,
    play: (s, dest, t, _pitch, harmony) =>
      s.notes(goalChimeNotes(harmony), t, 0.08, (f, tt) => {
        s.tone({ f, t: tt, d: 0.7, vol: 0.13, dest, wet: 0.45 });
        s.tone({ f: f * 2.76, t: tt, d: 0.25, vol: 0.03, dest, wet: 0.45 });
      }),
  },
  // Par (A, "Chime and sparkle").
  par: {
    seconds: 1.4,
    important: true,
    duckSeconds: 1.6,
    play: (s, dest, t, _pitch, harmony) => {
      s.notes(goalChimeNotes(harmony), t, 0.08, (f, tt) =>
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
 * Mirror bounce (B, "Crystal ping"): a small bell, one note higher on the
 * music's scale for each further bounce in the same shot (capped), so long
 * shots stay in key, with a soft glassy swish as the mirror turns.
 */
export function playBounce(
  s: Synth,
  dest: AudioNode,
  t: number,
  bounceNumber: number,
  harmony: Harmony,
): void {
  s.bell({
    f: midi(bounceNote(bounceNumber, harmony.scale)),
    t,
    d: 0.5,
    vol: 0.12,
    ratio: 3.5,
    index: 1.4,
    dest,
    wet: 0.3,
  });
  // The mirror turning (sound lab 2, "Glass swish"), kept quiet.
  s.noise({ t, d: 0.1, vol: 0.03, f: 6000, f2: 3000, q: 2, dest });
}

/** Lowest note of the bounce ladder (E5). */
const BOUNCE_LADDER_START = 76;
/** Bounces after this many climb no higher. */
const BOUNCE_LADDER_STEPS = 10;

/**
 * The MIDI note of bounce number `bounceNumber` (from 1): the ladder climbs
 * the notes of `scale` (pitch classes) from E5 upwards, one per bounce.
 */
export function bounceNote(
  bounceNumber: number,
  scale: readonly number[],
): number {
  const steps = Math.min(Math.max(bounceNumber - 1, 0), BOUNCE_LADDER_STEPS);
  let note = BOUNCE_LADDER_START;
  while (!scale.includes(note % 12)) {
    note++;
  }
  for (let i = 0; i < steps; i++) {
    do {
      note++;
    } while (!scale.includes(note % 12));
  }
  return note;
}

/**
 * The goal chime's four notes (MIDI) on the music's chord: its root from F5
 * up, the third and fifth above it, and the root an octave higher, like a
 * major or minor arpeggio. The third is major or minor as the chord or scale
 * has it; with neither, the chime uses root, fifth, root and fifth.
 */
export function goalChimeNotes(harmony: Harmony): number[] {
  let root = 77;
  while (root % 12 !== harmony.root % 12) {
    root++;
  }
  const has = (interval: number) =>
    [...harmony.chord.map((note) => note % 12), ...harmony.scale].includes(
      (root + interval) % 12,
    );
  const third = has(4) ? 4 : has(3) ? 3 : undefined;
  return third === undefined
    ? [root, root + 7, root + 12, root + 19]
    : [root, root + third, root + 7, root + 12];
}

/** How far to either side panned sounds go (1 would be fully left/right). */
const MAX_PAN = 0.4;

/**
 * Stereo position for a sound at board column `x` (fractional; -1 is the
 * launcher column) on a board `width` columns wide: from the left (-0.4) to
 * the right (0.4).
 */
export function columnPan(x: number, width: number): number {
  const position = (x + 0.5) / width;
  return Math.max(-MAX_PAN, Math.min(MAX_PAN, (position * 2 - 1) * MAX_PAN));
}
