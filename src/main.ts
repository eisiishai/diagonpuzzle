import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Application } from "pixi.js";
import { GameAudio } from "./audio/GameAudio";
import { TITLE_MUSIC } from "./audio/music";
import { bonusPositions, withBonuses } from "./game/bonus";
import { bindKeyboard } from "./input/keyboard";
import { LEVELS } from "./levels/levels";
import { parseLevel } from "./levels/parse";
import {
  EMPTY_PROGRESS,
  collectedBonuses,
  completesAllBonuses,
  completesAllPar,
  earnsStar,
  hasAllBonuses,
  isCompleted,
  parseProgress,
  recordBonus,
  recordCompletion,
  recordSkip,
  serializeProgress,
} from "./save/progress";
import type { LevelSummary } from "./save/progress";
import { BackgroundGrid } from "./render/BackgroundGrid";
import { BACKGROUND_CSS, FONT_FACES } from "./render/theme";
import { readStorage, removeStorage, writeStorage } from "./save/storage";
import { GameScene } from "./scenes/GameScene";
import type { Scene } from "./scenes/Scene";
import { TitleScene } from "./scenes/TitleScene";

const PROGRESS_STORAGE_KEY = "progress";

const LEVEL_SUMMARIES: readonly LevelSummary[] = LEVELS.map((level) => ({
  id: level.id,
  minShots: level.minShots,
  bonusCount: bonusPositions(parseLevel(level.grid)).length,
}));

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
  // A long press (the hidden level skip) must not open the browser's
  // context menu on phones.
  app.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  // Browsers only allow audio after a user gesture. Registered before the
  // keyboard binding so the audio is ready when the first action plays a sound.
  const audio = new GameAudio();
  window.addEventListener("pointerdown", () => audio.unlock());
  window.addEventListener("keydown", () => audio.unlock());

  let progress = parseProgress(readStorage(PROGRESS_STORAGE_KEY));
  let scene: Scene | undefined;
  // The drifting grid stays at the back; scenes are added on top of it.
  const background = new BackgroundGrid(app.renderer.resolution);
  app.stage.addChild(background);
  const layout = () => {
    background.resize(window.innerWidth, window.innerHeight);
    scene?.layout(window.innerWidth, window.innerHeight);
  };

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
        summaries: LEVEL_SUMMARIES,
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
    const summary = LEVEL_SUMMARIES[index];
    const isLastLevel = index === LEVELS.length - 1;
    switchTo(() => {
      audio.setMusic(level.music);
      // Bonus targets appear on visits after the level was completed at
      // par, never on the visit that first reaches par.
      const fullBoard = parseLevel(level.grid);
      const bonuses = bonusPositions(fullBoard);
      const best = progress.levels[level.id]?.bestShots;
      const bonusesShown =
        best !== undefined && earnsStar(best, level.minShots);
      return new GameScene({
        // Collected bonus targets are shown too, so they can be replayed.
        board: withBonuses(fullBoard, () => bonusesShown),
        levelNumber: index + 1,
        levelCount: LEVELS.length,
        levelName: level.name,
        par: level.minShots,
        goalHits: level.goalHits ?? 1,
        completedBefore: isCompleted(progress, level.id),
        bonus: {
          shown: bonusesShown,
          total: bonuses.length,
          collected: collectedBonuses(progress, level.id).length,
        },
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
        onBonus: (x, y) => {
          const before = progress;
          const wasGolden = hasAllBonuses(progress, summary);
          const bonus = bonuses.findIndex((p) => p.x === x && p.y === y);
          progress = recordBonus(progress, level.id, bonus);
          writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
          return {
            newlyGolden: !wasGolden && hasAllBonuses(progress, summary),
            collected: collectedBonuses(progress, level.id).length,
            allBonuses: completesAllBonuses(before, progress, LEVEL_SUMMARIES),
          };
        },
        onNext: () => (isLastLevel ? showTitle() : startLevel(index + 1)),
        onMenu: showTitle,
        onSkip: () => {
          progress = recordSkip(progress, level.id);
          writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
          if (isLastLevel) {
            showTitle();
          } else {
            startLevel(index + 1);
          }
        },
      });
    });
  };

  showTitle();
  window.addEventListener("resize", layout);
  bindKeyboard((action) => scene?.handleAction(action));
  app.ticker.add((ticker) => {
    background.update(ticker.deltaMS);
    scene?.update(ticker.deltaMS);
  });
})();
