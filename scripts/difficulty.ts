// Rough difficulty measures for the level design tools. Random play's
// chance of completing a level within par (lower is harder) counts how big
// the space of plays is, not how much insight a level needs, so it
// overrates levels whose key move is easy to see. Foresight counts what a
// solution must plan ahead: the changes it makes for later shots. See
// docs/ROADMAP.md, Difficulty curve.

import { placeMirror } from "../src/game/placement";
import { boardStateKey, fire } from "../src/game/simulate";
import { mirrorPlacements } from "../src/game/solver";
import type { Move } from "../src/game/solver";
import type { Board, MirrorType } from "../src/game/types";

/**
 * The chance that random play completes the level within `shots` shots:
 * each shot fires from a random row. With a player mirror still in hand,
 * before each shot the player keeps it with chance 1/2, or else places it
 * on a random empty cell.
 */
export function randomWinChance(
  board: Board,
  shots: number,
  goalHits = 1,
  playerMirror?: MirrorType,
): number {
  const memo = new Map<string, number>();
  const chance = (
    current: Board,
    inHand: boolean,
    hits: number,
    left: number,
  ): number => {
    if (left === 0) {
      return 0;
    }
    const key = `${left}|${hits}|${inHand}|${boardStateKey(current)}`;
    const known = memo.get(key);
    if (known !== undefined) {
      return known;
    }
    const choices: { board: Board; inHand: boolean; weight: number }[] = [];
    if (inHand && playerMirror !== undefined) {
      const placements = mirrorPlacements(current, playerMirror);
      const weight = placements.length ? 0.5 : 1;
      choices.push({ board: current, inHand, weight });
      for (const placement of placements) {
        choices.push({
          board: placement.board,
          inHand: false,
          weight: 0.5 / placements.length,
        });
      }
    } else {
      choices.push({ board: current, inHand, weight: 1 });
    }
    let total = 0;
    for (const choice of choices) {
      for (let row = 0; row < current.height; row++) {
        const result = fire(choice.board, row);
        const newHits = hits + (result.outcome === "goal" ? 1 : 0);
        const win =
          newHits >= goalHits
            ? 1
            : chance(result.board, choice.inHand, newHits, left - 1);
        total += (choice.weight / current.height) * win;
      }
    }
    memo.set(key, total);
    return total;
  };
  return chance(board, playerMirror !== undefined, 0, shots);
}

/** A chance as "1 in N", e.g. 0.0002 → "1 in 5,000"; "never" for 0. */
export function oneIn(chance: number): string {
  return chance > 0
    ? `1 in ${Math.round(1 / chance).toLocaleString("en-US")}`
    : "never";
}

/**
 * How much a solution must plan ahead: the cells that one move changes (a
 * shot flipping a mirror or breaking a wall, or placing the player's
 * mirror) and a later shot then passes through. 0 when every shot works
 * on the board as it is. Each cell counts once.
 */
export function foresight(board: Board, moves: readonly Move[]): number {
  const changed = new Set<string>();
  const used = new Set<string>();
  let current = board;
  for (const move of moves) {
    if (typeof move !== "number") {
      current = placeMirror(current, move, move.mirror);
      changed.add(`${move.x},${move.y}`);
      continue;
    }
    const result = fire(current, move);
    for (const { x, y } of result.path) {
      if (changed.has(`${x},${y}`)) {
        used.add(`${x},${y}`);
      }
    }
    for (const { x, y, becomes } of result.path) {
      if (becomes) {
        changed.add(`${x},${y}`);
      }
    }
    current = result.board;
  }
  return used.size;
}
