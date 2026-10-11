import { describe, expect, it } from "vitest";
import {
  bounceNote,
  columnPan,
  endingNotes,
  goalChimeNotes,
  shardNotes,
} from "./effects";
import { MUSIC_TRACKS, mirrorPhrase, scaleNotes } from "./music";

const A_MINOR_PENTATONIC = [9, 0, 2, 4, 7];

describe("bounceNote", () => {
  it("climbs the scale from E5, one note per bounce", () => {
    const notes = [1, 2, 3, 4].map((n) => bounceNote(n, A_MINOR_PENTATONIC));
    expect(notes).toEqual([76, 79, 81, 84]);
  });

  it("stops climbing after ten steps", () => {
    expect(bounceNote(30, A_MINOR_PENTATONIC)).toBe(
      bounceNote(11, A_MINOR_PENTATONIC),
    );
  });

  it("stays in every track's scale", () => {
    for (const track of Object.values(MUSIC_TRACKS)) {
      const { scale } = track.harmony(0);
      for (let n = 1; n <= 12; n++) {
        expect(scale).toContain(bounceNote(n, scale) % 12);
      }
    }
  });
});

describe("goalChimeNotes", () => {
  it("plays a minor arpeggio on a minor chord", () => {
    const harmony = {
      root: 45,
      chord: [57, 60, 64],
      scale: A_MINOR_PENTATONIC,
      tonic: 9,
    };
    expect(goalChimeNotes(harmony)).toEqual([81, 84, 88, 93]);
  });

  it("plays a major arpeggio on a major chord", () => {
    const harmony = {
      root: 48,
      chord: [48, 52, 55],
      scale: A_MINOR_PENTATONIC,
      tonic: 9,
    };
    expect(goalChimeNotes(harmony)).toEqual([84, 88, 91, 96]);
  });

  it("uses fifths when neither chord nor scale has a third", () => {
    const harmony = {
      root: 43,
      chord: [55, 57, 62, 64],
      scale: A_MINOR_PENTATONIC,
      tonic: 9,
    };
    expect(goalChimeNotes(harmony)).toEqual([79, 86, 91, 98]);
  });
});

describe("columnPan", () => {
  it("pans from left to right across the board, up to 40 %", () => {
    expect(columnPan(-1, 7)).toBeCloseTo(-0.4);
    expect(columnPan(3, 7)).toBeCloseTo(0);
    expect(columnPan(6, 7)).toBeCloseTo((6.5 / 7) * 0.8 - 0.4);
    expect(columnPan(10, 7)).toBeCloseTo(0.4);
  });
});

describe("endingNotes", () => {
  it("ends A minor music on A major with an added ninth", () => {
    expect(endingNotes(9)).toEqual({
      root: 45,
      chord: [57, 61, 64, 71],
      bells: [69, 73, 76, 81, 83, 85],
    });
  });

  it("keeps the bass root between C2 and B2", () => {
    expect(endingNotes(0).root).toBe(36);
    expect(endingNotes(4).root).toBe(40);
    expect(endingNotes(11).root).toBe(47);
  });

  it("is in the key of every track", () => {
    for (const track of Object.values(MUSIC_TRACKS)) {
      const { tonic } = track.harmony(0);
      expect(endingNotes(tonic).root % 12).toBe(tonic);
    }
  });
});

describe("mirrorPhrase", () => {
  const D_MINOR_PENTATONIC = [2, 5, 7, 9, 0];

  it("answers a phrase with its mirror image around the first note", () => {
    // Near A4 (69): two scale steps up is D5 (74), two down is F4 (65).
    expect(mirrorPhrase(D_MINOR_PENTATONIC, 69, 2)).toEqual({
      phrase: [69, 74],
      answer: [69, 65],
    });
  });

  it("keeps both phrases inside the range near its ends", () => {
    const notes = scaleNotes(D_MINOR_PENTATONIC, 62, 90);
    for (const near of [50, 62, 90, 100]) {
      for (const steps of [1, 2, 3]) {
        const { phrase, answer } = mirrorPhrase(
          D_MINOR_PENTATONIC,
          near,
          steps,
        );
        for (const note of [...phrase, ...answer]) {
          expect(notes).toContain(note);
        }
        expect(phrase[1] - phrase[0]).toBeGreaterThan(0);
        expect(answer[1] - answer[0]).toBeLessThan(0);
      }
    }
  });
});

describe("shardNotes", () => {
  it("falls six notes down the scale from its top, in every track's key", () => {
    // A minor pentatonic below B♭7: A7 (105), then 1, 2, 1, 1, 2 steps down.
    expect(shardNotes(A_MINOR_PENTATONIC)).toEqual([105, 103, 98, 96, 93, 88]);
    for (const track of Object.values(MUSIC_TRACKS)) {
      const { scale } = track.harmony(0);
      const notes = shardNotes(scale);
      expect(notes).toHaveLength(6);
      notes.forEach((note, i) => {
        expect(scale).toContain(note % 12);
        if (i > 0) {
          expect(note).toBeLessThan(notes[i - 1]);
        }
      });
    }
  });
});
