// Level design report: `npm run levels`. For each level, prints the shortest
// solution, two-shot setup routes and what each row's first shot does.
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
    `Level ${number}: ${level.name} (${level.id}), ${board.width}×${board.height}`,
  );
  console.log(`  Shortest:     ${shortest}  ${status}`);
  console.log(`  Setup routes: ${routes}`);
  console.log(`  First shots:  ${first}`);
  console.log();
}
