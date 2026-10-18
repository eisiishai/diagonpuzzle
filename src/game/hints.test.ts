import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { firstShotHint } from "./hints";

describe("firstShotHint", () => {
  it("gives the first row of a par solution", () => {
    // Row 0 first goes up and out, flipping its mirror to "\"; the second
    // shot from row 0 then goes down and is turned right into the goal.
    const board = parseLevel(String.raw`
      / .
      \ G
    `);
    expect(firstShotHint(board, 2)).toEqual({ row: 0, placeFirst: false });
  });

  it("finds none when par is out of reach", () => {
    const board = parseLevel(String.raw`
      / .
      \ G
    `);
    expect(firstShotHint(board, 1)).toBeNull();
  });

  it("counts goal hits", () => {
    expect(firstShotHint(parseLevel(". G\n# ."), 2, { goalHits: 2 })).toEqual({
      row: 0,
      placeFirst: false,
    });
  });

  it("says when the player's mirror goes down before the first shot", () => {
    // Only a "/" placed under the goal turns row 1's shot up into it.
    const board = parseLevel(String.raw`
      # G
      . .
    `);
    expect(firstShotHint(board, 1, { playerMirror: "mirrorSlash" })).toEqual({
      row: 1,
      placeFirst: true,
    });
  });
});
