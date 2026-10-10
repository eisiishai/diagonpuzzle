// Bonus target placement: `npm run bonus -- --level N [options]`. Lists
// cells where the level's bonus target takes the wanted number of shots,
// optionally after small board changes that keep par, and prints the best
// board ready to paste into src/levels/levels.ts. Rows and columns are
// numbered from 1, as the player counts them. `--help` lists the options.

import { LEVELS } from "../src/levels/levels";
import { CELL_SYMBOLS, formatLevel, parseLevel } from "../src/levels/parse";
import { findPlacements } from "./bonusPlacement";
import type { Placement } from "./bonusPlacement";
import { rowList } from "./levelAnalysis";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

const HELP = `Usage: npm run bonus -- --level N [options]

  --level N|ID      the level, by number (from 1) or id
  --shots N         shots the bonus target should take (default: the
                    level's bonusShots, else par + 1)
  --changes N       board cells that may change first, 0-2 (default 0);
                    2 can take minutes on a big board
  --show N          placements to list (default 20)

Example: npm run bonus -- --level 13 --shots 4 --changes 1`;

interface Args {
  level: string;
  shots?: number;
  changes: number;
  show: number;
}

const NUMBER_FLAGS: Record<string, "shots" | "changes" | "show"> = {
  "--shots": "shots",
  "--changes": "changes",
  "--show": "show",
};

function parseArgs(args: string[]): Args | null {
  const parsed: Partial<Args> = { changes: 0, show: 20 };
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
    if (!Number.isInteger(value) || value < (key === "changes" ? 0 : 1)) {
      console.error(`${flag} needs a whole number`);
      return null;
    }
    parsed[key] = value;
  }
  if (parsed.level === undefined) {
    console.error(`--level is required\n\n${HELP}`);
    return null;
  }
  return parsed as Args;
}

/** A position as the player counts it: (column, row) from 1. */
const at = ({ x, y }: { x: number; y: number }) => `(${x + 1},${y + 1})`;

function describe(placement: Placement): string {
  const changes =
    placement.changes.length === 0
      ? "no board changes"
      : placement.changes
          .map((change) => `${CELL_SYMBOLS[change.cell]} at ${at(change)}`)
          .join(", ");
  const n = placement.routes;
  return (
    `bonus at ${at(placement.bonus)} · ${n} route${n === 1 ? "" : "s"}` +
    ` · e.g. ${rowList(placement.route)} · ${changes}`
  );
}

const args = parseArgs(process.argv.slice(2));
const index = args
  ? LEVELS.findIndex(
      (level, i) => level.id === args.level || String(i + 1) === args.level,
    )
  : -1;
if (args === null) {
  process.exitCode = 1;
} else if (index < 0) {
  console.error(`No level ${args.level}`);
  process.exitCode = 1;
} else {
  const level = LEVELS[index];
  const bonusShots = args.shots ?? level.bonusShots ?? level.minShots + 1;
  const placements = findPlacements(parseLevel(level.grid), {
    minShots: level.minShots,
    goalHits: level.goalHits ?? 1,
    bonusShots,
    changes: args.changes,
  });

  console.log(
    `Level ${index + 1}: ${level.name}, par ${level.minShots}, ` +
      `bonus target in ${bonusShots} shots, up to ${args.changes} board change(s)`,
  );
  placements.slice(0, args.show).forEach((placement, i) => {
    console.log(`  ${i + 1}. ${describe(placement)}`);
  });
  if (placements.length === 0) {
    console.log("  None found: try --changes 1 or another --shots.");
  } else {
    console.log(`${placements.length} placements found. The first one:`);
    console.log("    grid: String.raw`");
    console.log(formatLevel(placements[0].board, "      "));
    console.log("    `,");
  }
}
