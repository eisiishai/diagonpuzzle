// Level design report: `npm run levels`. For each level, prints the shortest
// solution, an alternative solution above par, two-shot setup routes, the shortest way to hit the bonus target,
// how likely random play is to finish within par (a rough difficulty
// measure) and what each row's first shot does (bonus targets hidden, as
// before par). Ends with the difficulty of every level in a row.
// Rows are numbered from 1 at the top, as the player counts them.

import { CELL_SYMBOLS } from "../src/levels/parse";
import { oneIn } from "./difficulty";
import {
  analyzeLevels,
  rowList,
  SEARCH_EXTRA_SHOTS,
  shotCount,
} from "./levelAnalysis";

const analyses = analyzeLevels();
for (const analysis of analyses) {
  const { number, level, board, solution, setupRoutes, firstShots } = analysis;
  const status = analysis.minShotsConfirmed
    ? "✓"
    : `✗ declared minShots ${level.minShots}`;
  const shortest = solution
    ? `${rowList(solution)} (${shotCount(solution)} shot${shotCount(solution) === 1 ? "" : "s"})`
    : "none found";
  const routes =
    setupRoutes.length > 0 ? setupRoutes.map(rowList).join(", ") : "none";
  const first = firstShots
    .map(
      (outcome, row) => `${row + 1} ${outcome === "goal" ? "GOAL" : outcome}`,
    )
    .join(" · ");

  console.log(
    `Level ${number}: ${level.name} (${level.id}), ${board.width}×${board.height}` +
      ((level.goalHits ?? 1) > 1 ? `, goal needs ${level.goalHits} hits` : "") +
      (level.playerMirror
        ? `, player mirror ${CELL_SYMBOLS[level.playerMirror]}`
        : ""),
  );
  const { shortestCount } = analysis;
  console.log(
    `  Shortest:     ${shortest}  ${status}` +
      (shortestCount > 1 ? `  (${shortestCount} shortest solutions)` : ""),
  );
  const { alternative } = analysis;
  console.log(
    `  Alternative:  ${alternative ? `${rowList(alternative)} (${shotCount(alternative)})` : `none within par + ${SEARCH_EXTRA_SHOTS}  ✗`}`,
  );
  console.log(`  Setup routes: ${routes}`);
  const { bonusSolution } = analysis;
  if (bonusSolution !== undefined) {
    const bonusStatus = analysis.bonusShotsConfirmed
      ? "✓"
      : `✗ declared bonusShots ${level.bonusShots}`;
    console.log(
      `  Bonus:        ${bonusSolution ? `${rowList(bonusSolution)} (${shotCount(bonusSolution)})` : "none found"}  ${bonusStatus}`,
    );
  }
  console.log(
    `  Difficulty:   random play wins at par ${oneIn(analysis.randomWinChance)}`,
  );
  console.log(`  First shots:  ${first}`);
  console.log();
}

// The difficulty curve: random play's chance of finishing within par.
console.log("Difficulty curve (random play wins at par, 1 in N):");
for (const { number, level, randomWinChance } of analyses) {
  const odds = oneIn(randomWinChance).replace("1 in ", "");
  console.log(
    `  ${String(number).padStart(2)} ${level.name.padEnd(20)} par ${level.minShots}  ${odds.padStart(8)}`,
  );
}
