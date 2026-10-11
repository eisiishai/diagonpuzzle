// The music tracks, generated step by step (designed on the sound lab
// pages). Each level names its track in src/levels/levels.ts; see
// docs/DESIGN.md, Sound.

import type { Synth } from "./synth";
import { midi } from "./synth";

export type MusicTrackId =
  "nightLab" | "afterglow" | "glassGarden" | "prism" | "photon";

/** The notes that fit the music at a moment, for tuning effects to it. */
export interface Harmony {
  /** The chord's root, as a MIDI note (its voicing may leave it out). */
  root: number;
  /** The chord playing, as MIDI notes. */
  chord: readonly number[];
  /** The track's scale, as pitch classes (0 = C … 11 = B). */
  scale: readonly number[];
  /** The track's home key (its tonic), as a pitch class. */
  tonic: number;
}

export interface MusicTrack {
  name: string;
  bpm: number;
  stepsPerBeat: number;
  /** Schedules everything that starts on step `i`, at time `t`, into `dest`. */
  step: (
    synth: Synth,
    dest: AudioNode,
    i: number,
    t: number,
    stepSeconds: number,
  ) => void;
  /** The harmony during step `i`. */
  harmony: (i: number) => Harmony;
}

// Night lab and Glass garden share one progression: Am – F – C – G.
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];
const A_MINOR_PENTATONIC = [9, 0, 2, 4, 7];
/** Pitch class of A, the home key of the A minor tracks. */
const A = 9;

/** Chord tones plus the root an octave up, for arpeggios. */
const arpTones = (chord: number[]) => [...chord, chord[0] + 12];

const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/**
 * The ambient tracks' bed for one chord: four slow pads whose filter opens
 * on even chords and closes on odd ones, and a soft sine bass, overlapping
 * into the next chord.
 */
function ambientBed(
  s: Synth,
  dest: AudioNode,
  t: number,
  seconds: number,
  chord: readonly number[],
  root: number,
  chordNumber: number,
): void {
  const dur = seconds + 2.5;
  const opening = chordNumber % 2 === 0;
  chord.forEach((note, j) =>
    s.pad({
      f: midi(note),
      t: t + j * 0.15,
      dur,
      a: 2.5,
      r: 3,
      vol: 0.016,
      from: opening ? 450 : 1300,
      to: opening ? 1300 : 450,
      dest,
      wet: 0.5,
    }),
  );
  s.held({
    type: "sine",
    f: midi(root),
    t,
    dur,
    a: 2,
    r: 2.5,
    vol: 0.09,
    cutoff: 300,
    detunes: [0],
    dest,
  });
}

/**
 * Decides at random whether a sparse detail plays on step `i`: chance `p`
 * per step, never within `gap` steps of the last one. Each track keeps its
 * own `state`, reset when the track starts again from step 0.
 */
function sparse(state: { last: number }, i: number, gap: number, p: number) {
  if (i === 0) {
    state.last = -Infinity;
  }
  if (i - state.last >= gap && Math.random() < p) {
    state.last = i;
    return true;
  }
  return false;
}

// Ambient tracks: chord voicings and bass roots.
const AFTERGLOW = {
  chords: [
    [57, 64, 67, 71],
    [53, 60, 64, 69],
    [48, 55, 59, 64],
    [55, 57, 62, 64],
  ],
  roots: [45, 41, 48, 43],
  plucks: { last: -Infinity },
};
const PRISM = {
  chords: [
    [53, 60, 64, 71],
    [48, 55, 59, 62],
  ],
  roots: [41, 36],
  scale: [5, 7, 9, 11, 0, 2, 4],
  // Fmaj7♯11 – Cmaj9 sways between F and C; it comes home to C.
  tonic: 0,
  bells: { last: -Infinity },
};
const PHOTON = {
  chords: [
    [55, 59, 62, 66],
    [52, 55, 59, 62],
  ],
  roots: [40, 36],
  scale: [4, 7, 9, 11, 2],
  tonic: 4,
};
const GLASS_BELLS = [69, 72, 74, 76, 79, 81, 84];
const glassBells = { last: -Infinity };

