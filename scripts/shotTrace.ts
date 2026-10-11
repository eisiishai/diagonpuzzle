// Shot tracing, used by `npm run trace`: plays moves on a board and
// describes each shot cell by cell. Rows and cells are numbered from 1 in
// the input and output, as the player counts them.

import { canPlaceAt, placeMirror } from "../src/game/placement";
import { fire } from "../src/game/simulate";
import type { Move } from "../src/game/solver";
import type { Board, MirrorType } from "../src/game/types";
import { formatLevel } from "../src/levels/parse";
import { cellName, describeShot } from "./levelAnalysis";

/**
 * Moves from command-line words: a number fires that row; "x,y" places
 * the player's mirror at column x, row y. Throws on anything else, or on a
 * placement without a player's mirror.
 */
export function parseMoves(
  words: readonly string[],
  playerMirror?: MirrorType,
): Move[] {
  return words.map((word) => {
    if (/^\d+$/.test(word)) {
      return Number(word) - 1;
    }
    const cell = /^(\d+),(\d+)$/.exec(word);
    if (cell === null) {
      throw new Error(`"${word}" is neither a row nor a cell like 3,2`);
    }
    if (playerMirror === undefined) {
      throw new Error(`"${word}" places a mirror, but there is none to place`);
    }
    return {
      x: Number(cell[1]) - 1,
      y: Number(cell[2]) - 1,
      mirror: playerMirror,
    };
  });
}

/**
 * Plays `moves` from `board`: for each shot a line with the row, its
 * outcome and what it changed, and every cell the pellet entered, then the
 * board after it; for a placement, where the mirror went. Throws on a row
 * outside the board or a cell the mirror can't go on.
 */
export function traceMoves(board: Board, moves: readonly Move[]): string[] {
  const lines: string[] = [];
  let current = board;
  for (const move of moves) {
    if (typeof move !== "number") {
      if (!canPlaceAt(current, move)) {
        throw new Error(`The mirror can't go at ${cellName(move)}`);
      }
      current = placeMirror(current, move, move.mirror);
      lines.push(`mirror placed at ${cellName(move)}`);
      continue;
    }
    if (move < 0 || move >= current.height) {
      throw new Error(`No row ${move + 1}: the board has ${current.height}`);
    }
    const result = fire(current, move);
    lines.push(
      `row ${move + 1}: ${describeShot(result)}`,
      `  ${result.path.map(cellName).join(" ")}`,
    );
    current = result.board;
    lines.push(formatLevel(current, "    "));
  }
  return lines;
}
