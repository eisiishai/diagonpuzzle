// Level design report: `npm run levels`. For each level, prints the shortest
// solution, two-shot setup routes, the shortest way to hit the bonus target
// and what each row's first shot does (bonus targets hidden, as before par).
// Rows are numbered from 1 at the top, as the player counts them.

import { analyzeLevels, rowList } from "./levelAnalysis";

for (const analysis of analyzeLevels()) {
  const { number, level, board, solution, setupRoutes, firstShots } = analysis;
  const status = analysis.minShotsConfirmed
    ? "✓"
    : `✗ declared minShots ${level.minShots}`;
  const shortest = solution
    ? `${rowList(solution)} (${solution.length} shot${solution.length === 1 ? "" : "s"})`
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
      ((level.goalHits ?? 1) > 1 ? `, goal needs ${level.goalHits} hits` : ""),
  );
  console.log(`  Shortest:     ${shortest}  ${status}`);
  console.log(`  Setup routes: ${routes}`);
  const { bonusSolution } = analysis;
  if (bonusSolution !== undefined) {
    const bonusStatus = analysis.bonusShotsConfirmed
      ? "✓"
      : `✗ declared bonusShots ${level.bonusShots}`;
    console.log(
      `  Bonus:        ${bonusSolution ? `${rowList(bonusSolution)} (${bonusSolution.length})` : "none found"}  ${bonusStatus}`,
    );
  }
  console.log(`  First shots:  ${first}`);
  console.log();
}
