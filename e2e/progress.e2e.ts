import { bonusPositions } from "../src/game/bonus";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import { STAR } from "../src/scenes/scoreText";
import { atPar, bonusRoute, expect, solution, startBoard, test } from "./game";
import type { Game } from "./game";

// Bonus targets, the once-per-player celebrations, resetting progress and
// the sound settings. Level 1 is used throughout: its solution and its
// bonus route take one shot each.

const FIRST = 0;
const ALL = LEVELS.map((_, index) => index);

async function backToTitle(game: Game) {
  await game.press("MENU");
  await game.waitForScene("title");
  return (await game.state()).title!;
}

test("a bonus target shows after par and turns the star golden", async ({
  game,
}) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.expectBoard(startBoard(FIRST), "on a first visit");
  await game.play(solution(FIRST), "mouse");
  expect((await backToTitle(game)).levels[FIRST].state).toBe("star");

  // On the next visit the bonus target is on the board.
  await game.press("1. ");
  await game.waitForLevel(1);
  await game.expectBoard(parseLevel(LEVELS[FIRST].grid), "after par");
  await game.play(bonusRoute(FIRST), "mouse");
  await expect
    .poll(async () => (await game.level()).message)
    .toContain("now golden");

  const title = await backToTitle(game);
  expect(title.levels[FIRST].state).toBe("golden");
  expect(title.header).toContain(`GOLDEN ${STAR} 1/${LEVELS.length}`);
});

test("the last star plays the All levels at par celebration", async ({
  game,
}) => {
  await game.seedProgress(atPar(ALL.slice(1)));
  await game.open();
  expect((await game.state()).title!.header).not.toContain("ALL AT PAR");
  await game.press("1. ");
  await game.waitForLevel(1);
  await game.play(solution(FIRST), "mouse");
  await expect
    .poll(async () => (await game.level()).banner)
    .toContain("ALL LEVELS AT PAR!");
  expect((await backToTitle(game)).header).toContain("ALL AT PAR!");
});

test("the last bonus target plays the All bonus targets celebration", async ({
  game,
}) => {
  const bonuses = Object.fromEntries(
    LEVELS.slice(1).map((level) => [
      level.id,
      bonusPositions(parseLevel(level.grid)).map((_, index) => index),
    ]),
  );
  await game.seedProgress({ ...atPar(ALL), bonuses });
  await game.open();
  await game.press("1. ");
  await game.waitForLevel(1);
  await game.play(bonusRoute(FIRST), "mouse");
  await expect
    .poll(async () => (await game.level()).banner)
    .toContain("ALL BONUS TARGETS FOUND!");
  const title = await backToTitle(game);
  expect(title.levels.every((level) => level.state === "golden")).toBe(true);
  expect(title.header).toContain(
    `GOLDEN ${STAR} ${LEVELS.length}/${LEVELS.length}`,
  );
});

test("Reset progress erases saved progress on its second press", async ({
  game,
}) => {
  await game.seedCompleted(2);
  await game.open();
  await game.press("RESET PROGRESS");
  await game.button("PRESS ENTER OR CLICK AGAIN");
  expect((await game.state()).title!.levels[0].state).toBe("star");
  expect(await game.storedProgress()).not.toBeNull();

  await game.press("PRESS ENTER OR CLICK AGAIN");
  await game.button("PLAY ▶");
  const { levels } = (await game.state()).title!;
  expect(levels.map((level) => level.state)).toEqual(
    LEVELS.map((_, index) => (index === 0 ? "open" : "locked")),
  );
  expect(await game.storedProgress()).toBeNull();
  expect(await game.labels()).not.toContain("RESET PROGRESS");
});

test("music and sound settings are kept after a reload", async ({ game }) => {
  await game.open();
  await game.press("MUSIC ON");
  await game.button("MUSIC OFF");
  await game.page.keyboard.press("f");
  await game.button("SOUNDS OFF");
  await game.reload();
  await game.button("MUSIC OFF");
  await game.button("SOUNDS OFF");
});

test("resizing the window mid-level keeps it playable", async ({ game }) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  const [winning] = solution(FIRST) as number[];
  const missing = winning === 0 ? 1 : 0;
  await game.fire(missing, "mouse");
  for (const size of [
    { width: 480, height: 640 },
    { width: 1600, height: 500 },
  ]) {
    await game.page.setViewportSize(size);
    // The game lays itself out again on the window's resize event.
    await expect(() => game.expectAllOnScreen()).toPass();
  }
  await game.play(solution(FIRST), "mouse");
  expect((await game.level()).phase).toBe("complete");
});
