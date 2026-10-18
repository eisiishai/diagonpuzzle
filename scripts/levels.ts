// Level design report: `npm run levels`. For each level, prints the shortest
// solution, its text hint and the second hint's first shot (to check
// them against the solution), an alternative solution above par, two-shot
// setup routes, the shortest way to hit the bonus target,
// two rough difficulty measures (how likely random play is to finish
// within par, and the foresight the shortest solution needs) and what each
// row's first shot does (bonus targets hidden, as before par). Ends with
// the difficulty of every level in a row, by chapter, with the pieces each
// level is built from.
// Rows are numbered from 1 at the top, as the player counts them.

import { firstShotHint } from "../src/game/hints";
import { CHAPTERS, LEVELS, chapterRanges } from "../src/levels/levels";
import { CELL_SYMBOLS } from "../src/levels/parse";
import { oneIn } from "./difficulty";
import {
  analyzeLevels,
  pieceList,
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
  console.log(`  Hint:         ${level.hint}`);
  // The second hint, as the game works it out from the starting board.
  const second = firstShotHint(board, level.minShots, {
    goalHits: level.goalHits,
    playerMirror: level.playerMirror,
  });
  console.log(
    `  Hint 2:       ${second ? `${second.placeFirst ? "place the mirror, then " : ""}row ${second.row + 1} first` : "none found  ✗"}`,
  );
  const { alternative } = analysis;
  console.log(
    `  Alternative:  ${alternative ? `${rowList(alternative)} (${shotCount(alternative)})` : `none within par + ${SEARCH_EXTRA_SHOTS}  ✗`}`,
  );
  console.log(`  Pieces:       ${pieceList(board, level)}`);
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
    `  Difficulty:   random play wins at par ${oneIn(analysis.randomWinChance)}` +
      `, foresight ${analysis.foresight ?? "-"}`,
  );
  console.log(`  First shots:  ${first}`);
  console.log();
}

// The difficulty curve: random play's chance of finishing within par, the
// foresight the shortest solution needs, and the pieces, by chapter.
console.log(
  "Difficulty curve (random play wins at par, 1 in N; foresight; pieces):",
);
for (const { name, start, end } of chapterRanges(LEVELS, CHAPTERS)) {
  console.log(`  ${name}`);
  for (const analysis of analyses.slice(start, end)) {
    const { number, level, board, randomWinChance, foresight } = analysis;
    const odds = oneIn(randomWinChance).replace("1 in ", "");
    console.log(
      `  ${String(number).padStart(2)} ${level.name.padEnd(20)} par ${level.minShots}  ${odds.padStart(8)}  ${String(foresight ?? "-").padStart(2)}  ${pieceList(board, level)}`,
    );
  }
}
