// Alternative solutions: `npm run alternatives -- [options]`. Without
// --level, lists for every level how many different ways complete it at
// par and in a shot or two more. With --level, lists that level's
// solutions, and with --changes, board changes that add new alternative
// solutions while keeping par, the par solution and the bonus target (the
// best one printed ready to paste into src/levels/levels.ts). Rows and
// columns are numbered from 1, as the player counts them. `--help` lists
// the options.

import { withBonuses } from "../src/game/bonus";
import { LEVELS } from "../src/levels/levels";
import { CELL_SYMBOLS, formatLevel, parseLevel } from "../src/levels/parse";
import {
  alternativeSolutions,
  findAlternativeChanges,
} from "./alternativeSearch";
import type { AlternativeChange } from "./alternativeSearch";
import { oneIn, randomWinChance } from "./difficulty";
import { cellName, rowList, shotCount } from "./levelAnalysis";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

const HELP = `Usage: npm run alternatives -- [options]

  --level N|ID      one level, by number (from 1) or id; without it, a
                    summary of every level
  --extra N         count solutions up to par + N shots (default 1)
  --changes N       with --level: board cells that may change to add
                    alternatives, 0-2 (default 0); 2 can take minutes
  --show N          solutions or changes to list (default 10)

Example: npm run alternatives -- --level 9 --changes 1`;

interface Args {
  level?: string;
  extra: number;
  changes: number;
  show: number;
}

const NUMBER_FLAGS: Record<string, "extra" | "changes" | "show"> = {
  "--extra": "extra",
  "--changes": "changes",
  "--show": "show",
};

function parseArgs(args: string[]): Args | null {
  const parsed: Args = { extra: 1, changes: 0, show: 10 };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--level") {
      parsed.level = args[++i];
      continue;
    }
    const key = NUMBER_FLAGS[flag];
    if (key === undefined) {
      console.error(
        flag === "--help" ? HELP : `Unknown option ${flag}\n\n${HELP}`,
      );
      return null;
    }
    const value = Number(args[++i]);
    if (!Number.isInteger(value) || value < (key === "show" ? 1 : 0)) {
      console.error(`${flag} needs a whole number`);
      return null;
    }
    parsed[key] = value;
  }
  if (parsed.changes > 0 && parsed.level === undefined) {
    console.error(`--changes needs --level\n\n${HELP}`);
    return null;
  }
  return parsed;
}

/** Solutions counted by shots, e.g. "par 3: 1 · 4: 2". */
function countsByShots(
  solutions: ReturnType<typeof alternativeSolutions>,
  par: number,
  extra: number,
): string {
  return Array.from({ length: extra + 1 }, (_, i) => {
    const shots = par + i;
    const n = solutions.filter((moves) => shotCount(moves) === shots).length;
    return `${i === 0 ? "par " : ""}${shots}: ${n}`;
  }).join(" · ");
}

function describeChange(change: AlternativeChange): string {
  const cells = change.changes
    .map(({ cell, ...at }) => `${CELL_SYMBOLS[cell]} at ${cellName(at)}`)
    .join(", ");
  const n = change.added.length;
  return (
    `${cells} · ${n} new (${change.addedAtPar} at par) · ` +
    `random play ${oneIn(change.randomWinChance)} · e.g. ` +
    change.added.slice(0, 3).map(rowList).join(" | ")
  );
}

function summary(extra: number) {
  console.log(
    `Different solutions per level, by shots (par to par + ${extra}):`,
  );
  LEVELS.forEach((level, i) => {
    const board = withBonuses(parseLevel(level.grid));
    const solutions = alternativeSolutions(
      board,
      level.minShots + extra,
      level.goalHits ?? 1,
      level.playerMirror,
    );
    console.log(
      `  ${String(i + 1).padStart(2)} ${level.name.padEnd(20)} ` +
        countsByShots(solutions, level.minShots, extra),
    );
  });
}

function levelReport(index: number, args: Args) {
  const level = LEVELS[index];
  const goalHits = level.goalHits ?? 1;
  const { minShots, playerMirror } = level;
  const levelBoard = parseLevel(level.grid);
  const board = withBonuses(levelBoard);
  const solutions = alternativeSolutions(
    board,
    minShots + args.extra,
    goalHits,
    playerMirror,
  );
  console.log(
    `Level ${index + 1}: ${level.name}, par ${minShots}, ` +
      `random play ${oneIn(randomWinChance(board, minShots, goalHits, playerMirror))}`,
  );
  console.log(
    `  Solutions (${countsByShots(solutions, minShots, args.extra)}):`,
  );
  for (const moves of solutions.slice(0, args.show)) {
    console.log(`    ${rowList(moves)} (${shotCount(moves)})`);
  }
  if (args.changes === 0) {
    return;
  }

  const changes = findAlternativeChanges(levelBoard, {
    minShots,
    goalHits,
    bonusShots: level.bonusShots,
    playerMirror,
    extraShots: args.extra,
    changes: args.changes,
  });
  console.log(
    `Board changes (up to ${args.changes}) adding solutions within ` +
      `${minShots + args.extra} shots:`,
  );
  changes.slice(0, args.show).forEach((change, i) => {
    console.log(`  ${i + 1}. ${describeChange(change)}`);
  });
  if (changes.length === 0) {
    console.log("  None found: try --changes 2 or --extra 2.");
  } else {
    console.log(`${changes.length} changes found. The first one:`);
    console.log("    grid: String.raw`");
    console.log(formatLevel(changes[0].board, "      "));
    console.log("    `,");
  }
}

const args = parseArgs(process.argv.slice(2));
if (args === null) {
  process.exitCode = 1;
} else if (args.level === undefined) {
  summary(args.extra);
} else {
  const index = LEVELS.findIndex(
    (level, i) => level.id === args.level || String(i + 1) === args.level,
  );
  if (index < 0) {
    console.error(`No level ${args.level}`);
    process.exitCode = 1;
  } else {
    levelReport(index, args);
  }
}
