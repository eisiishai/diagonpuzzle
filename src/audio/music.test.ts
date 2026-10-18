import { afterEach, describe, expect, it, vi } from "vitest";
import { MUSIC_TRACKS } from "./music";
import { nonFiniteValues, pitchClass, recordingSynth } from "./recordingSynth";

/** Math.random replaced by a fixed sequence, the same on every run. */
function seededRandom(): void {
  let seed = 1;
  vi.spyOn(Math, "random").mockImplementation(() => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Long enough for every track to go round its chords several times. */
const STEPS = 512;

describe("music tracks", () => {
  it.each(Object.entries(MUSIC_TRACKS))(
    "%s plays only its scale, chord and chord root",
    (_, track) => {
      seededRandom();
      const outside: string[] = [];
      let played = 0;
      for (let i = 0; i < STEPS; i++) {
        const { synth, voices } = recordingSynth();
        track.step(synth, {} as AudioNode, i, i * 0.25, 0.25);
        const { scale, chord, root } = track.harmony(i);
        const inKey = new Set([
          ...scale,
          ...[...chord, root].map(pitchClass12),
        ]);
        for (const { voice, options } of voices) {
          // Noise is filtered at a frequency, not tuned to it.
          if (voice === "noise") {
            continue;
          }
          for (const f of [options.f, options.f2]) {
            if (typeof f === "number") {
              played++;
              if (!inKey.has(pitchClass(f))) {
                outside.push(`step ${i}: ${voice} at ${f.toFixed(1)} Hz`);
              }
            }
          }
        }
      }
      expect(played).toBeGreaterThan(0);
      expect(outside).toEqual([]);
    },
  );

  it.each(Object.entries(MUSIC_TRACKS))(
    "%s gives the synth only finite values",
    (_, track) => {
      seededRandom();
      const { synth, voices } = recordingSynth();
      for (let i = 0; i < STEPS; i++) {
        track.step(synth, {} as AudioNode, i, i * 0.25, 0.25);
      }
      expect(nonFiniteValues(voices)).toEqual([]);
    },
  );
});

/** The pitch class of a MIDI note. */
function pitchClass12(note: number): number {
  return ((note % 12) + 12) % 12;
}
