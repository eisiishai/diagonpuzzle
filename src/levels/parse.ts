import type { Board, CellType } from "../game/types";

/** The text symbol of each cell type in level grids. */
export const CELL_SYMBOLS: Readonly<Record<CellType, string>> = {
  empty: ".",
  mirrorBackslash: "\\",
  mirrorSlash: "/",
  wall: "#",
  breakable: "%",
  reflector: "@",
  goal: "G",
  bonus: "*",
};

const CELLS_BY_SYMBOL = new Map(
  (Object.keys(CELL_SYMBOLS) as CellType[]).map((cell) => [
    CELL_SYMBOLS[cell],
    cell,
  ]),
);

/**
 * Parses a level text grid (format in docs/DESIGN.md). Whitespace within a
 * row is ignored and blank lines are skipped, so rows may be space-separated
 * and indented.
 */
export function parseLevel(text: string): Board {
  const rows = text
    .split("\n")
    .map((line, index) => ({
      lineNumber: index + 1,
      symbols: line.replace(/\s/g, ""),
    }))
    .filter((row) => row.symbols.length > 0);

  if (rows.length === 0) {
    throw new Error("Level is empty");
  }

  const width = rows[0].symbols.length;
  let goals = 0;
  const cells = rows.map(({ lineNumber, symbols }) => {
    if (symbols.length !== width) {
      throw new Error(
        `Line ${lineNumber}: expected ${width} cells, found ${symbols.length}`,
      );
    }
    return [...symbols].map((symbol, column) => {
      const cell = CELLS_BY_SYMBOL.get(symbol);
      if (cell === undefined) {
        throw new Error(
          `Line ${lineNumber}, cell ${column + 1}: unknown symbol "${symbol}"`,
        );
      }
      if (cell === "goal") {
        goals++;
      }
      return cell;
    });
  });

  if (goals === 0) {
    throw new Error("Level has no goal (G)");
  }

  return { width, height: rows.length, cells };
}

/**
 * The board as a level text grid, the reverse of parseLevel: one line per
 * row, cells separated by spaces, each line prefixed with `indent`.
 */
export function formatLevel(board: Board, indent = ""): string {
  return board.cells
    .map((row) => indent + row.map((cell) => CELL_SYMBOLS[cell]).join(" "))
    .join("\n");
}
