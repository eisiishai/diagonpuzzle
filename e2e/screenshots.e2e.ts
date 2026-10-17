import { LEVELS } from "../src/levels/levels";
import { levelIndex, solution, test } from "./game";
import type { Game } from "./game";

// `npm run screenshots`: pictures of the main screens at desktop and phone
// sizes, written to screenshots/ (git-ignored) for looking over a visual
// change. They check nothing themselves; the game still fails on console
// errors. Motion is reduced, so the pictures are of still screens.

const SIZES = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 412, height: 839 },
};
const YOUR_MOVE = levelIndex("your-move"); // the first with the player's mirror
const RETURN_TRIP = levelIndex("return-trip"); // the first with a reflector
const GLASS_HOUSE = levelIndex("glass-house"); // the first with a glass mirror
const BOLTED_DOWN = levelIndex("bolted-down"); // the first with a fixed mirror
const OTHER_SIDE = levelIndex("other-side"); // the first with portals
const ONE_WAY = levelIndex("one-way"); // the first with one-way gates

for (const [device, size] of Object.entries(SIZES)) {
  const shoot = (game: Game, name: string) =>
    game.page.screenshot({ path: `screenshots/${device}-${name}.png` });

  test.describe(device, () => {
    test.use({ viewport: size });

    test("title", async ({ game }) => {
      await game.open();
      await shoot(game, "title-new");
      await game.seedCompleted(LEVELS.length);
      await game.page.evaluate(() => localStorage.clear());
      await game.reload();
      await shoot(game, "title-all-done");
    });

    test("level 1", async ({ game }) => {
      await game.open();
      await game.press("PLAY");
      await game.waitForLevel(1);
      await shoot(game, "level-1-start");
      await game.play(solution(0), "mouse");
      await shoot(game, "level-1-complete");
    });

    test("player mirror", async ({ game }) => {
      await game.seedCompleted(YOUR_MOVE);
      await game.open();
      await game.press(`${YOUR_MOVE + 1}. `);
      await game.waitForLevel(YOUR_MOVE + 1);
      await game.page.keyboard.press("p");
      await shoot(game, `level-${YOUR_MOVE + 1}-placing`);
    });

    test("reflector", async ({ game }) => {
      await game.seedCompleted(RETURN_TRIP);
      await game.open();
      await game.press(`${RETURN_TRIP + 1}. `);
      await game.waitForLevel(RETURN_TRIP + 1);
      await shoot(game, `level-${RETURN_TRIP + 1}-start`);
      await game.play(solution(RETURN_TRIP), "mouse");
      await shoot(game, `level-${RETURN_TRIP + 1}-complete`);
    });

    test("glass mirror", async ({ game }) => {
      await game.seedCompleted(GLASS_HOUSE);
      await game.open();
      await game.press(`${GLASS_HOUSE + 1}. `);
      await game.waitForLevel(GLASS_HOUSE + 1);
      await shoot(game, `level-${GLASS_HOUSE + 1}-start`);
      const [first] = solution(GLASS_HOUSE);
      await game.play([first], "mouse");
      await shoot(game, `level-${GLASS_HOUSE + 1}-first-shot`);
    });

    test("fixed mirror", async ({ game }) => {
      await game.seedCompleted(BOLTED_DOWN);
      await game.open();
      await game.press(`${BOLTED_DOWN + 1}. `);
      await game.waitForLevel(BOLTED_DOWN + 1);
      await shoot(game, `level-${BOLTED_DOWN + 1}-start`);
      const [first] = solution(BOLTED_DOWN);
      await game.play([first], "mouse");
      await shoot(game, `level-${BOLTED_DOWN + 1}-first-shot`);
    });

    test("portals", async ({ game }) => {
      await game.seedCompleted(OTHER_SIDE);
      await game.open();
      await game.press(`${OTHER_SIDE + 1}. `);
      await game.waitForLevel(OTHER_SIDE + 1);
      await shoot(game, `level-${OTHER_SIDE + 1}-start`);
      const [first] = solution(OTHER_SIDE);
      await game.play([first], "mouse");
      await shoot(game, `level-${OTHER_SIDE + 1}-first-shot`);
    });

    test("one-way gates", async ({ game }) => {
      await game.seedCompleted(ONE_WAY);
      await game.open();
      await game.press(`${ONE_WAY + 1}. `);
      await game.waitForLevel(ONE_WAY + 1);
      await shoot(game, `level-${ONE_WAY + 1}-start`);
      await game.play([3], "mouse");
      await shoot(game, `level-${ONE_WAY + 1}-blocked`);
    });

    test("last level", async ({ game }) => {
      await game.seedCompleted(LEVELS.length - 1);
      await game.open();
      await game.press(`${LEVELS.length}. `);
      await game.waitForLevel(LEVELS.length);
      const [first] = solution(LEVELS.length - 1);
      await game.play([first], "mouse");
      await shoot(game, `level-${LEVELS.length}-first-shot`);
    });
  });
}
