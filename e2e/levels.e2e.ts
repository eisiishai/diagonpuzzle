import { placeMirror } from "../src/game/placement";
import { fire } from "../src/game/simulate";
import type { Board } from "../src/game/types";
import { LEVELS } from "../src/levels/levels";
import { expect, solution, startBoard, test } from "./game";
import type { Game } from "./game";

// Every level played by its shortest solution, as on a first visit. This
// runs the drawing and effects of every block type and shot outcome, which
// unit tests don't reach. After every move the board on screen must match
// the rules, worked out here with the game's own simulation: both the
// level's state and the cells as drawn (a mirror by its rotation).

/** Waits until the level's board, by the rules and as drawn, is `board`. */
async function expectBoard(game: Game, board: Board, after: string) {
  await expect
    .poll(
      async () => {
        const level = await game.level();
        return {
          rules: level.cells.map((row) => row.map((cell) => cell.type)),
          shown: level.shown,
        };
      },
      { message: `the board ${after}` },
    )
    .toEqual({ rules: board.cells, shown: board.cells });
}

// The longest levels take most of the default 30 s with 4 browsers drawing
// in software at once.
test.describe.configure({ timeout: 60_000 });

LEVELS.forEach((level, index) => {
  const number = index + 1;
  test(`level ${number}, ${level.name}`, async ({ game }) => {
    await game.seedCompleted(index);
    await game.open();
    await game.press(`${number}. `);
    await game.waitForLevel(number);

    let board = startBoard(index);
    await expectBoard(game, board, "at the start");
    for (const [step, move] of solution(index).entries()) {
      const description =
        typeof move === "number"
          ? `after move ${step + 1}, row ${move}`
          : `after move ${step + 1}, the mirror at (${move.x},${move.y})`;
      if (typeof move === "number") {
        await game.fire(move, "mouse");
        board = fire(board, move).board;
      } else {
        await game.placeMirror(move, "mouse");
        board = placeMirror(board, move, move.mirror);
      }
      await expectBoard(game, board, description);
    }

    const { phase, shots, hits, goalHits } = await game.level();
    expect({ phase, shots, hits }).toEqual({
      phase: "complete",
      shots: level.minShots,
      hits: goalHits,
    });
    const isLast = number === LEVELS.length;
    await game.press(isLast ? "BACK TO TITLE" : "NEXT LEVEL");
    if (isLast) {
      await game.waitForScene("title");
    } else {
      await game.waitForLevel(number + 1);
    }
  });
});
