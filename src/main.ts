import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Application } from "pixi.js";
import { GameAudio } from "./audio/GameAudio";
import { TITLE_MUSIC } from "./audio/music";
import { bindKeyboard } from "./input/keyboard";
import { LEVELS } from "./levels/levels";
import { parseLevel } from "./levels/parse";
import {
  EMPTY_PROGRESS,
  completesAllPar,
  parseProgress,
  recordCompletion,
  serializeProgress,
} from "./save/progress";
import { BACKGROUND_CSS, FONT_FACES } from "./render/theme";
import { readStorage, removeStorage, writeStorage } from "./save/storage";
import { GameScene } from "./scenes/GameScene";
import type { Scene } from "./scenes/Scene";
import { TitleScene } from "./scenes/TitleScene";

const PROGRESS_STORAGE_KEY = "progress";

(async () => {
  const app = new Application();
  // PixiJS draws text once, when it is created, so the fonts must be loaded
  // before any screen is built. A font that fails to load falls back to the
  // system font rather than stopping the game.
  await Promise.all(
    FONT_FACES.map((face) => document.fonts.load(face).catch(() => [])),
  );

  await app.init({
    background: BACKGROUND_CSS,
    resizeTo: window,
    antialias: true,
    // Render at the screen's pixel density, so text stays sharp on phones and
    // high-resolution displays.
    resolution: window.devicePixelRatio,
    autoDensity: true,
  });
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
    switchTo(() => {
      audio.setMusic(TITLE_MUSIC);
      return new TitleScene({
        levels: LEVELS,
        progress,
        audio,
        onStartLevel: startLevel,
        onResetProgress: () => {
          progress = EMPTY_PROGRESS;
          removeStorage(PROGRESS_STORAGE_KEY);
          showTitle();
        },
      });
    });

  const startLevel = (index: number) => {
    const level = LEVELS[index];
    const isLastLevel = index === LEVELS.length - 1;
    switchTo(() => {
      audio.setMusic(level.music);
      return new GameScene({
        board: parseLevel(level.grid),
        levelNumber: index + 1,
        levelCount: LEVELS.length,
        levelName: level.name,
        par: level.minShots,
        audio,
        onComplete: (shots) => {
          const before = progress;
          const result = recordCompletion(progress, level.id, shots);
          progress = result.progress;
          writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
          return {
            previousBest: result.previousBest,
            allLevelsAtPar: completesAllPar(before, progress, LEVELS),
          };
        },
        onNext: () => (isLastLevel ? showTitle() : startLevel(index + 1)),
        onMenu: showTitle,
      });
    });
  };

  showTitle();
  window.addEventListener("resize", layout);
  bindKeyboard((action) => scene?.handleAction(action));
  app.ticker.add((ticker) => scene?.update(ticker.deltaMS));
})();
