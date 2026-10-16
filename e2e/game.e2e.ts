import { fire } from "../src/game/simulate";
import { CHAPTERS, LEVELS, chapterRanges } from "../src/levels/levels";
import { EMPTY_PROGRESS, SKIP_WAIT_MS } from "../src/save/progress";
import { expect, solution, startBoard, test } from "./game";
import type { Game } from "./game";

// Level indices (0-based) used below.
const FIRST = 0;
const YOUR_MOVE = 14; // the first level with the player's mirror

test("the main page plays the game from its version folder", async ({
  game,
}) => {
  // Built as for the website (vite.config.ts): the main page, and the
  // game in a folder named after its version, which a <base> points to.
  const files: string[] = [];
  game.page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/\.(js|css|woff2?|png|svg)$/.test(path)) {
      files.push(path);
    }
  });
  await game.open();
  expect(new URL(game.page.url()).pathname).toBe("/");
  const page = await (await game.page.request.get("./")).text();
  const folder = /<base href="\.\/([^/"]+)\/"/.exec(page)?.[1];
  expect(folder, "the main page's <base> folder").toBeTruthy();
  expect(files.length).toBeGreaterThan(0);
  expect(files.filter((path) => !path.startsWith(`/${folder}/`))).toEqual([]);

  // The folder's own page plays it too, as an older snapshot does.
  await game.page.goto(`./${folder}/?e2e`);
  await game.waitForScene("title");
});

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
  // Level 6 is locked, so right goes no further; left steps back.
  await game.page.keyboard.press("ArrowRight");
  expect((await title()).detail).toMatch(/^5\. /);
  await game.page.keyboard.press("ArrowLeft");
  expect((await title()).detail).toMatch(/^4\. /);
  await game.page.keyboard.press("ArrowRight");
  await game.page.keyboard.press("Enter");
  await game.waitForLevel(5);
});

test.describe("a level list taller than the screen", () => {
  test.use({ viewport: { width: 1280, height: 600 } });
  const LAST = LEVELS.length - 1;
  const lastLabel = `${LAST + 1}. `;

  test("opens on the chapter Play starts", async ({ game }) => {
    await game.seedCompleted(LAST - 1);
    await game.open();
    expect((await game.button(lastLabel)).inView).toBe(true);
    expect((await game.button("1. ")).inView).toBe(false);
    await game.expectAllOnScreen();
  });

  test("scrolls with the mouse wheel", async ({ game }) => {
    await game.seedCompleted(LEVELS.length);
    await game.open();
    expect((await game.button(lastLabel)).inView).toBe(false);
    // press() wheels the list until the tile is in view.
    await game.press(lastLabel);
    await game.waitForLevel(LAST + 1);
  });

  test("follows the arrow keys", async ({ game }) => {
    await game.seedCompleted(LEVELS.length);
    await game.open();
    const chapters = chapterRanges(LEVELS, CHAPTERS);
    const selected = async () => {
      const number = Number((await game.state()).title!.detail.split(".")[0]);
      return { number, tile: await game.button(`${number}. `) };
    };
    // Down from Play steps through the chapters, each scrolled into view.
    for (const chapter of chapters) {
      await game.page.keyboard.press("ArrowDown");
      const { number, tile } = await selected();
      expect(number).toBeGreaterThan(chapter.start);
      expect(number).toBeLessThanOrEqual(chapter.end);
      await expect.poll(async () => (await selected()).tile.inView).toBe(true);
      expect(tile.label).toMatch(/^\d+\. /);
    }
    // Down again leaves the list for Reset progress.
    await game.page.keyboard.press("ArrowDown");
    await game.page.keyboard.press("Enter");
    await game.button("PRESS ENTER OR CLICK AGAIN");
  });
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

test("Esc cancels choosing the mirror's cell, staying on the level", async ({
  game,
}) => {
  await game.seedCompleted(YOUR_MOVE);
  await game.open();
  await game.press(`${YOUR_MOVE + 1}. `);
  await game.waitForLevel(YOUR_MOVE + 1);
  await game.page.keyboard.press("p");
  await expect
    .poll(async () => (await game.level()).placementPreview)
    .not.toBeNull();
  await game.page.keyboard.press("Escape");
  const level = await game.level();
  expect(level.placementPreview).toBeNull();
  expect(level.mirrorInHand).toBe(true);
  expect((await game.state()).scene).toBe("level");
});

test("the Skip button skips on its second press", async ({ game }) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  // The second press must come within 3 s of the game's time: slowed
  // down, so a machine where each step of the test takes a second still
  // makes it.
  await game.setSpeed(0.1);
  await game.press("SKIP LEVEL · 3/3");
  await game.button("PRESS AGAIN TO SKIP");
  expect((await game.level()).number).toBe(1);
  await game.press("PRESS AGAIN TO SKIP");
  await game.setSpeed(1);
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

test("holding the level's name is the hidden skip too", async ({ game }) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  const { levelName } = await game.level();
  const box = await game.page.locator("canvas").boundingBox();
  await game.page.mouse.move(box!.x + levelName.x, box!.y + levelName.y);
  await game.page.mouse.down();
  await game.waitForLevel(2);
  await game.page.mouse.up();
  await game.button("SKIP LEVEL · 3/3");
});

test("with no skips left, Skip waits until time on levels gives one back", async ({
  game,
}) => {
  // Eight seconds short of earning a skip back: enough for a slow machine
  // to see the button before then, and well within the wait for it after.
  // Level 1 was skipped, which unlocks level 2.
  await game.seedProgress({
    ...EMPTY_PROGRESS,
    skipped: [LEVELS[FIRST].id],
    skipsLeft: 0,
    skipWaitMs: SKIP_WAIT_MS - 8000,
  });
  await game.open();
  expect((await game.state()).title!.levels[FIRST].state).toBe("skipped");
  await game.press("2. ");
  await game.waitForLevel(2);
  expect((await game.button("NO SKIPS LEFT")).disabled).toBe(true);
  expect((await game.button("SKIP LEVEL · 1/3")).disabled).toBe(false);
});

test("M and F switch music and sounds, on a level and the title", async ({
  game,
}) => {
  await game.open();
  await game.press("PLAY");
  await game.waitForLevel(1);
  await game.page.keyboard.press("m");
  await game.button("MUSIC OFF");
  await game.page.keyboard.press("f");
  await game.button("SOUNDS OFF");
  await game.press("MENU");
  await game.waitForScene("title");
  await game.page.keyboard.press("m");
  await game.button("MUSIC ON");
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
