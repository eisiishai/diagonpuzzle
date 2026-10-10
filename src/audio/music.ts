// The music tracks, generated step by step (designed on the sound lab page).
// Each level names its track in src/levels/levels.ts; see docs/DESIGN.md,
// Sound.

import type { Synth } from "./synth";
import { midi } from "./synth";

export type MusicTrackId = "nightLab" | "pulse" | "glassGarden";

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
}

// All tracks share one progression: Am – F – C – G.
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ROOTS = [45, 41, 48, 43];

/** Chord tones plus the root an octave up, for arpeggios. */
const arpTones = (chord: number[]) => [...chord, chord[0] + 12];

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = {
  // Calm synthwave: warm detuned pads, a soft echoing arpeggio, deep bass.
  nightLab: {
    name: "Night lab",
    bpm: 84,
    stepsPerBeat: 2,
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

  // Driving synthwave: kick, hi-hats, a pumping bass and a bright lead.
  pulse: {
    name: "Pulse",
    bpm: 104,
    stepsPerBeat: 4,
    step: (s, dest, i, t, step) => {
      const bar = Math.floor(i / 16);
      const chord = CHORDS[bar % 4];
      const root = ROOTS[bar % 4];
      if (i % 4 === 0) {
        s.tone({ f: 150, f2: 45, t, d: 0.22, vol: 0.42, dest });
      }
      if (i % 4 === 2) {
        s.noise({ t, d: 0.04, vol: 0.05, type: "highpass", f: 7000, dest });
      }
      if (i % 16 === 4 || i % 16 === 12) {
        s.noise({ t, d: 0.14, vol: 0.09, f: 1800, q: 0.9, dest, wet: 0.25 });
      }
      if (i % 2 === 0) {
        s.tone({
          type: "sawtooth",
          f: midi(root + (i % 4 === 2 ? 12 : 0)),
          t,
          d: step * 1.6,
          vol: 0.07,
          filter: { f: 700 },
          dest,
        });
        const pattern = [0, 1, 2, 1, 2, 3, 2, 1];
        s.tone({
          type: "square",
          f: midi(arpTones(chord)[pattern[(i / 2) % 8]] + 12),
          t,
          d: step * 1.2,
          vol: 0.025,
          filter: { f: 2600 },
          dest,
          echo: 0.5,
        });
      }
      if (i % 16 === 0) {
        for (const note of chord) {
          s.held({
            f: midi(note),
            t,
            dur: step * 16,
            a: 0.3,
            r: 0.5,
            vol: 0.022,
            cutoff: 1600,
            dest,
            wet: 0.3,
          });
        }
      }
    },
  },

  // Very calm ambient: only a slow, dark drone, so it never competes with
  // thinking about the harder levels.
  glassGarden: {
    name: "Glass garden",
    bpm: 68,
    stepsPerBeat: 2,
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
    },
  },
};

/** The title screen's music. */
export const TITLE_MUSIC: MusicTrackId = "nightLab";
