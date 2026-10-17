import { describe, expect, it } from "vitest";
import { fire } from "../src/game/simulate";
import { parseLevel } from "../src/levels/parse";
import { describeShot, pieceList, rowList } from "./levelAnalysis";

describe("describeShot", () => {
  it("tells the outcome and counts flipped mirrors", () => {
    expect(describeShot(fire(parseLevel(". G"), 0))).toBe(
      "goal, flips 0 mirrors",
    );
    // Row 0 turns down at the "\", flipping it, and leaves the board.
    const one = parseLevel(String.raw`
      \ G
      . .
    `);
    expect(describeShot(fire(one, 0))).toBe("exit, flips 1 mirror");
    // Row 0 turns down at the "\" and left at the "/", flipping both.
    const two = parseLevel(String.raw`
      \ .
      / G
    `);
    expect(describeShot(fire(two, 0))).toBe("exit, flips 2 mirrors");
  });

  it("tells when a shot breaks a wall, but not when it stops at one", () => {
    expect(describeShot(fire(parseLevel(". %\n. G"), 0))).toBe(
      "blocked, breaks a wall, flips 0 mirrors",
    );
    expect(describeShot(fire(parseLevel(". #\n. G"), 0))).toBe(
      "blocked, flips 0 mirrors",
    );
  });
});

describe("describeShot with glass mirrors", () => {
  it("counts glass mirrors shattered apart from mirrors flipped", () => {
    // Row 0 turns down at the glass "\" (shattering it) and left at the "/".
    const board = parseLevel(String.raw`
      N .
      / G
    `);
    expect(describeShot(fire(board, 0))).toBe(
      "exit, flips 1 mirror, shatters 1 glass mirror",
    );
  });
});

describe("pieceList", () => {
  it("names each piece, with a count when there are several", () => {
    const board = parseLevel(String.raw`
      O % Z G
      @ % . O
    `);
    expect(pieceList(board, {})).toBe(
      "cracked wall ×2, reflector, glass, portals",
    );
  });

  it("adds the player's mirror and a goal needing several hits", () => {
    expect(
      pieceList(parseLevel(". % G"), {
        playerMirror: "mirrorSlash",
        goalHits: 2,
      }),
    ).toBe("cracked wall, player mirror /, goal 2 hits");
  });

  it("is a dash for a board of ordinary mirrors and walls", () => {
    expect(pieceList(parseLevel(String.raw`/ # G`), { goalHits: 1 })).toBe("-");
  });
});

describe("rowList", () => {
  it("counts rows and cells from 1, as the player does", () => {
    expect(rowList([3, { x: 2, y: 0, mirror: "mirrorSlash" }, 0])).toBe(
      "4 → / at (3,1) → 1",
    );
  });
});
