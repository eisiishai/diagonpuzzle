import { describe, expect, it } from "vitest";
import { fire } from "../game/simulate";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";

it("has unique level ids", () => {
  const ids = LEVELS.map((level) => level.id);
  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(LEVELS.map((level, index) => ({ ...level, number: index + 1 })))(
  "level $number ($name)",
  ({ grid }) => {
    it("parses", () => {
      expect(() => parseLevel(grid)).not.toThrow();
    });

    it("can be solved from at least one row", () => {
      const board = parseLevel(grid);
      const winningRows = Array.from(
        { length: board.height },
        (_, row) => row,
      ).filter((row) => fire(board, row).outcome === "goal");
      expect(winningRows.length).toBeGreaterThan(0);
    });
  },
);