/** Steps per chord in the ambient tracks: a chord every 8–9 seconds. */
const AMBIENT_CHORD_STEPS = 16;

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = {
  // Calm synthwave: warm detuned pads, a soft echoing arpeggio, deep bass.
  // The title screen's music.
  nightLab: {
    name: "Night lab",
    bpm: 84,
    stepsPerBeat: 2,
    harmony: (i) => ({
      root: ROOTS[Math.floor(i / 8) % 4],
      chord: CHORDS[Math.floor(i / 8) % 4],
      scale: A_MINOR_PENTATONIC,
      tonic: A,
    }),
    step: (s, dest, i, t, step) => {
      const bar = Math.floor(i / 8);
      const chord = CHORDS[bar % 4];
      if (i % 8 === 0) {
        for (const note of chord) {
          s.held({
            f: midi(note),
            t,
            dur: step * 8,
            a: 0.7,
            r: 0.8,
            vol: 0.035,
            cutoff: 1100,
            dest,
            wet: 0.35,
          });
        }
        s.held({
          type: "sine",
          f: midi(ROOTS[bar % 4]),
          t,
          dur: step * 8,
          a: 0.05,
          r: 0.4,
          vol: 0.16,
          cutoff: 400,
          detunes: [0],
          dest,
        });
      }
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
      s.tone({
        type: "triangle",
        f: midi(arpTones(chord)[pattern[i % 8]] + 12),
        t,
        d: step * 0.8,
        vol: 0.05,
        dest,
        echo: 0.6,
        wet: 0.2,
      });
    },
  },

  // Ambient: warm pads with a slowly moving filter, a soft sine bass and
  // an occasional echoing pluck. Am9 – Fmaj7 – Cmaj7 – G6.
  afterglow: {
    name: "Afterglow",
    bpm: 60,
    stepsPerBeat: 2,
    harmony: (i) => ({
      root: AFTERGLOW.roots[Math.floor(i / AMBIENT_CHORD_STEPS) % 4],
      chord: AFTERGLOW.chords[Math.floor(i / AMBIENT_CHORD_STEPS) % 4],
      scale: A_MINOR_PENTATONIC,
      tonic: A,
    }),
    step: (s, dest, i, t, step) => {
      const k = Math.floor(i / AMBIENT_CHORD_STEPS);
      const chord = AFTERGLOW.chords[k % 4];
      if (i % AMBIENT_CHORD_STEPS === 0) {
        const seconds = step * AMBIENT_CHORD_STEPS;
        ambientBed(s, dest, t, seconds, chord, AFTERGLOW.roots[k % 4], k);
      }
      if (sparse(AFTERGLOW.plucks, i, 4, 0.14)) {
        s.tone({
          type: "triangle",
          f: midi(pick(chord) + pick([12, 24])),
          t,
          a: 0.02,
          d: 1.4,
          vol: 0.026,
          dest,
          echo: 0.55,
          wet: 0.5,
        });
      }
    },
  },

  // Very calm: only a slow, dark drone and a soft bell now and then, so it
  // never competes with thinking about the harder levels.
  glassGarden: {
    name: "Glass garden",
    bpm: 68,
    stepsPerBeat: 2,
    harmony: (i) => ({
      root: ROOTS[Math.floor(i / 16) % 4],
      chord: CHORDS[Math.floor(i / 16) % 4],
      scale: A_MINOR_PENTATONIC,
      tonic: A,
    }),
    step: (s, dest, i, t, step) => {
      const chord = CHORDS[Math.floor(i / 16) % 4];
      if (i % 16 === 0) {
        for (const note of chord) {
          s.held({
            f: midi(note - 12),
            t,
            dur: step * 16,
            a: 2,
            r: 2,
            vol: 0.03,
            cutoff: 650,
            dest,
            wet: 0.5,
          });
        }
      }
      if (sparse(glassBells, i, 3, 0.16)) {
        s.bell({
          f: midi(pick(GLASS_BELLS)),
          t,
          d: 2.2,
          vol: 0.034,
          index: 1.1,
          dest,
          wet: 0.6,
          echo: 0.3,
        });
      }
    },
  },

  // Ambient, bright and floating: two swaying chords (Fmaj7♯11 – Cmaj9), a
  // faint high shimmer and glassy bells now and then with a long tail.
  prism: {
    name: "Prism drift",
    bpm: 56,
    stepsPerBeat: 2,
    harmony: (i) => ({
      root: PRISM.roots[Math.floor(i / AMBIENT_CHORD_STEPS) % 2],
      chord: PRISM.chords[Math.floor(i / AMBIENT_CHORD_STEPS) % 2],
      scale: PRISM.scale,
      tonic: PRISM.tonic,
    }),
    step: (s, dest, i, t, step) => {
      const k = Math.floor(i / AMBIENT_CHORD_STEPS);
      const chord = PRISM.chords[k % 2];
      if (i % AMBIENT_CHORD_STEPS === 0) {
        const seconds = step * AMBIENT_CHORD_STEPS;
        ambientBed(s, dest, t, seconds, chord, PRISM.roots[k % 2], k);
        s.held({
          type: "sine",
          f: midi(chord[chord.length - 1] + 24),
          t,
          dur: seconds + 2.5,
          a: 3,
          r: 3,
          vol: 0.006,
          cutoff: 6000,
          detunes: [-5, 5],
          dest,
          wet: 0.6,
        });
      }
      if (sparse(PRISM.bells, i, 3, 0.12)) {
        s.bell({
          f: midi(pick(chord) + 24),
          t,
          d: 3,
          vol: 0.024,
          ratio: 3.5,
          index: 0.9,
          dest,
          wet: 0.7,
          echo: 0.35,
        });
      }
    },
  },

  // Ambient, dark and spacious: pads and sub bass on Em9 – Cmaj9, crossed
  // now and then by a soft gliding tone with a long echo, like a slow laser
  // streak.
  photon: {
    name: "Photon",
    bpm: 60,
    stepsPerBeat: 2,
    harmony: (i) => ({
      root: PHOTON.roots[Math.floor(i / AMBIENT_CHORD_STEPS) % 2],
      chord: PHOTON.chords[Math.floor(i / AMBIENT_CHORD_STEPS) % 2],
      scale: PHOTON.scale,
      tonic: PHOTON.tonic,
    }),
    step: (s, dest, i, t, step) => {
      const k = Math.floor(i / AMBIENT_CHORD_STEPS);
      const chord = PHOTON.chords[k % 2];
      if (i % AMBIENT_CHORD_STEPS === 0) {
        const seconds = step * AMBIENT_CHORD_STEPS;
        ambientBed(s, dest, t, seconds, chord, PHOTON.roots[k % 2], k);
      }
      if (i % 8 === 4 && Math.random() < 0.55) {
        // Glide between two neighbouring chord tones, up or down.
        const j = Math.floor(Math.random() * (chord.length - 1));
        const [from, to] =
          Math.random() < 0.5
            ? [chord[j], chord[j + 1]]
            : [chord[j + 1], chord[j]];
        s.tone({
          f: midi(from + 24),
          f2: midi(to + 24),
          t,
          a: 0.5,
          d: 2,
          vol: 0.02,
          dest,
          echo: 0.6,
          wet: 0.6,
        });
        s.tone({
          type: "triangle",
          f: midi(from + 12),
          f2: midi(to + 12),
          t,
          a: 0.5,
          d: 2,
          vol: 0.008,
          dest,
          wet: 0.5,
        });
      }
    },
  },
};

/** The title screen's music. */
export const TITLE_MUSIC: MusicTrackId = "nightLab";

/** The harmony when no music is playing: the title track's key. */
export const DEFAULT_HARMONY: Harmony = {
  root: ROOTS[0],
  chord: CHORDS[0],
  scale: A_MINOR_PENTATONIC,
  tonic: A,
};
