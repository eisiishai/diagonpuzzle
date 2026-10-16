// The sound effects, as picked on the sound lab page (variant in brackets).
// See docs/DESIGN.md, Sound.

import type { BounceKind } from "../game/types";
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
   * Instead of lowering it, silences the music for this many seconds and
   * brings it back slowly afterwards, so the sound ends a piece.
   */
  restMusicSeconds?: number;
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
  // Like the other everyday effects, softened for long play (sound lab 3,
  // "Softer"): about 40 % quieter and a little rounder.
  fire: {
    seconds: 0.15,
    play: (s, dest, t, pitch) => {
      s.tone({
        type: "triangle",
        f: 700 * pitch,
        f2: 330 * pitch,
        t,
        d: 0.13,
        vol: 0.12,
        filter: { f: 1800 },
        dest,
        wet: 0.15,
      });
      s.noise({ t, d: 0.1, vol: 0.03, f: 2000, f2: 800, q: 0.8, dest });
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
        d: 0.1,
        vol: 0.18,
        dest,
      });
      s.noise({ t, d: 0.02, vol: 0.06, f: 1800, q: 1.5, dest });
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
        vol: 0.18,
        dest,
      });
      s.noise({ t, d: 0.15, vol: 0.09, f: 1600, f2: 500, q: 0.7, dest });
      for (const [delay, f] of [
        [0.07, 3200],
        [0.12, 2600],
        [0.19, 3600],
      ]) {
        s.noise({
          t: t + delay,
          d: 0.025,
          vol: 0.035,
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
      s.noise({ t, d: 0.03, vol: 0.05, f: 4200 * pitch, q: 2, dest });
      s.tone({
        type: "triangle",
        f: 520 * pitch,
        f2: 380 * pitch,
        t,
        d: 0.08,
        vol: 0.09,
        dest,
      });
      s.notes([81, 88], t + 0.04, 0.07, (f, tt) =>
        s.bell({ f: f * pitch, t: tt, d: 0.4, vol: 0.045, dest, wet: 0.35 }),
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
          d: 0.15,
          vol: 0.12,
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
        s.bell({ f, t: tt, d: 0.7, vol: 0.06, dest, wet: 0.4 }),
      ),
  },
  // Goal (A, "Crystal chime"): glassy notes rising, with overtones, on the
  // chord the music is playing.
  goal: {
    seconds: 1,
    important: true,
    play: (s, dest, t, _pitch, harmony) =>
      s.notes(goalChimeNotes(harmony), t, 0.08, (f, tt) => {
        s.tone({ f, t: tt, d: 0.7, vol: 0.085, dest, wet: 0.45 });
        s.tone({ f: f * 2.76, t: tt, d: 0.2, vol: 0.015, dest, wet: 0.45 });
      }),
  },
  // Par (A, "Chime and sparkle").
  par: {
    seconds: 1.4,
    important: true,
    duckSeconds: 1.6,
    play: (s, dest, t, _pitch, harmony) => {
      s.notes(goalChimeNotes(harmony), t, 0.08, (f, tt) =>
        s.tone({ f, t: tt, d: 0.8, vol: 0.09, dest, wet: 0.5 }),
      );
      s.notes([103, 100, 108, 105, 112, 108], t + 0.34, 0.055, (f, tt) =>
        s.tone({ f, t: tt, d: 0.14, vol: 0.032, dest, wet: 0.6 }),
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
  // Last bonus target of the game, the ending (finale lab, "Prism bells"):
  // six bells, one with each ray of the prism fan, then a chord swelling
  // and opening up on the music's key made major. The music rests under it.
  allBonus: {
    seconds: 5.5,
    important: true,
    restMusicSeconds: 5.5,
    play: (s, dest, t, _pitch, harmony) => {
      const { root, chord, bells } = endingNotes(harmony.tonic);
      bells.forEach((note, i) =>
        s.bell({
          f: midi(note + 12),
          t: t + i * FINALE_BELL_SECONDS,
          d: 1.6,
          vol: 0.06,
          ratio: 3.5,
          index: 1.1,
          dest,
          wet: 0.6,
          echo: 0.3,
        }),
      );
      const swell = t + bells.length * FINALE_BELL_SECONDS;
      chord.forEach((note, j) =>
        s.pad({
          f: midi(note),
          t: swell + j * 0.06,
          dur: 5.5,
          a: 0.8,
          r: 3.5,
          vol: 0.035,
          from: 600,
          to: 3200,
          dest,
          wet: 0.5,
        }),
      );
      s.held({
        type: "sine",
        f: midi(root),
        t: swell,
        dur: 5,
        a: 0.5,
        r: 3,
        vol: 0.12,
        cutoff: 300,
        detunes: [0],
        dest,
      });
      const [, third, fifth, ninth] = chord;
      s.notes(
        [ninth + 24, third + 36, fifth + 36, ninth + 36],
        swell + 0.3,
        0.11,
        (f, tt) =>
          s.tone({ f, t: tt, d: 0.5, vol: 0.03, dest, wet: 0.7, echo: 0.4 }),
      );
    },
  },
};

/**
 * Time between the ending's six bells; the prism fan's rays appear at the
 * same pace (src/render/Celebration.ts).
 */
export const FINALE_BELL_SECONDS = 0.14;

/**
 * The ending's notes in the key whose tonic is pitch class `tonic`, made
 * major: a bass root (MIDI 36–47), a chord of root, third, fifth and ninth
 * an octave above it, and six bells rising from two octaves above it
 * (root, third, fifth, octave, ninth, tenth).
 */
export function endingNotes(tonic: number): {
  root: number;
  chord: number[];
  bells: number[];
} {
  const root = 36 + (((tonic % 12) + 12) % 12);
  return {
    root,
    chord: [12, 16, 19, 26].map((interval) => root + interval),
    bells: [0, 4, 7, 12, 14, 16].map((interval) => root + 24 + interval),
  };
}

/** Seconds a bounce sound lasts, for limiting overlapping sounds. */
export const BOUNCE_SECONDS: Record<BounceKind, number> = {
  mirror: 0.45,
  fixed: 0.6,
  reflector: 0.65,
  glass: 0.5,
  portal: 0.45,
};

/**
 * A bounce at stereo position `pan`, on the bounce ladder: a note higher on
 * the music's scale for each further bounce in the same shot (capped), so
 * long shots stay in key. What turned the pellet decides the sound:
 * - mirror (B, "Crystal ping"): a small bell with a soft glassy swish as
 *   the mirror turns;
 * - fixed (sound lab 6, "Anvil ring"): a round note with a bright metallic
 *   overtone above it, like a small steel bar, and no swish, as nothing
 *   turns;
 * - reflector (sound lab 5, "Echo ping"): the bell answered by two quick,
 *   quieter repeats that move back towards the centre, as the beam goes
 *   back;
 * - glass (sound lab 5, "Crack and tinkle"): the bell cut off by a short
 *   bright crack and small clicks, then a soft shower of tiny high notes
 *   in the music's scale, falling like the shards.
 * - portal: the mirror's sound for now, until a sound lab gives it its own.
 * The reflector and glass sounds are a little quieter than on the lab page.
 */
export function playBounce(
  s: Synth,
  dest: AudioNode,
  t: number,
  bounceNumber: number,
  harmony: Harmony,
  kind: BounceKind = "mirror",
  pan = 0,
): void {
  const f = midi(bounceNote(bounceNumber, harmony.scale));
  if (kind === "fixed") {
    s.bell({
      f,
      t,
      d: 0.6,
      vol: 0.05,
      ratio: 1,
      index: 0.3,
      dest,
      pan,
      wet: 0.3,
    });
    s.tone({
      f: f * 2.76,
      t,
      a: 0.002,
      d: 0.25,
      vol: 0.016,
      dest,
      pan,
      wet: 0.3,
    });
    return;
  }
  if (kind === "reflector") {
    [0, 0.11, 0.22].forEach((delay, k) =>
      s.bell({
        f,
        t: t + delay,
        d: 0.4,
        vol: 0.065 * 0.45 ** k,
        ratio: 3.5,
        index: 1.1 - k * 0.3,
        dest,
        pan: pan * (1 - k * 0.6),
        wet: 0.3 + k * 0.1,
      }),
    );
    return;
  }
  s.bell({
    f,
    t,
    d: 0.45,
    vol: kind === "glass" ? 0.06 : 0.075,
    ratio: 3.5,
    index: 1.1,
    dest,
    pan,
    wet: 0.3,
  });
  // The mirror turning (sound lab 2, "Glass swish"), kept quiet.
  s.noise({ t, d: 0.09, vol: 0.02, f: 5500, f2: 3000, q: 2, dest, pan });
  if (kind !== "glass") {
    return;
  }
  s.noise({
    t: t + 0.03,
    d: 0.05,
    vol: 0.05,
    type: "highpass",
    f: 5000,
    dest,
    pan,
    wet: 0.2,
  });
  for (const [delay, freq] of [
    [0.09, 7000],
    [0.14, 6000],
    [0.21, 7800],
  ]) {
    s.noise({ t: t + delay, d: 0.02, vol: 0.02, f: freq, q: 4, dest, pan });
  }
  shardNotes(harmony.scale).forEach((note, k) =>
    s.tone({
      type: "triangle",
      f: midi(note),
      t: t + 0.1 + k * 0.055,
      a: 0.002,
      d: 0.16,
      vol: 0.017 * 0.82 ** k,
      dest,
      pan: Math.max(-1, Math.min(1, pan + (k % 2 ? 0.2 : -0.2))),
      wet: 0.4,
    }),
  );
}

/** Steps down the scale between the falling shard notes. */
const SHARD_STEPS = [1, 2, 1, 1, 2];

/**
 * The glass shatter's six falling notes (MIDI): from the highest note of
 * `scale` up to B♭7, down the scale by one or two notes at a time.
 */
export function shardNotes(scale: readonly number[]): number[] {
  let note = 106;
  while (!scale.includes(note % 12)) {
    note--;
  }
  const notes = [note];
  for (const steps of SHARD_STEPS) {
    for (let i = 0; i < steps; i++) {
      do {
        note--;
      } while (!scale.includes(note % 12));
    }
    notes.push(note);
  }
  return notes;
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
