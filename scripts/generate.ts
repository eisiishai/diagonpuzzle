// Level generator: `npm run generate -- [options]`. Searches random boards
// for new levels with a given par and prints the best ones, ready to paste
// into src/levels/levels.ts. Rows are numbered from 1 at the top, as the
// player counts them. Run `npm run generate -- --help` for the options.

import { fire } from "../src/game/simulate";
import { formatLevel } from "../src/levels/parse";
import { rowList } from "./levelAnalysis";
import { findCandidates } from "./levelGenerator";
import type { GeneratorOptions } from "./levelGenerator";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

const DEFAULTS: GeneratorOptions & { show: number } = {
  width: 6,
  height: 5,
  mirrors: 6,
  walls: 2,
  shots: 2,
  goalHits: 1,
  tries: 20000,
  seed: 1,
  requireSetup: false,
  noRepeat: false,
  show: 4,
};

const HELP = `Usage: npm run generate -- [options]

  --width N         board width (default ${DEFAULTS.width})
  --height N        board height (default ${DEFAULTS.height})
  --mirrors N       mirrors (default ${DEFAULTS.mirrors})
  --walls N         walls (default ${DEFAULTS.walls})
  --shots N         par: fewest shots that complete the level (default ${DEFAULTS.shots})
  --goal-hits N     goal hits needed (default ${DEFAULTS.goalHits})
  --tries N         random boards to try (default ${DEFAULTS.tries})
  --seed N          random seed; try others for different boards (default ${DEFAULTS.seed})
  --show N          best boards to print (default ${DEFAULTS.show})
  --require-setup   only boards that also have a two-shot setup route
  --no-repeat       no shortest solution fires the same row twice in a row

Example: npm run generate -- --width 7 --height 6 --mirrors 8 --shots 3`;

const FLAGS: Record<string, keyof typeof DEFAULTS> = {
  "--width": "width",
  "--height": "height",
  "--mirrors": "mirrors",
  "--walls": "walls",
  "--shots": "shots",
  "--goal-hits": "goalHits",
  "--tries": "tries",
  "--seed": "seed",
  "--show": "show",
  "--require-setup": "requireSetup",
  "--no-repeat": "noRepeat",
};

function parseArgs(args: string[]): typeof DEFAULTS | null {
  const options = { ...DEFAULTS };
  for (let i = 0; i < args.length; i++) {
    const key = FLAGS[args[i]];
    if (key === undefined) {
      console.error(
        args[i] === "--help" ? HELP : `Unknown option ${args[i]}\n\n${HELP}`,
      );
      return null;
    }
    if (typeof DEFAULTS[key] === "boolean") {
      Object.assign(options, { [key]: true });
      continue;
    }
    const value = Number(args[++i]);
    if (!Number.isInteger(value) || value < (key === "walls" ? 0 : 1)) {
      console.error(`${args[i - 1]} needs a whole number`);
      return null;
    }
    Object.assign(options, { [key]: value });
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (options === null) {
  process.exitCode = 1;
} else {
  const candidates = findCandidates(options);
  candidates.slice(0, options.show).forEach((candidate, index) => {
    const { board, solutions } = candidate;
    console.log(
      `Board ${index + 1}: ${solutions.length === 1 ? "unique shortest solution" : `${solutions.length} shortest solutions`}` +
        ` · ${candidate.rowsHittingAtStart} row(s) hit the goal at once` +
        (candidate.setupRoutes.length > 0
          ? ` · setup routes ${candidate.setupRoutes.map(rowList).join(", ")}`
          : ""),
    );
    console.log("    grid: String.raw`");
    console.log(formatLevel(board, "      "));
    console.log("    `,");

    let current = board;
    for (const row of solutions[0]) {
      const result = fire(current, row);
      const flips = result.path.filter((step) => step.becomes).length;
      console.log(
        `  row ${row + 1}: ${result.outcome}, flips ${flips} mirror${flips === 1 ? "" : "s"}`,
      );
      current = result.board;
    }
    if (solutions.length > 1) {
      console.log(`  all: ${solutions.map(rowList).join(", ")}`);
    }
    console.log();
  });
  console.log(
    `${candidates.length} different boards with par ${options.shots} found in ${options.tries} tries.`,
  );
}
