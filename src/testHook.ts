// A view of the running game for the browser smoke tests in e2e/: the game
// is drawn on one canvas, so tests can't find buttons or cells in the page.
// Loaded only when the page's URL has the parameter ?e2e (see main.ts);
// it changes nothing in the game.

import type { Container } from "pixi.js";
import { Button } from "./render/ui";
import { GameScene } from "./scenes/GameScene";
import type { Scene } from "./scenes/Scene";
import type { ButtonTestState, TestState } from "./testState";

declare global {
  interface Window {
    __diagonTest?: { state(): TestState };
  }
}

/** Makes the current scene's state readable as `window.__diagonTest`. */
export function installTestHook(currentScene: () => Scene | undefined): void {
  window.__diagonTest = {
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
