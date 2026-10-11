import { bonusPositions } from "../src/game/bonus";
import { playMoves } from "../src/game/solver";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import { atPar, bonusRoute, expect, solution, startBoard, test } from "./game";

// The other smoke tests run with reduced motion, which leaves out the
// title's beam, scene transitions, the board's intro, ambient motion, the
// sparks, glints and shake of shots and the finale's wave. These play with
// motion on, so that code runs too and an error in it fails a test.

test.use({ reducedMotion: "no-preference" });
// Animations make shots and screen changes take longer.
test.describe.configure({ timeout: 60_000 });

const FIRST = 0;
const BREAKTHROUGH = 10; // mirrors to flip and a wall to break

test("a level with mirrors and a breakable wall, from the title and back", async ({
  game,
}) => {
  await game.seedCompleted(BREAKTHROUGH);
  await game.open();
  await game.press(`${BREAKTHROUGH + 1}. `);
  await game.waitForLevel(BREAKTHROUGH + 1);
  const moves = solution(BREAKTHROUGH);
  await game.play(moves, "mouse");
  expect((await game.level()).phase).toBe("complete");
  // Mirrors turn as they flip; once settled, the board is drawn as played.
  const { board } = playMoves(startBoard(BREAKTHROUGH), moves);
  await game.expectBoard(board, "after the solution");
  await game.press("MENU");
  await game.waitForScene("title");
  await game.button(`CONTINUE: LEVEL ${BREAKTHROUGH + 2}`);
});

test("the last bonus target plays the finale", async ({ game }) => {
  const bonuses = Object.fromEntries(
    LEVELS.slice(1).map((level) => [
      level.id,
      bonusPositions(parseLevel(level.grid)).map((_, index) => index),
    ]),
  );
  await game.seedProgress({ ...atPar(LEVELS.map((_, i) => i)), bonuses });
  await game.open();
  await game.press("1. ");
  await game.waitForLevel(1);
  await game.play(bonusRoute(FIRST), "mouse");
  await expect
    .poll(async () => (await game.level()).banner)
    .toContain("ALL BONUS TARGETS FOUND!");
  await game.press("MENU");
  await game.waitForScene("title");
  expect((await game.state()).title!.header).toContain("ALL FOUND!");
});
