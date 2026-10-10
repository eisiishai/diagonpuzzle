import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Application, Sprite } from "pixi.js";
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
  MAX_SKIPS,
  addLevelTime,
  isCompleted,
  isSkipped,
  returnSkip,
  spendSkip,
  parseProgress,
  recordBonus,
  recordCompletion,
  recordSkip,
  serializeProgress,
} from "./save/progress";
import type { LevelSummary } from "./save/progress";
import { BackgroundGrid } from "./render/BackgroundGrid";
import { vignetteTexture } from "./render/glow";
import { SceneTransition } from "./render/SceneTransition";
import { setButtonTapSound } from "./render/ui";
import type { WipeDirection } from "./render/SceneTransition";
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
  setButtonTapSound(() => audio.play("click"));

  let progress = parseProgress(readStorage(PROGRESS_STORAGE_KEY));
  let scene: Scene | undefined;
  // The drifting grid stays at the back; scenes are added on top of it.
  const background = new BackgroundGrid(app.renderer.resolution);
  app.stage.addChild(background);
  // A soft vignette over the background grid, under every scene.
  const vignette = new Sprite(vignetteTexture());
  app.stage.addChild(vignette);
  // The beam wipe between scenes, kept above them.
  const transition = new SceneTransition();
  app.stage.addChild(transition);
  const layout = () => {
    background.resize(window.innerWidth, window.innerHeight);
    vignette.width = window.innerWidth;
    vignette.height = window.innerHeight;
    transition.resize(window.innerWidth, window.innerHeight);
    scene?.layout(window.innerWidth, window.innerHeight);
  };

  // Deferred: a switch is usually requested from the old scene's own pointer
  // or key event, which should finish before that scene is destroyed. The
  // new scene takes input at once; the old one stays on screen until the
  // wipe has passed it.
  const switchTo = (
    createScene: () => Scene,
    direction: WipeDirection = "right",
  ) =>
    queueMicrotask(() => {
      const old = scene;
      scene = createScene();
      app.stage.addChildAt(scene, app.stage.getChildIndex(transition));
      layout();
      if (old) {
        transition.start(old, scene, direction);
      }
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
    }, "left");

  /**
   * Gives back a used skip, if any were used; returns the skips left then,
   * or undefined if none was given back.
   */
  const giveBackSkip = (): number | undefined => {
    const after = returnSkip(progress);
    if (after === progress) {
      return undefined;
    }
    progress = after;
    return progress.skipsLeft;
  };

  /**
   * Time on level screens earns a skip back when none are left. Saved every
   * few seconds rather than every frame.
   */
  const SAVE_WAIT_EVERY_MS = 5000;
  const countLevelTime = (gameScene: GameScene, deltaMs: number) => {
    const before = progress;
    progress = addLevelTime(progress, deltaMs);
    if (progress.skipsLeft !== before.skipsLeft) {
      gameScene.setSkipsLeft(progress.skipsLeft);
      writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
    } else if (
      Math.floor(progress.skipWaitMs / SAVE_WAIT_EVERY_MS) !==
      Math.floor(before.skipWaitMs / SAVE_WAIT_EVERY_MS)
    ) {
      writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
    }
  };

  const startLevel = (index: number) => {
    const level = LEVELS[index];
    const summary = LEVEL_SUMMARIES[index];
    const isLastLevel = index === LEVELS.length - 1;
    const skipLevel = (skipped: typeof progress) => {
      progress = skipped;
      writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
      if (isLastLevel) {
        showTitle();
      } else {
        startLevel(index + 1);
      }
    };
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
        playerMirror: level.playerMirror,
        passedBefore:
          isCompleted(progress, level.id) || isSkipped(progress, level.id),
        skipsLeft: progress.skipsLeft,
        maxSkips: MAX_SKIPS,
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
          // The first completion of a level gives back a used skip.
          const skipReturned =
            result.previousBest === undefined ? giveBackSkip() : undefined;
          writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
          return {
            previousBest: result.previousBest,
            skipReturned,
            allLevelsAtPar: completesAllPar(before, progress, LEVELS),
          };
        },
        onBonus: (x, y) => {
          const before = progress;
          const wasGolden = hasAllBonuses(progress, summary);
          const bonus = bonuses.findIndex((p) => p.x === x && p.y === y);
          progress = recordBonus(progress, level.id, bonus);
          // So does collecting a bonus target for the first time.
          const skipReturned = progress !== before ? giveBackSkip() : undefined;
          writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(progress));
          return {
            skipReturned,
            newlyGolden: !wasGolden && hasAllBonuses(progress, summary),
            collected: collectedBonuses(progress, level.id).length,
            allBonuses: completesAllBonuses(before, progress, LEVEL_SUMMARIES),
          };
        },
        onNext: () => (isLastLevel ? showTitle() : startLevel(index + 1)),
        onMenu: showTitle,
        onUseSkip: () => skipLevel(spendSkip(progress, level.id)),
        // The hidden debug skip uses none of the visible skips.
        onSkip: () => skipLevel(recordSkip(progress, level.id)),
      });
    });
  };

  showTitle();
  window.addEventListener("resize", layout);
  bindKeyboard((action) => scene?.handleAction(action));
  app.ticker.add((ticker) => {
    background.update(ticker.deltaMS);
    transition.update(ticker.deltaMS);
    scene?.update(ticker.deltaMS);
    if (scene instanceof GameScene) {
      countLevelTime(scene, ticker.deltaMS);
    }
  });
})();
