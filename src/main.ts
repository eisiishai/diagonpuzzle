import { Application } from "pixi.js";
import { GameAudio } from "./audio/GameAudio";
import { bindKeyboard } from "./input/keyboard";
import { LEVELS } from "./levels/levels";
import { parseLevel } from "./levels/parse";
import {
  EMPTY_PROGRESS,
  parseProgress,
  recordCompletion,
  serializeProgress,
} from "./save/progress";
import { readStorage, removeStorage, writeStorage } from "./save/storage";
import { GameScene } from "./scenes/GameScene";
import type { Scene } from "./scenes/Scene";
import { TitleScene } from "./scenes/TitleScene";

const PROGRESS_STORAGE_KEY = "progress";

(async () => {
  const app = new Application();
  await app.init({ background: "#161a24", resizeTo: window, antialias: true });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Browsers only allow audio after a user gesture. Registered before the
  // keyboard binding so the audio is ready when the first action plays a sound.
  const audio = new GameAudio();
  window.addEventListener("pointerdown", () => audio.unlock());
  window.addEventListener("keydown", () => audio.unlock());

  let progress = parseProgress(readStorage(PROGRESS_STORAGE_KEY));
  let scene: Scene | undefined;
  const layout = () => scene?.layout(window.innerWidth, window.innerHeight);

  // Deferred: a switch is usually requested from the old scene's own pointer
  // or key event, which should finish before that scene is destroyed.
  const switchTo = (createScene: () => Scene) =>
    queueMicrotask(() => {
      scene?.destroy({ children: true });
      scene = createScene();
      app.stage.addChild(scene);
      layout();
    });

  const showTitle = () =>
    switchTo(
      () =>
        new TitleScene({
          levels: LEVELS,
          progress,
          audio,
          onStartLevel: startLevel,
          onResetProgress: () => {
            progress = EMPTY_PROGRESS;
            removeStorage(PROGRESS_STORAGE_KEY);
            showTitle();
          },
        }),
    );

  const startLevel = (index: number) => {
    const level = LEVELS[index];
    const isLastLevel = index === LEVELS.length - 1;
    switchTo(
      () =>
        new GameScene({
          board: parseLevel(level.grid),
          levelNumber: index + 1,
          levelCount: LEVELS.length,
          levelName: level.name,
          audio,
          onComplete: (shots) => {
            const result = recordCompletion(progress, level.id, shots);
            progress = result.progress;
            writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
            return result;
          },
          onNext: () => (isLastLevel ? showTitle() : startLevel(index + 1)),
          onMenu: showTitle,
        }),
    );
  };

  showTitle();
  window.addEventListener("resize", layout);
  bindKeyboard((action) => scene?.handleAction(action));
  app.ticker.add((ticker) => scene?.update(ticker.deltaMS));
})();
