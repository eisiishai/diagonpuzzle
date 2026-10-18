import { describe, expect, it } from "vitest";
import { formatLevel, parseLevel } from "../src/levels/parse";
import {
  gatesBlock,
  neededPieces,
  piecesOn,
  withFlippingMirrors,
  withoutPiece,
} from "./pieces";

describe("piecesOn", () => {
  it("counts each kind of piece on the board, in the game's order", () => {
    const board = parseLevel(String.raw`
      O % Z J G
      @ % N O .
    `);
    expect(piecesOn(board)).toEqual([
      { piece: "breakable", count: 2 },
      { piece: "reflector", count: 1 },
      { piece: "glass", count: 2 },
      { piece: "fixed", count: 1 },
      { piece: "portal", count: 2 },
    ]);
  });

  it("leaves out ordinary mirrors, walls and kinds not on the board", () => {
    expect(piecesOn(parseLevel(String.raw`/ \ # G`))).toEqual([]);
  });
});

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

  it("finds one-way gates needed only if one is passed and one blocks", () => {
    // Row 1 is stopped by the "<"; row 2 passes the ">" to the goal.
    expect(neededPieces(parseLevel(". < G\n> . G"), 1)).toEqual(["gate"]);
    // Passed, but blocking nothing.
    expect(neededPieces(parseLevel(". > G\n. . #"), 1)).toEqual([]);
  });

  it("leaves out pieces par can do without", () => {
    expect(neededPieces(parseLevel(". G\n% @"), 1)).toEqual([]);
    expect(neededPieces(parseLevel(". G\n. ."), 1, 1, "mirrorSlash")).toEqual(
      [],
    );
  });
});

describe("withoutPiece", () => {
  const board = parseLevel(String.raw`
    % @ N Z L
    J O O > G
  `);
  const without = (piece: Parameters<typeof withoutPiece>[1]) =>
    formatLevel(withoutPiece(board, piece));

  it("swaps every cell of the piece for a plainer one", () => {
    expect(without("breakable")).toBe("# @ N Z L\nJ O O > G");
    expect(without("reflector")).toBe("% # N Z L\nJ O O > G");
    expect(without("glass")).toBe("% @ \\ / L\nJ O O > G");
    expect(without("fixed")).toBe("% @ N Z \\\n/ O O > G");
    expect(without("portal")).toBe("% @ N Z L\nJ # # > G");
    expect(without("gate")).toBe("% @ N Z L\nJ O O # G");
  });

  it("leaves the board alone for the player's mirror, which isn't on it", () => {
    expect(withoutPiece(board, "playerMirror")).toBe(board);
  });
});

describe("gatesBlock", () => {
  it("is true when taking the gates away makes par lower or adds a way", () => {
    // Without the "<", row 1 reaches the goal too.
    expect(gatesBlock(parseLevel(". < G\n> . G"), 1)).toBe(true);
    // Without it, row 1 still hits the wall.
    expect(gatesBlock(parseLevel(". > G\n. . #"), 1)).toBe(false);
  });
});
