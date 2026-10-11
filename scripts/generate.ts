// Level generator: `npm run generate -- [options]`. Searches random boards
// for new levels with a given par and prints the best ones, ready to paste
// into src/levels/levels.ts. Rows are numbered from 1 at the top, as the
// player counts them. Run `npm run generate -- --help` for the options.

import { playMoves } from "../src/game/solver";
import type { MirrorType } from "../src/game/types";
import { CELL_SYMBOLS, formatLevel } from "../src/levels/parse";
import { cellName, describeShot, rowList, shotCount } from "./levelAnalysis";
import { findCandidates, withAlternatives } from "./levelGenerator";
import type { GeneratorOptions } from "./levelGenerator";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

const DEFAULTS: GeneratorOptions & { show: number; alternatives: number } = {
  width: 6,
  height: 5,
  mirrors: 6,
  walls: 2,
  breakable: 0,
  playerMirror: undefined,
  placeLater: false,
  shots: 2,
  goalHits: 1,
  tries: 20000,
  seed: 1,
  requireSetup: false,
  noRepeat: false,
  show: 4,
  alternatives: 2,
};

const HELP = `Usage: npm run generate -- [options]

  --width N         board width (default ${DEFAULTS.width})
  --height N        board height (default ${DEFAULTS.height})
  --mirrors N       mirrors (default ${DEFAULTS.mirrors})
  --walls N         walls (default ${DEFAULTS.walls})
  --breakable N     breakable walls; boards must need one broken for par
                    (default ${DEFAULTS.breakable})
  --player-mirror M the player may place one mirror M (slash or backslash)
                    on any empty cell; boards must need it for par
  --place-later     no shortest solution places the mirror before the first shot
  --shots N         par: fewest shots that complete the level (default ${DEFAULTS.shots})
  --goal-hits N     goal hits needed (default ${DEFAULTS.goalHits})
  --tries N         random boards to try (default ${DEFAULTS.tries})
  --seed N          random seed; try others for different boards (default ${DEFAULTS.seed})
  --show N          best boards to print (default ${DEFAULTS.show})
  --require-setup   only boards that also have a two-shot setup route
  --no-repeat       no shortest solution fires the same row twice in a row
  --alternatives N  only boards with an alternative solution within par + N
                    shots, so a player who strays from par can still
                    finish (default ${DEFAULTS.alternatives}; 0 keeps every board)

Example: npm run generate -- --width 7 --height 6 --mirrors 8 --shots 3`;

const PLAYER_MIRRORS: Partial<Record<string, MirrorType>> = {
  slash: "mirrorSlash",
  "/": "mirrorSlash",
  backslash: "mirrorBackslash",
  "\\": "mirrorBackslash",
};

const FLAGS: Record<string, keyof typeof DEFAULTS> = {
  "--player-mirror": "playerMirror",
  "--width": "width",
  "--height": "height",
  "--mirrors": "mirrors",
  "--walls": "walls",
  "--breakable": "breakable",
  "--place-later": "placeLater",
  "--shots": "shots",
  "--goal-hits": "goalHits",
  "--tries": "tries",
  "--seed": "seed",
  "--show": "show",
  "--require-setup": "requireSetup",
  "--no-repeat": "noRepeat",
  "--alternatives": "alternatives",
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
    if (args[i] === "--player-mirror") {
      const mirror = PLAYER_MIRRORS[args[++i]];
      if (mirror === undefined) {
        console.error("--player-mirror needs slash or backslash");
        return null;
      }
      options.playerMirror = mirror;
      continue;
    }
    if (typeof DEFAULTS[key] === "boolean") {
      Object.assign(options, { [key]: true });
      continue;
    }
    const value = Number(args[++i]);
    if (
      !Number.isInteger(value) ||
      value < (key === "walls" || key === "alternatives" ? 0 : 1)
    ) {
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
  const shown =
    options.alternatives > 0
      ? withAlternatives(
          candidates,
          options,
          options.alternatives,
          options.show,
        )
      : candidates.slice(0, options.show);
  shown.forEach((candidate, index) => {
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
    if (options.playerMirror) {
      console.log(`    playerMirror: "${options.playerMirror}",`);
    }

    const { shots } = playMoves(board, solutions[0]);
    let shot = 0;
    for (const move of solutions[0]) {
      if (typeof move === "number") {
        console.log(`  row ${move + 1}: ${describeShot(shots[shot++])}`);
      } else {
        console.log(
          `  place the ${CELL_SYMBOLS[move.mirror]} mirror at ${cellName(move)}`,
        );
      }
    }
    if (solutions.length > 1) {
      console.log(`  all: ${solutions.map(rowList).join(", ")}`);
    }
    if (candidate.alternative) {
      const { alternative } = candidate;
      console.log(
        `  alternative: ${rowList(alternative)} (${shotCount(alternative)} shots)`,
      );
    }
    console.log();
  });
  console.log(
    `${candidates.length} different boards with par ${options.shots} found in ${options.tries} tries.`,
  );
  if (options.alternatives > 0 && shown.length < options.show) {
    console.log(
      `Only ${shown.length} with an alternative solution within par + ${options.alternatives}: ` +
        "try more --tries, a higher --alternatives, or --alternatives 0.",
    );
  }
}
