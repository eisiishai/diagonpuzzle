import { expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { canPlaceAt, placeMirror, placementPositions } from "./placement";

const BOARD = parseLevel(String.raw`
  . \ #
  % . G
`);

it("allows placing only on empty cells", () => {
  expect(placementPositions(BOARD)).toEqual([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]);
  expect(canPlaceAt(BOARD, { x: 1, y: 0 })).toBe(false);
  expect(canPlaceAt(BOARD, { x: 5, y: 0 })).toBe(false);
});

it("places a mirror without changing the given board", () => {
  const placed = placeMirror(BOARD, { x: 0, y: 0 }, "mirrorSlash");
  expect(placed.cells[0][0]).toBe("mirrorSlash");
  expect(BOARD.cells[0][0]).toBe("empty");
  expect(() => placeMirror(BOARD, { x: 2, y: 0 }, "mirrorSlash")).toThrow();
});
