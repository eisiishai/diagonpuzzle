import { expect, solution, test } from "./game";

// Run on a phone-sized screen with touch input (playwright.config.ts).

const YOUR_MOVE = 14; // the first level with the player's mirror

test("everything fits on the screen", async ({ game }) => {
  await game.seedCompleted(YOUR_MOVE);
  await game.open();
  const size = game.page.viewportSize()!;
  const inside = (point: { x: number; y: number }) =>
    point.x > 0 && point.x < size.width && point.y > 0 && point.y < size.height;

  for (const button of (await game.state()).buttons) {
    expect(inside(button.center), button.label).toBe(true);
  }
  await game.press(`${YOUR_MOVE + 1}. `, "touch");
  await game.waitForLevel(YOUR_MOVE + 1);
  const { buttons, level } = await game.state();
  for (const button of buttons) {
    expect(inside(button.center), button.label).toBe(true);
  }
  for (const point of [
    ...level!.launchers,
    ...level!.cells.flat().map((cell) => cell.center),
  ]) {
    expect(inside(point)).toBe(true);
  }
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
