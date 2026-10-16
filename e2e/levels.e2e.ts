import { placeMirror } from "../src/game/placement";
import { fire } from "../src/game/simulate";
import { LEVELS } from "../src/levels/levels";
import { CI } from "./ci";
import { expect, solution, startBoard, test } from "./game";

// Every level played by its shortest solution, as on a first visit. This
// runs the drawing and effects of every block type and shot outcome, which
// unit tests don't reach. After every move the board on screen must match
// the rules, worked out here with the game's own simulation: both the
// level's state and the cells as drawn (a mirror by its rotation).

// The longest levels take most of the default 30 s with 4 browsers drawing
// in software at once, and longer on GitHub's 4 cores.
test.describe.configure({ timeout: CI ? 180_000 : 60_000 });

LEVELS.forEach((level, index) => {
  const number = index + 1;
  test(`level ${number}, ${level.name}`, async ({ game }) => {
    await game.seedCompleted(index);
    await game.open();
    await game.press(`${number}. `);
    await game.waitForLevel(number);

    let board = startBoard(index);
    await game.expectBoard(board, "at the start");
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
      await game.expectBoard(board, description);
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
