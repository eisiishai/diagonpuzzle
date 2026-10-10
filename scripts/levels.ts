// Level design report: `npm run levels`. For each level, prints the shortest
// solution, two-shot setup routes and what each row's first shot does.
// Rows are numbered from 1 at the top, as the player counts them.

import { fire } from "../src/game/simulate";
import { setupRoutes, solve } from "../src/game/solver";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";

/** Search a little beyond the declared minimum to report harder levels too. */
const SEARCH_EXTRA_SHOTS = 2;

const rowList = (rows: number[]) => rows.map((row) => row + 1).join(" → ");

LEVELS.forEach((level, index) => {
  const board = parseLevel(level.grid);
  const solution = solve(board, level.minShots + SEARCH_EXTRA_SHOTS);
  const routes = setupRoutes(board);
  const firstShots = Array.from({ length: board.height }, (_, row) => {
    const outcome = fire(board, row).outcome;
    return `${row + 1} ${outcome === "goal" ? "GOAL" : outcome}`;
  });

  const status =
    solution?.length === level.minShots
      ? "✓"
      : `✗ declared minShots ${level.minShots}`;

  console.log(
    `Level ${index + 1}: ${level.name} (${level.id}), ${board.width}×${board.height}`,
  );
  console.log(
    `  Shortest:     ${solution ? `${rowList(solution)} (${solution.length} shot${solution.length === 1 ? "" : "s"})` : "none found"}  ${status}`,
  );
  console.log(
    `  Setup routes: ${routes.length > 0 ? routes.map(rowList).join(", ") : "none"}`,
  );
  console.log(`  First shots:  ${firstShots.join(" · ")}`);
  console.log();
});
