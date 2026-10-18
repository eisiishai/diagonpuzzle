import { describe, expect, it } from "vitest";
import { nonFiniteValues, pitchClass, recordingSynth } from "./recordingSynth";

describe("recordingSynth", () => {
  it("records each voice played, and notes one after another", () => {
    const { synth, voices } = recordingSynth();
    const dest = {} as AudioNode;
    synth.tone({ f: 440, t: 0, dest });
    synth.notes([69, 81], 1, 0.5, (f, t) => synth.bell({ f, t, dest }));
    expect(voices).toEqual([
      { voice: "tone", options: { f: 440, t: 0, dest } },
      { voice: "bell", options: { f: 440, t: 1, dest } },
      { voice: "bell", options: { f: 880, t: 1.5, dest } },
    ]);
  });

  it("finds values Web Audio would refuse, nested ones too", () => {
    const { synth, voices } = recordingSynth();
    const dest = {} as AudioNode;
    synth.tone({ f: NaN, t: 0, dest });
    synth.held({ f: 220, t: Infinity, dur: 1, detunes: [0, NaN], dest });
    synth.noise({ t: 0, filter: { f: -Infinity } } as never);
    expect(nonFiniteValues(voices)).toEqual([
      "tone.f",
      "held.t",
      "held.detunes[1]",
      "noise.filter.f",
    ]);
  });

  it("names the pitch class of a frequency", () => {
    expect(pitchClass(440)).toBe(9);
    expect(pitchClass(261.63)).toBe(0);
    expect(pitchClass(27.5)).toBe(9);
  });
});
