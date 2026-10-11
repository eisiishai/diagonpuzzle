import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Application, Sprite } from "pixi.js";
import { GameAudio } from "./audio/GameAudio";
import { TITLE_MUSIC } from "./audio/music";
import { bonusPositions, withBonuses } from "./game/bonus";
import { bindKeyboard } from "./input/keyboard";
import { CHAPTERS, LEVELS, chapterRanges } from "./levels/levels";
import { parseLevel } from "./levels/parse";
import { GameProgress } from "./save/GameProgress";
import { MAX_SKIPS, parseProgress, serializeProgress } from "./save/progress";
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

const LEVEL_CHAPTERS = chapterRanges(LEVELS, CHAPTERS);
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

  const game = new GameProgress(
    LEVEL_SUMMARIES,
    parseProgress(readStorage(PROGRESS_STORAGE_KEY)),
  );
  const save = () =>
    writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(game.progress));
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
        chapters: LEVEL_CHAPTERS,
        summaries: LEVEL_SUMMARIES,
        progress: game.progress,
        audio,
        onStartLevel: startLevel,
        onResetProgress: () => {
          game.reset();
          removeStorage(PROGRESS_STORAGE_KEY);
          showTitle();
        },
      });
    }, "left");

  /** Time on level screens counts towards earning a skip back. */
  const countLevelTime = (gameScene: GameScene, deltaMs: number) => {
    const { skipsChanged, save: shouldSave } = game.addLevelTime(deltaMs);
    if (skipsChanged) {
      gameScene.setSkipsLeft(game.progress.skipsLeft);
    }
    if (shouldSave) {
      save();
    }
  };

  const startLevel = (index: number) => {
    const level = LEVELS[index];
    const isLastLevel = index === LEVELS.length - 1;
    const goToNext = () => (isLastLevel ? showTitle() : startLevel(index + 1));
    switchTo(() => {
      audio.setMusic(level.music);
      const fullBoard = parseLevel(level.grid);
      const bonuses = bonusPositions(fullBoard);
      const start = game.levelStart(index);
      return new GameScene({
        board: withBonuses(fullBoard, () => start.bonusesShown),
        levelNumber: index + 1,
        levelCount: LEVELS.length,
        levelName: level.name,
        par: level.minShots,
        goalHits: level.goalHits ?? 1,
        playerMirror: level.playerMirror,
        passedBefore: start.passedBefore,
        skipsLeft: start.skipsLeft,
        maxSkips: MAX_SKIPS,
        bonus: {
          shown: start.bonusesShown,
          total: bonuses.length,
          collected: start.bonusesCollected,
        },
        audio,
        onComplete: (shots) => {
          const report = game.complete(index, shots);
          save();
          return report;
        },
        onBonus: (x, y) => {
          const bonus = bonuses.findIndex((p) => p.x === x && p.y === y);
          const report = game.collectBonus(index, bonus);
          save();
          return report;
        },
        onNext: goToNext,
        onMenu: showTitle,
        onUseSkip: () => {
          game.useSkip(index);
          save();
          goToNext();
        },
        onSkip: () => {
          game.hiddenSkip(index);
          save();
          goToNext();
        },
      });
    });
  };

  // The browser smoke tests' view of the game (e2e/); not loaded otherwise.
  if (new URLSearchParams(window.location.search).has("e2e")) {
    const { installTestHook } = await import("./testHook");
    installTestHook(() => scene, app.ticker);
  }

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
