// Helpers for the browser smoke tests: open the game with its test hook
// (src/testHook.ts), find buttons, launchers and cells on the canvas, and
// play levels by their solver solutions.

import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { withBonuses } from "../src/game/bonus";
import { solveMoves } from "../src/game/solver";
import type { Move } from "../src/game/solver";
import type { Position } from "../src/game/types";
import { LEVELS } from "../src/levels/levels";
import { parseLevel } from "../src/levels/parse";
import { EMPTY_PROGRESS, serializeProgress } from "../src/save/progress";
import type {
  ButtonTestState,
  LevelTestState,
  Point,
  TestState,
} from "../src/testState";

/** How a test gives input: mouse, keyboard or touch. */
export type InputMethod = "mouse" | "keyboard" | "touch";

const PROGRESS_KEY = "diagonpuzzle.progress";

/**
 * Each test gets `game`, the game in its page. A console error or uncaught
 * exception anywhere in the test fails it.
 */
export const test = base.extend<{ game: Game }>({
  game: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await use(new Game(page));
    expect(errors, "console errors and uncaught exceptions").toEqual([]);
  },
});

export { expect };

/** The shortest solution of level `index` (0-based), as on a first visit. */
export function solution(index: number): Move[] {
  const level = LEVELS[index];
  const moves = solveMoves(withBonuses(parseLevel(level.grid)), {
    goalHits: level.goalHits,
    playerMirror: level.playerMirror,
  });
  if (!moves) {
    throw new Error(`Level ${index + 1} has no solution`);
  }
  return moves;
}

export class Game {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Starts the page with saved progress in which the first `levels`
   * levels are completed at par, unless the page already has progress.
   */
  async seedCompleted(levels: number): Promise<void> {
    const progress = serializeProgress({
      ...EMPTY_PROGRESS,
      levels: Object.fromEntries(
        LEVELS.slice(0, levels).map((level) => [
          level.id,
          { bestShots: level.minShots },
        ]),
      ),
    });
    await this.page.addInitScript(
      ([key, value]) => {
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, value);
        }
      },
      [PROGRESS_KEY, progress],
    );
  }

  /** Opens the game and waits for the title screen. */
  async open(): Promise<void> {
    await this.page.goto("./?e2e");
    await this.waitForScene("title");
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForScene("title");
  }

  /** The game's state; no scene until the game and its test hook load. */
  async state(): Promise<TestState> {
    return this.page.evaluate(
      () => window.__diagonTest?.state() ?? { scene: null, buttons: [] },
    );
  }

  async waitForScene(scene: "title" | "level"): Promise<void> {
    await expect
      .poll(async () => (await this.state()).scene, { message: "scene" })
      .toBe(scene);
  }

  /** The level being played, once its screen is showing. */
  async level(): Promise<LevelTestState> {
    const { level } = await this.state();
    if (!level) {
      throw new Error("Not on a level screen");
    }
    return level;
  }

  /** Waits for level `number` (1 for the first) to be on screen. */
  async waitForLevel(number: number): Promise<void> {
    await expect
      .poll(async () => (await this.state()).level?.number, {
        message: "level number",
      })
      .toBe(number);
  }

  async labels(): Promise<string[]> {
    return (await this.state()).buttons.map((button) => button.label);
  }

  /** The visible button whose label starts with `label`. */
  async button(label: string): Promise<ButtonTestState> {
    await expect
      .poll(async () => this.labels(), { message: `a "${label}" button` })
      .toContainEqual(expect.stringMatching(`^${escapeRegExp(label)}`));
    const { buttons } = await this.state();
    return buttons.find((button) => button.label.startsWith(label))!;
  }

  async press(label: string, input: "mouse" | "touch" = "mouse") {
    await this.pointAt((await this.button(label)).center, input);
  }

  /** Clicks or taps at a point on the canvas. */
  async pointAt(point: Point, input: "mouse" | "touch"): Promise<void> {
    const box = await this.page.locator("canvas").boundingBox();
    const x = (box?.x ?? 0) + point.x;
    const y = (box?.y ?? 0) + point.y;
    if (input === "touch") {
      await this.page.touchscreen.tap(x, y);
    } else {
      await this.page.mouse.click(x, y);
    }
  }

  /** Fires from `row` and waits for the shot to finish. */
  async fire(row: number, input: InputMethod): Promise<void> {
    const before = await this.level();
    if (input === "keyboard") {
      const step = row > before.selectedRow ? "ArrowDown" : "ArrowUp";
      for (let i = 0; i < Math.abs(row - before.selectedRow); i++) {
        await this.page.keyboard.press(step);
      }
      await this.page.keyboard.press("Enter");
    } else {
      await this.pointAt(before.launchers[row], input);
    }
    await expect
      .poll(
        async () => {
          const { shots, phase } = await this.level();
          return shots === before.shots + 1 && phase !== "firing";
        },
        { message: `the shot from row ${row} to finish` },
      )
      .toBe(true);
  }

  /**
   * Places the player's mirror on cell `at`: a click; on touch a tap to
   * preview and a second to place; with the keyboard P, arrows to the cell
   * and Enter.
   */
  async placeMirror(at: Position, input: InputMethod): Promise<void> {
    const cell = (await this.level()).cells[at.y][at.x];
    if (input === "keyboard") {
      await this.page.keyboard.press("p");
      const start = (await this.level()).placementPreview!;
      const keys = [
        ...repeat(at.x > start.x ? "ArrowRight" : "ArrowLeft", at.x - start.x),
        ...repeat(at.y > start.y ? "ArrowDown" : "ArrowUp", at.y - start.y),
        "Enter",
      ];
      for (const key of keys) {
        await this.page.keyboard.press(key);
      }
    } else {
      await this.pointAt(cell.center, input);
      if (input === "touch") {
        await expect
          .poll(async () => (await this.level()).placementPreview)
          .toEqual({ x: at.x, y: at.y });
        await this.pointAt(cell.center, input);
      }
    }
    await expect
      .poll(async () => (await this.level()).mirrorInHand, {
        message: "the mirror to be placed",
      })
      .toBe(false);
  }

  /** Plays `moves` on the current level. */
  async play(moves: readonly Move[], input: InputMethod): Promise<void> {
    for (const move of moves) {
      if (typeof move === "number") {
        await this.fire(move, input);
      } else {
        await this.placeMirror(move, input);
      }
    }
  }
}

function repeat(key: string, times: number): string[] {
  return Array.from({ length: Math.abs(times) }, () => key);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
