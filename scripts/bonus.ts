// Bonus target placement: `npm run bonus -- --level N [options]`. Lists
// cells where the level's bonus target takes the wanted number of shots,
// optionally after small board changes that keep par, and prints the best
// board ready to paste into src/levels/levels.ts. Rows and columns are
// numbered from 1, as the player counts them. `--help` lists the options.

import type { CellType } from "../src/game/types";
import { LEVELS } from "../src/levels/levels";
import { CELL_SYMBOLS, formatLevel, parseLevel } from "../src/levels/parse";
import { findPlacements } from "./bonusPlacement";
import type { Placement } from "./bonusPlacement";
import { cellName, rowList } from "./levelAnalysis";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

/** Piece names for --uses, and the cell types they stand for. */
const PIECES: Record<string, CellType[]> = {
  mirror: ["mirrorBackslash", "mirrorSlash"],
  glass: ["glassBackslash", "glassSlash"],
  reflector: ["reflector"],
  breakable: ["breakable"],
};

const HELP = `Usage: npm run bonus -- --level N [options]

  --level N|ID      the level, by number (from 1) or id
  --shots N         shots the bonus target should take (default: the
                    level's bonusShots, else par + 1)
  --changes N       board cells that may change first, 0-2 (default 0);
                    2 can take minutes on a big board
  --show N          placements to list (default 20)
  --uses P[,P...]   only routes that pass through one of these pieces:
                    ${Object.keys(PIECES).join(", ")} (glass counts the gap
                    a shattered one leaves too)

Changes never touch a cell the par solution reaches, so it plays out
exactly as before.

Example: npm run bonus -- --level 13 --shots 4 --changes 1
         npm run bonus -- --level 25 --changes 1 --uses reflector,glass`;

interface Args {
  level: string;
  shots?: number;
  changes: number;
  show: number;
  uses?: CellType[];
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
    if (flag === "--uses") {
      const names = (args[++i] ?? "").split(",");
      const unknown = names.find((name) => PIECES[name] === undefined);
      if (unknown !== undefined) {
        console.error(
          `Unknown piece "${unknown}"; use ${Object.keys(PIECES).join(", ")}`,
        );
        return null;
      }
      parsed.uses = names.flatMap((name) => PIECES[name]);
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

const at = cellName;

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
    playerMirror: level.playerMirror,
    bonusShots,
    changes: args.changes,
    uses: args.uses,
  });

  console.log(
    `Level ${index + 1}: ${level.name}, par ${level.minShots}, ` +
      `bonus target in ${bonusShots} shots, up to ${args.changes} board change(s)`,
  );
  placements.slice(0, args.show).forEach((placement, i) => {
    console.log(`  ${i + 1}. ${describe(placement)}`);
  });
  if (placements.length === 0) {
    console.log(
      "  None found: try --changes 1, another --shots or fewer --uses.",
    );
  } else {
    console.log(`${placements.length} placements found. The first one:`);
    console.log("    grid: String.raw`");
    console.log(formatLevel(placements[0].board, "      "));
    console.log("    `,");
  }
}
