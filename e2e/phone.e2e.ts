import { LEVELS } from "../src/levels/levels";
import { expect, solution, test } from "./game";

// Run on a phone-sized screen with touch input (playwright.config.ts).

const YOUR_MOVE = 14; // the first level with the player's mirror

test("everything fits on the screen", async ({ game }) => {
  await game.seedCompleted(YOUR_MOVE);
  await game.open();
  await game.expectAllOnScreen();
  await game.press(`${YOUR_MOVE + 1}. `, "touch");
  await game.waitForLevel(YOUR_MOVE + 1);
  await game.expectAllOnScreen();
});

test("a swipe scrolls the level list without opening a level", async ({
  game,
}) => {
  // A shorter phone than the usual one, where the list doesn't fit.
  await game.page.setViewportSize({ width: 412, height: 700 });
  await game.seedCompleted(LEVELS.length);
  await game.open();
  const last = `${LEVELS.length}. `;
  expect((await game.button(last)).inView).toBe(false);
  // Starting on level 1's tile: the swipe scrolls instead of tapping it.
  const first = await game.button("1. ");
  await game.swipe(first.center, -120);
  await expect
    .poll(async () => (await game.button("1. ")).center.y)
    .toBeLessThan(first.center.y - 100);
  expect((await game.state()).scene).toBe("title");
  // press() swipes on until the last level's tile is in view.
  await game.press(last, "touch");
  await game.waitForLevel(LEVELS.length);
});

test("level 1 played with taps", async ({ game }) => {
  await game.open();
  await game.press("PLAY", "touch");
  await game.waitForLevel(1);
  await game.play(solution(0), "touch");
  expect((await game.level()).phase).toBe("complete");
  await game.press("NEXT LEVEL", "touch");
  await game.waitForLevel(2);
});

test("player mirror placed with two taps", async ({ game }) => {
  await game.seedCompleted(YOUR_MOVE);
  await game.open();
  await game.press(`${YOUR_MOVE + 1}. `, "touch");
  await game.waitForLevel(YOUR_MOVE + 1);
  await game.play(solution(YOUR_MOVE), "touch");
  expect((await game.level()).phase).toBe("complete");
});

test("turning the phone mid-level keeps it playable", async ({ game }) => {
  await game.seedCompleted(YOUR_MOVE);
  await game.open();
  await game.press(`${YOUR_MOVE + 1}. `, "touch");
  await game.waitForLevel(YOUR_MOVE + 1);
  const portrait = game.page.viewportSize()!;
  for (const size of [
    { width: portrait.height, height: portrait.width },
    portrait,
  ]) {
    await game.page.setViewportSize(size);
    // The game lays itself out again on the window's resize event.
    await expect(() => game.expectAllOnScreen()).toPass();
  }
  // Turned to landscape for playing it.
  await game.page.setViewportSize({
    width: portrait.height,
    height: portrait.width,
  });
  await game.play(solution(YOUR_MOVE), "touch");
  expect((await game.level()).phase).toBe("complete");
});
