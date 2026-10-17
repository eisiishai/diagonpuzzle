import { describe, expect, it } from "vitest";
import { parseLevel } from "../src/levels/parse";
import { neededPieces, withFlippingMirrors } from "./pieces";

describe("neededPieces", () => {
  it("lists the pieces without which par is out of reach", () => {
    // Row 1 breaks the cracked wall; row 1 then runs through to the goal.
    expect(neededPieces(parseLevel(". % G"), 2)).toEqual(["breakable"]);
    // Row 1 turns down into the reflector and back up into the flipped
    // mirror, which turns it right to the goal.
    expect(
      neededPieces(
        parseLevel(String.raw`. \ G
. @ .`),
        1,
      ),
    ).toEqual(["reflector"]);
    // The glass mirror turns row 1 away once; then row 1 runs straight on.
    expect(neededPieces(parseLevel(". Z G"), 2)).toEqual(["glass"]);
    // Row 1 goes into the portal and comes out of the one beside the goal;
    // with the portals made walls, no row gets through.
    expect(
      neededPieces(
        parseLevel(String.raw`O # .
# O G`),
        1,
      ),
    ).toEqual(["portal"]);
  });

  it("finds fixed mirrors and the player's mirror needed", () => {
    // Bolted down (level 31): row 3 twice, the fixed "/" turning both.
    const bolted = parseLevel(String.raw`
      . \ . \ G
      . . . . .
      . . . J .
      . / . # .
    `);
    expect(neededPieces(bolted, 2)).toEqual(["fixed"]);
    expect(withFlippingMirrors(bolted).cells[2][3]).toBe("mirrorSlash");
    expect(
      neededPieces(parseLevel(". .\n# G"), 1, 1, "mirrorBackslash"),
    ).toEqual(["playerMirror"]);
  });

  it("leaves out pieces par can do without", () => {
    expect(neededPieces(parseLevel(". G\n% @"), 1)).toEqual([]);
    expect(neededPieces(parseLevel(". G\n. ."), 1, 1, "mirrorSlash")).toEqual(
      [],
    );
  });
});
