import { LEVELS } from "../src/levels/levels";
import { expect, solution, test } from "./game";

// Level indices (0-based) used below.
const FIRST = 0;
const YOUR_MOVE = 14; // the first level with the player's mirror

test("the title screen lists every level, only the first unlocked", async ({
  game,
}) => {
  await game.open();
  const { buttons } = await game.state();
  expect(buttons[0].label).toBe("PLAY ▶");
  const rows = buttons.filter((button) => /^\d+\. /.test(button.label));
  expect(rows.map((row) => row.label)).toEqual(
    LEVELS.map((level, index) => `${index + 1}. ${level.name}`),
  );
  expect(rows.map((row) => row.disabled)).toEqual(
    LEVELS.map((_, index) => index > 0),
  );
});

test("Play and a level button open a level", async ({ game }) => {
  await game.seedCompleted(2);
  await game.open();
  await game.press("3. ");
  await game.waitForLevel(3);
  await game.press("MENU");
  await game.waitForScene("title");
  await game.press("CONTINUE: LEVEL 3");
  await game.waitForLevel(3);
});

test("level 1 completed with the mouse leads on to level 2", async ({
  game,
}) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.play(solution(FIRST), "mouse");
  expect((await game.level()).phase).toBe("complete");
  await game.press("NEXT LEVEL");
  await game.waitForLevel(2);
});

test("keyboard: start, fire, restart, complete and continue", async ({
  game,
}) => {
  await game.open();
  await game.page.keyboard.press("Enter");
  await game.waitForLevel(1);

  // A row that misses, then restart puts the shot count back to 0.
  const [winning] = solution(FIRST) as number[];
  const missing = winning === 0 ? 1 : 0;
  await game.fire(missing, "keyboard");
  await game.page.keyboard.press("r");
  await expect.poll(async () => (await game.level()).shots).toBe(0);

  await game.play(solution(FIRST), "keyboard");
  expect((await game.level()).phase).toBe("complete");
  await game.page.keyboard.press("Enter");
  await game.waitForLevel(2);
});

for (const input of ["mouse", "keyboard"] as const) {
  test(`player mirror placed with the ${input}`, async ({ game }) => {
    await game.seedCompleted(YOUR_MOVE);
    await game.open();
    await game.press(`${YOUR_MOVE + 1}. `);
    await game.waitForLevel(YOUR_MOVE + 1);
    expect((await game.level()).mirrorInHand).toBe(true);
    await game.play(solution(YOUR_MOVE), input);
    expect((await game.level()).phase).toBe("complete");
  });
}

test("the Skip button skips on its second press", async ({ game }) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.press("SKIP LEVEL · 3/3");
  await game.button("PRESS AGAIN TO SKIP");
  expect((await game.level()).number).toBe(1);
  await game.press("PRESS AGAIN TO SKIP");
  await game.waitForLevel(2);
  await game.button("SKIP LEVEL · 2/3");
});

test("the hidden skip (Shift+N) uses no visible skip", async ({ game }) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.page.keyboard.press("Shift+N");
  await game.waitForLevel(2);
  await game.button("SKIP LEVEL · 3/3");
});

test("progress is kept after reloading the page", async ({ game }) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.play(solution(FIRST), "mouse");
  await game.press("MENU");
  await game.waitForScene("title");
  await game.reload();
  await game.button("CONTINUE: LEVEL 2");
  const level2 = await game.button(`2. ${LEVELS[1].name}`);
  expect(level2.disabled).toBe(false);
});

test("the game runs with localStorage blocked", async ({ game }) => {
  await game.page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("localStorage blocked");
      },
    });
  });
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.play(solution(FIRST), "mouse");
  expect((await game.level()).phase).toBe("complete");
});
