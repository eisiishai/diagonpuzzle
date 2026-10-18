// A stand-in for Synth in the unit tests: it plays nothing and records what
// the music and sound effects ask it to play, so tests can check the notes
// and values without Web Audio.

import type { Synth } from "./synth";
import { midi } from "./synth";

/** One call to a Synth voice: which voice, and its options. */
export interface RecordedVoice {
  voice: "tone" | "held" | "pad" | "noise" | "bell" | "glass";
  options: Record<string, unknown>;
}

/** A fake Synth, and the voices played into it so far. */
export function recordingSynth(): { synth: Synth; voices: RecordedVoice[] } {
  const voices: RecordedVoice[] = [];
  const record =
    (voice: RecordedVoice["voice"]) => (options: Record<string, unknown>) =>
      voices.push({ voice, options });
  const fake = {
    tone: record("tone"),
    held: record("held"),
    pad: record("pad"),
    noise: record("noise"),
    bell: record("bell"),
    glass: record("glass"),
    notes: (
      notes: number[],
      t: number,
      spacing: number,
      play: (f: number, t: number) => void,
    ) => notes.forEach((note, i) => play(midi(note), t + i * spacing)),
  };
  return { synth: fake as unknown as Synth, voices };
}

/**
 * The options of `voices` that are numbers but not finite (NaN or
 * infinite), as "voice.option" names: Web Audio throws on those.
 */
export function nonFiniteValues(voices: readonly RecordedVoice[]): string[] {
  const bad: string[] = [];
  const check = (value: unknown, name: string) => {
    if (typeof value === "number" && !Number.isFinite(value)) {
      bad.push(name);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => check(item, `${name}[${i}]`));
    } else if (typeof value === "object" && value !== null) {
      for (const [key, item] of Object.entries(value)) {
        check(item, `${name}.${key}`);
      }
    }
  };
  for (const { voice, options } of voices) {
    for (const [key, value] of Object.entries(options)) {
      // The audio node played into, a stand-in object here.
      if (key !== "dest") {
        check(value, `${voice}.${key}`);
      }
    }
  }
  return bad;
}

/** The pitch class (0 = C … 11 = B) of the frequency `f`, in hertz. */
export function pitchClass(f: number): number {
  const note = Math.round(69 + 12 * Math.log2(f / 440));
  return ((note % 12) + 12) % 12;
}
