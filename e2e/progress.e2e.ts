import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import { STAR } from "../src/scenes/scoreText";
import {
  MAIN_LEVELS,
  allBonuses,
  atPar,
  bonusRoute,
  expect,
  solution,
  startBoard,
  test,
} from "./game";
import type { Game } from "./game";

// Bonus targets, the once-per-player celebrations, resetting progress and
// the sound settings. Level 1 is used throughout: its solution and its
// bonus route take one shot each.

const FIRST = 0;
const ALL = MAIN_LEVELS.map((_, index) => index);

async function backToTitle(game: Game) {
  await game.press("MENU");
  await game.waitForScene("title");
  return (await game.state()).title!;
}

test("a bonus target shows after par, on a restart or the next visit, and turns the star golden", async ({
  game,
}) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.expectBoard(startBoard(FIRST), "on a first visit");
  await game.play(solution(FIRST), "mouse");
  // Restarting after par brings it in at once.
  await game.press("RESTART");
  await game.expectBoard(
    parseLevel(LEVELS[FIRST].grid),
    "after par and a restart",
  );
  await expect
    .poll(async () => (await game.level()).message)
    .toContain("bonus target has appeared");
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
  expect(title.header).toContain(`GOLDEN ${STAR} 1/${MAIN_LEVELS.length}`);
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
  // A hint that there is more, without naming the bonus targets.
  expect((await game.level()).message).toContain("something new awaits");
  const { header } = await backToTitle(game);
  expect(header).toContain("ALL AT PAR!");
  expect(header).toContain(`GOLDEN ${STAR} 0/${MAIN_LEVELS.length}`);
});

test("the secret chapter's last star plays the prism celebration and a prism star", async ({
  game,
}) => {
  const last = LEVELS.length - 1;
  await game.seedProgress({
    ...atPar(LEVELS.slice(0, last).map((_, index) => index)),
    bonuses: allBonuses(),
  });
  await game.open();
  const number = `${last + 1}. `;
  await game.press(number);
  await game.waitForLevel(last + 1);
  await game.play(solution(last), "mouse");
  await expect
    .poll(async () => (await game.level()).banner)
    .toContain("PRISM AT PAR!");
  const title = await backToTitle(game);
  expect(title.levels[last].state).toBe("prism");
  expect(title.header).toContain("ALL AT PAR!");
  // The whole game is done: the title turns to the bonus colours.
  expect(title.prismTitle).toBe(true);
});

test("the last bonus target plays the All bonus targets celebration and opens the secret chapter", async ({
  game,
}) => {
  const bonuses = Object.fromEntries(
    Object.entries(allBonuses()).filter(([id]) => id !== LEVELS[FIRST].id),
  );
  await game.seedProgress({ ...atPar(ALL), bonuses });
  await game.open();
  const before = (await game.state()).title!;
  expect(before.levels).toHaveLength(MAIN_LEVELS.length);
  expect(before.chapters[before.chapters.length - 1]).toContain(
    "ONE-WAY GATES",
  );
  await game.press("1. ");
  await game.waitForLevel(1);
  await game.play(bonusRoute(FIRST), "mouse");
  await expect
    .poll(async () => (await game.level()).banner)
    .toContain("ALL BONUS TARGETS FOUND!");
  expect((await game.level()).message).toContain("hidden chapter");
  const title = await backToTitle(game);
  const main = title.levels.slice(0, MAIN_LEVELS.length);
  expect(main.every((level) => level.state === "golden")).toBe(true);
  expect(title.header).toContain(
    `GOLDEN ${STAR} ${MAIN_LEVELS.length}/${MAIN_LEVELS.length}  ·  ALL FOUND!`,
  );
  // Not yet the prism title: the secret chapter is still to play.
  expect(title.prismTitle).toBe(false);
  // The secret chapter is in the list now, its first level open.
  expect(title.levels).toHaveLength(LEVELS.length);
  expect(title.chapters[title.chapters.length - 1]).toContain("PRISM");
  expect(title.levels[MAIN_LEVELS.length].state).toBe("open");
  await game.button(`CONTINUE: LEVEL ${MAIN_LEVELS.length + 1}`);
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
    MAIN_LEVELS.map((_, index) => (index === 0 ? "open" : "locked")),
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
