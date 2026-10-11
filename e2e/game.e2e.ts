import { fire } from "../src/game/simulate";
import { LEVELS } from "../src/levels/levels";
import { expect, solution, startBoard, test } from "./game";
import type { Game } from "./game";

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

test("arrow keys move between level tiles, naming the selected level", async ({
  game,
}) => {
  await game.seedCompleted(4);
  await game.open();
  const title = async () => (await game.state()).title!;
  expect((await title()).chapters[0]).toBe("01 BASICS ★ 4/4");
  expect((await title()).detail).toBe(`5. ${LEVELS[4].name} · par 2`);

  // Down from Play reaches a tile in the first chapter; right steps on.
  await game.page.keyboard.press("ArrowDown");
  const first = Number((await title()).detail.split(".")[0]);
  expect(first).toBeGreaterThanOrEqual(1);
  expect(first).toBeLessThanOrEqual(4);
  for (let n = first + 1; n <= 5; n++) {
    await game.page.keyboard.press("ArrowRight");
    expect((await title()).detail).toMatch(new RegExp(`^${n}\\. `));
  }
  // Level 6 is locked, so right goes no further.
  await game.page.keyboard.press("ArrowRight");
  expect((await title()).detail).toMatch(/^5\. /);
  await game.page.keyboard.press("Enter");
  await game.waitForLevel(5);
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

test.describe("interrupting a shot", () => {
  // Level 1's top row: a shot that flips mirrors and leaves the board
  // without reaching the goal, so a restart has something to undo. The
  // game's time is slowed while it flies, so the test's input surely
  // arrives before it ends (input to a browser drawing in software takes
  // a large part of a second).
  const ROW = 0;
  const start = startBoard(FIRST);
  const shot = fire(start, ROW);
  const SLOW = 0.1;
  // At normal speed, longer than the shot takes, so anything it would
  // still have done shows.
  const SHOT_TIME_MS = 2500;

  test.beforeEach(async ({ game }) => {
    expect(shot.outcome).toBe("exit");
    expect(shot.board).not.toEqual(start);
    await game.open();
    await game.press("PLAY");
    await game.waitForLevel(1);
  });

  /** Fires the slowed shot; returns once it is on its way. */
  async function startSlowShot(game: Game) {
    await game.setSpeed(SLOW);
    await game.startShot(ROW, "mouse");
  }

  /** Checks the shot was still on its way, then lets time run again. */
  async function endSlowShot(game: Game) {
    const { scene, level } = await game.state();
    if (scene === "level" && level?.number === 1) {
      expect(level.shots === 0 || level.phase === "firing").toBe(true);
    }
    await game.setSpeed(1);
    await game.page.waitForTimeout(SHOT_TIME_MS);
  }

  const restarts: [string, (game: Game) => Promise<void>][] = [
    ["R", (game) => game.page.keyboard.press("r")],
    ["the button", (game) => game.press("RESTART")],
  ];
  for (const [name, restart] of restarts) {
    test(`restart with ${name} puts the starting board back`, async ({
      game,
    }) => {
      await startSlowShot(game);
      await restart(game);
      await endSlowShot(game);
      await game.expectBoard(start, "after the restart");
      const { phase, shots, hits } = await game.level();
      expect({ phase, shots, hits }).toEqual({
        phase: "aiming",
        shots: 0,
        hits: 0,
      });
      // The level then plays on as usual.
      await game.play(solution(FIRST), "mouse");
      expect((await game.level()).phase).toBe("complete");
    });
  }

  const leaves: [string, (game: Game) => Promise<void>][] = [
    ["Esc", (game) => game.page.keyboard.press("Escape")],
    ["the Menu button", (game) => game.press("MENU")],
  ];
  for (const [name, leave] of leaves) {
    test(`leaving with ${name} goes to the title screen`, async ({ game }) => {
      await startSlowShot(game);
      await leave(game);
      await game.waitForScene("title");
      await endSlowShot(game);
      expect((await game.state()).scene).toBe("title");
      // Coming back starts the level afresh.
      await game.press("PLAY");
      await game.waitForLevel(1);
      await game.expectBoard(start, "on coming back");
      expect((await game.level()).shots).toBe(0);
    });
  }

  test("the hidden skip goes on to the next level", async ({ game }) => {
    await startSlowShot(game);
    await game.page.keyboard.press("Shift+N");
    await game.waitForLevel(2);
    await endSlowShot(game);
    await game.expectBoard(startBoard(1), "of the next level");
    expect((await game.level()).shots).toBe(0);
  });

  test("firing again is ignored until the shot finishes", async ({ game }) => {
    await startSlowShot(game);
    // The winning row, by click and by keyboard: neither may fire.
    const [winning] = solution(FIRST) as number[];
    await game.pointAt((await game.level()).launchers[winning], "mouse");
    await game.page.keyboard.press("Enter");
    await endSlowShot(game);
    const { phase, shots } = await game.level();
    expect({ phase, shots }).toEqual({ phase: "aiming", shots: 1 });
    await game.expectBoard(shot.board, "after the one shot");
  });
});
