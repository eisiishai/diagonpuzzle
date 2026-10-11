// Shot tracer: `npm run trace -- --level N MOVES...` or `--grid TEXT`.
// Plays shots (and the player's mirror) on a level or any board and prints
// each shot's cells and the board after it, to check a route by hand while
// designing levels. `--help` lists the options.

import { withBonuses } from "../src/game/bonus";
import type { MirrorType } from "../src/game/types";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import { parseMoves, traceMoves } from "./shotTrace";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

const HELP = `Usage: npm run trace -- (--level N | --grid TEXT) [options] MOVES...

  --level N|ID        a level, by number (from 1) or id; its bonus target
                      is left in only with --bonus
  --grid TEXT         a board in the level grid format, rows separated by
                      "|" or newlines
  --player-mirror M   with --grid: the player's mirror, slash or backslash
  --bonus             with --level: keep the bonus target on the board

MOVES are rows to fire (counted from 1 at the top) and cells "x,y" where
the player's mirror goes (column x, row y, from 1), in order.

Examples: npm run trace -- --level 22 4 2 5,3 4
          npm run trace -- --grid ". \\ G|. @ ." 1`;

const MIRRORS: Record<string, MirrorType> = {
  slash: "mirrorSlash",
  backslash: "mirrorBackslash",
};

function run(args: string[]): void {
  let level: string | undefined;
  let grid: string | undefined;
  let playerMirror: MirrorType | undefined;
  let bonus = false;
  const words: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help") {
      console.log(HELP);
      return;
    } else if (arg === "--level") {
      level = args[++i];
    } else if (arg === "--grid") {
      grid = args[++i];
    } else if (arg === "--bonus") {
      bonus = true;
    } else if (arg === "--player-mirror") {
      playerMirror = MIRRORS[args[++i]];
      if (playerMirror === undefined) {
        throw new Error("--player-mirror is slash or backslash");
      }
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option ${arg}`);
    } else {
      words.push(arg);
    }
  }

  let board;
  if (level !== undefined) {
    const index = LEVELS.findIndex(
      (candidate, i) => candidate.id === level || String(i + 1) === level,
    );
    if (index < 0) {
      throw new Error(`No level ${level}`);
    }
    const definition = LEVELS[index];
    playerMirror = definition.playerMirror;
    board = parseLevel(definition.grid);
    if (!bonus) {
      board = withBonuses(board);
    }
    console.log(`Level ${index + 1}: ${definition.name}`);
  } else if (grid !== undefined) {
    board = parseLevel(grid.split("|").join("\n"));
  } else {
    throw new Error("--level or --grid is required");
  }
  for (const line of traceMoves(board, parseMoves(words, playerMirror))) {
    console.log(line);
  }
}

try {
  run(process.argv.slice(2));
} catch (error) {
  console.error(`${(error as Error).message}\n\n${HELP}`);
  process.exitCode = 1;
}
