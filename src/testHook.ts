// A view of the running game for the browser smoke tests in e2e/: the game
// is drawn on one canvas, so tests can't find buttons or cells in the page.
// Loaded only when the page's URL has the parameter ?e2e (see main.ts);
// it changes nothing in the game unless a test sets the game's speed,
// except that the game's time keeps up with real time at low frame rates.

import type { Container, Ticker } from "pixi.js";
import { Button } from "./render/ui";
import { GameScene } from "./scenes/GameScene";
import { TitleScene } from "./scenes/TitleScene";
import type { Scene } from "./scenes/Scene";
import type { ButtonTestState, TestState } from "./testState";

declare global {
  interface Window {
    __diagonTest?: {
      state(): TestState;
      /**
       * How fast the game's time runs: 1 as usual, below 1 slower. A test
       * slows a shot down to act while the pellet is moving.
       */
      setSpeed(speed: number): void;
    };
  }
}

/**
 * Makes the current scene's state readable as `window.__diagonTest`, and
 * the speed of the game's time (`ticker`, which drives the scenes) settable.
 */
export function installTestHook(
  currentScene: () => Scene | undefined,
  ticker: Ticker,
): void {
  // The game's time keeps up with real time down to 1 frame a second
  // (PixiJS: 10). Browsers drawing in software on a machine with few
  // cores, as on GitHub, manage 3 frames a second: without this the
  // game's time would run at a third of real time, and tests that wait
  // a shot's real duration would look too early.
  ticker.minFPS = 1;
  window.__diagonTest = {
    setSpeed: (speed) => {
      ticker.speed = speed;
    },
    state: () => {
      const scene = currentScene();
      return {
        scene:
          scene === undefined
            ? null
            : scene instanceof GameScene
              ? "level"
              : "title",
        buttons: scene ? visibleButtons(scene) : [],
        level: scene instanceof GameScene ? scene.testState() : undefined,
        title: scene instanceof TitleScene ? scene.testState() : undefined,
      };
    },
  };
}

function visibleButtons(container: Container): ButtonTestState[] {
  const buttons: ButtonTestState[] = [];
  for (const child of container.children) {
    if (!child.visible) {
      continue;
    }
    if (child instanceof Button) {
      const bounds = child.getBounds();
      buttons.push({
        label: child.label,
        disabled: child.disabled,
        center: {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        },
      });
    } else {
      buttons.push(...visibleButtons(child));
    }
  }
  return buttons;
}
