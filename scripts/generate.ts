// Level generator: `npm run generate -- [options]`. Searches random boards
// for new levels with a given par and prints the best ones, ready to paste
// into src/levels/levels.ts. Rows are numbered from 1 at the top, as the
// player counts them. Run `npm run generate -- --help` for the options.

import { playMoves } from "../src/game/solver";
import type { MirrorType } from "../src/game/types";
import { CELL_SYMBOLS, formatLevel } from "../src/levels/parse";
import { cellName, describeShot, rowList, shotCount } from "./levelAnalysis";
import { withBonusNeeding } from "./bonusPlacement";
import { findCandidates, withAlternatives } from "./levelGenerator";
import type { GeneratorOptions } from "./levelGenerator";
import type { Piece } from "./pieces";

// Node's process, without depending on @types/node.
declare const process: { argv: string[]; exitCode?: number };

/** Piece names for --bonus-needs. */
const NEEDS: Record<string, Piece> = {
  breakable: "breakable",
  reflector: "reflector",
  glass: "glass",
  fixed: "fixed",
  portal: "portal",
  "player-mirror": "playerMirror",
};

const DEFAULTS: GeneratorOptions & {
  show: number;
  alternatives: number;
  bonusNeeds: Piece[];
} = {
  width: 6,
  height: 5,
  mirrors: 6,
  walls: 2,
  breakable: 0,
  reflectors: 0,
  glass: 0,
  fixed: 0,
  portals: false,
  playerMirror: undefined,
  placeLater: false,
  shots: 2,
  goalHits: 1,
  tries: 20000,
  seed: 1,
  requireSetup: false,
  noRepeat: false,
  portalGap: 2,
  variedRows: false,
  returnTrip: false,
  show: 4,
  alternatives: 2,
  bonusNeeds: [],
};

const HELP = `Usage: npm run generate -- [options]

  --width N         board width (default ${DEFAULTS.width})
  --height N        board height (default ${DEFAULTS.height})
  --mirrors N       mirrors (default ${DEFAULTS.mirrors})
  --walls N         walls (default ${DEFAULTS.walls})
  --breakable N     breakable walls; boards must need one broken for par
                    (default ${DEFAULTS.breakable})
  --reflectors N    reflectors; boards must need one for par
                    (default ${DEFAULTS.reflectors})
  --glass N         glass mirrors; boards must need one shattered for par
                    (default ${DEFAULTS.glass})
  --fixed N         fixed mirrors; boards must need one to stay fixed (not
                    flip) for par (default ${DEFAULTS.fixed})
  --portals         a pair of portals; boards must need them for par
  --portal-gap N    the portals at least N cells apart, a diagonal step
                    counting as one (default ${DEFAULTS.portalGap}; 1 lets them touch)
  --return-trip     a shot of the shortest solution goes through the
                    portals, off a reflector and back through them
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
  --varied-rows     no shortest solution fires one row only
  --alternatives N  only boards with an alternative solution within par + N
                    shots, so a player who strays from par can still
                    finish (default ${DEFAULTS.alternatives}; 0 keeps every board)
  --bonus-needs P[,P...]
                    only boards with a bonus target, par + 1 or par + 2
                    shots away, out of reach without each of these
                    pieces: ${Object.keys(NEEDS).join(", ")} (slower)

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
  "--reflectors": "reflectors",
  "--glass": "glass",
  "--fixed": "fixed",
  "--portals": "portals",
  "--place-later": "placeLater",
  "--shots": "shots",
  "--goal-hits": "goalHits",
  "--tries": "tries",
  "--seed": "seed",
  "--show": "show",
  "--require-setup": "requireSetup",
  "--no-repeat": "noRepeat",
  "--portal-gap": "portalGap",
  "--varied-rows": "variedRows",
  "--return-trip": "returnTrip",
  "--alternatives": "alternatives",
  "--bonus-needs": "bonusNeeds",
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
    if (args[i] === "--bonus-needs") {
      const names = (args[++i] ?? "").split(",");
      const unknown = names.find((name) => NEEDS[name] === undefined);
      if (unknown !== undefined) {
        console.error(
          `Unknown piece "${unknown}"; use ${Object.keys(NEEDS).join(", ")}`,
        );
        return null;
      }
      options.bonusNeeds = names.map((name) => NEEDS[name]);
      continue;
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
      value <
        (key === "walls" || key === "alternatives" || key === "portalGap"
          ? 0
          : 1)
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
  const pool =
    options.bonusNeeds.length > 0
      ? withBonusNeeding(candidates, options, options.bonusNeeds)
      : candidates;
  const shown =
    options.alternatives > 0
      ? withAlternatives(pool, options, options.alternatives, options.show)
      : pool.slice(0, options.show);
  shown.forEach((candidate, index) => {
    const { board, solutions } = candidate;
    console.log(
      `Board ${index + 1}: ${solutions.length === 1 ? "unique shortest solution" : `${solutions.length} shortest solutions`}` +
        ` · ${candidate.rowsHittingAtStart} row(s) hit the goal at once` +
        (candidate.setupRoutes.length > 0
          ? ` · setup routes ${candidate.setupRoutes.map(rowList).join(", ")}`
          : ""),
    );
    if (candidate.bonus) {
      console.log(`    bonusShots: ${candidate.bonus.shots},`);
    }
    console.log("    grid: String.raw`");
    console.log(formatLevel(candidate.bonus?.board ?? board, "      "));
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
    if (candidate.bonus) {
      const { bonus } = candidate;
      console.log(
        `  bonus target at ${cellName(bonus.bonus)}: ${rowList(bonus.route)} (${bonus.shots} shots)`,
      );
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
  if (options.bonusNeeds.length > 0) {
    console.log(
      `${pool.length} of them with a bonus target needing ${options.bonusNeeds.join(", ")}.`,
    );
  }
  if (options.alternatives > 0 && shown.length < options.show) {
    console.log(
      `Only ${shown.length} with an alternative solution within par + ${options.alternatives}: ` +
        "try more --tries, a higher --alternatives, or --alternatives 0.",
    );
  }
}
