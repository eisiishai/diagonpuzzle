import { describe, expect, it } from "vitest";
import { parseLevel } from "../src/levels/parse";
import { foresight, oneIn, randomWinChance } from "./difficulty";

describe("randomWinChance", () => {
  it("is the share of rows that win in one shot", () => {
    expect(randomWinChance(parseLevel(". G\n. ."), 1)).toBe(0.5);
  });

  it("adds the chances of later shots", () => {
    // Row 0 hits the goal; row 1 misses and changes nothing, so a second
    // shot gets another half chance: 1/2 + 1/2 · 1/2.
    expect(randomWinChance(parseLevel(". G\n. ."), 2)).toBe(0.75);
  });

  it("needs every goal hit within the shots", () => {
    expect(randomWinChance(parseLevel(". G\n. ."), 1, 2)).toBe(0);
    expect(randomWinChance(parseLevel(". G\n. ."), 2, 2)).toBe(0.25);
  });

  it("keeps or places the player's mirror at random", () => {
    // Only a "\" at (1, 0) with row 0 wins: kept with chance 1/2, else
    // placed on one of two empty cells, then one of two rows.
    const board = parseLevel(String.raw`
      . .
      # G
    `);
    expect(randomWinChance(board, 1)).toBe(0);
    expect(randomWinChance(board, 1, 1, "mirrorBackslash")).toBe(0.125);
  });

  it("keeps the player's mirror when no cell is empty", () => {
    // Row 0 wins whether or not the mirror is in hand: 1 of 2 rows.
    const board = parseLevel(String.raw`
      G
      #
    `);
    expect(randomWinChance(board, 1, 1, "mirrorSlash")).toBe(0.5);
  });
});

describe("foresight", () => {
  // Row 1 meets the "\" and turns down, flipping it to "/"; fired again,
  // row 1 turns up at the "/" into the goal.
  const flip = parseLevel(String.raw`
    . G
    . \
  `);

  it("counts a cell changed by one shot that a later shot passes", () => {
    expect(foresight(flip, [1, 1])).toBe(1);
  });

  it("is 0 when no shot passes an earlier change", () => {
    expect(foresight(flip, [1])).toBe(0);
    // The second shot never reaches the flipped mirror.
    expect(foresight(flip, [1, 0])).toBe(0);
  });

  it("counts the player's mirror when a later shot passes it", () => {
    const board = parseLevel(String.raw`
      . .
      # G
    `);
    const place = { x: 1, y: 0, mirror: "mirrorBackslash" } as const;
    expect(foresight(board, [place, 0])).toBe(1);
    expect(foresight(board, [place, 1])).toBe(0);
  });

  it("counts each cell once", () => {
    expect(foresight(flip, [1, 1, 1])).toBe(1);
  });
});

describe("oneIn", () => {
  it("rounds and groups thousands", () => {
    expect(oneIn(0.2)).toBe("1 in 5");
    expect(oneIn(1 / 52500)).toBe("1 in 52,500");
    expect(oneIn(0)).toBe("never");
  });
});
