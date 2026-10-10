// Level design report: `npm run levels`. For each level, prints the shortest
// solution, two-shot setup routes, the shortest way to hit the bonus target
// and what each row's first shot does (bonus targets hidden, as before par).
// Rows are numbered from 1 at the top, as the player counts them.

import { CELL_SYMBOLS } from "../src/levels/parse";
import { analyzeLevels, rowList, shotCount } from "./levelAnalysis";

for (const analysis of analyzeLevels()) {
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
  console.log(`  First shots:  ${first}`);
  console.log();
}
