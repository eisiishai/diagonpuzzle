import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import { Application, Sprite } from "pixi.js";
import { GameAudio } from "./audio/GameAudio";
import { TITLE_MUSIC } from "./audio/music";
import { bonusIndexAt, bonusPositions, withBonuses } from "./game/bonus";
import { bindKeyboard } from "./input/keyboard";
import { CHAPTERS, LEVELS, chapterRanges, secretLevels } from "./levels/levels";
import { parseLevel } from "./levels/parse";
import { GameProgress } from "./save/GameProgress";
import {
  EMPTY_PROGRESS,
  MAX_SKIPS,
  parseProgress,
  serializeProgress,
} from "./save/progress";
import { parseSetup, setupNotice, testSetup } from "./save/testSetup";
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
/** The player's own progress while a test setup replaces it. */
const BACKUP_STORAGE_KEY = "progress.beforeSetup";

const LEVEL_CHAPTERS = chapterRanges(LEVELS, CHAPTERS);
const SECRET_LEVELS = secretLevels(LEVEL_CHAPTERS);
const LEVEL_SUMMARIES: readonly LevelSummary[] = LEVELS.map((level, i) => ({
  id: level.id,
  minShots: level.minShots,
  bonusCount: bonusPositions(parseLevel(level.grid)).length,
  ...(SECRET_LEVELS[i] ? { secret: true } : {}),
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

  let notice = applyTestSetup();
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

  // The secret chapter is left out of both screens until it opens.
  const showTitle = () =>
    switchTo(() => {
      audio.setMusic(TITLE_MUSIC);
      const open = game.openLevelCount;
      return new TitleScene({
        levels: LEVELS.slice(0, open),
        chapters: LEVEL_CHAPTERS.filter(({ start }) => start < open),
        summaries: game.openLevels,
        progress: game.progress,
        audio,
        notice,
        onStartLevel: startLevel,
        onResetProgress: () => {
          notice = undefined;
          game.reset();
          removeStorage(PROGRESS_STORAGE_KEY);
          showTitle();
        },
      });
    }, "left");

  /** The level on screen, while a level screen shows. */
  let levelIndex = 0;

  /**
   * Time on level screens counts towards earning a skip back, and on a
   * level's screen towards its second hint.
   */
  const countLevelTime = (gameScene: GameScene, deltaMs: number) => {
    const {
      skipsChanged,
      hintOpened,
      save: shouldSave,
    } = game.addLevelTime(levelIndex, deltaMs);
    if (skipsChanged) {
      gameScene.setSkipsLeft(game.progress.skipsLeft);
    }
    gameScene.setHintWaitLeft(game.hintWaitLeft(levelIndex));
    gameScene.setSkipWait(game.progress.skipWaitMs);
    if (hintOpened) {
      gameScene.openSecondHint();
    }
    if (shouldSave) {
      save();
    }
  };

  const startLevel = (index: number) => {
    const level = LEVELS[index];
    const levelCount = game.openLevelCount;
    const isLastLevel = index === levelCount - 1;
    const goToNext = () => (isLastLevel ? showTitle() : startLevel(index + 1));
    switchTo(() => {
      audio.setMusic(level.music);
      const fullBoard = parseLevel(level.grid);
      const start = game.levelStart(index);
      levelIndex = index;
      return new GameScene({
        board: withBonuses(fullBoard, () => start.bonusesShown),
        levelNumber: index + 1,
        levelCount,
        levelName: level.name,
        par: level.minShots,
        goalHits: level.goalHits ?? 1,
        playerMirror: level.playerMirror,
        passedBefore: start.passedBefore,
        skipsLeft: start.skipsLeft,
        maxSkips: MAX_SKIPS,
        bonus: {
          shown: start.bonusesShown,
          total: LEVEL_SUMMARIES[index].bonusCount,
          collected: start.bonusesCollected,
          board: fullBoard,
        },
        hint: {
          text: level.hint,
          stage: start.hintStage,
          waitLeftMs: start.hintWaitLeft,
        },
        audio,
        onOpenHint: () => {
          game.openHint(index);
          save();
        },
        onComplete: (shots) => {
          const report = game.complete(index, shots);
          save();
          return report;
        },
        onBonus: (x, y) => {
          const bonus = bonusIndexAt(fullBoard, { x, y });
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

/**
 * A test setup from the page address (`?setup=all-par`, `all-bonus`,
 * `prism` or `restore`; see src/save/testSetup.ts): after the player
 * confirms, replaces the saved progress, keeping the player's own under
 * another key until `?setup=restore` puts it back. The value is taken out
 * of the address, so a reload doesn't apply it again. Returns the step the
 * setup leaves, for the title screen.
 */
function applyTestSetup(): string | undefined {
  const url = new URL(window.location.href);
  const setup = parseSetup(url.searchParams.get("setup"));
  url.searchParams.delete("setup");
  window.history.replaceState(null, "", url);
  if (setup === "restore") {
    const backup = readStorage(BACKUP_STORAGE_KEY);
    if (backup === null) {
      window.alert("There is no progress from before a test setup to restore.");
    } else if (
      window.confirm("Restore your progress from before the test setup?")
    ) {
      writeStorage(PROGRESS_STORAGE_KEY, backup);
      removeStorage(BACKUP_STORAGE_KEY);
    }
    return undefined;
  }
  if (
    setup === null ||
    !window.confirm(
      `Replace your saved progress with the test setup "${setup}"? ` +
        "Your own progress is kept and comes back with ?setup=restore.",
    )
  ) {
    return undefined;
  }
  // Only the first setup keeps a backup: a later one would keep a test
  // setup's progress instead of the player's.
  if (readStorage(BACKUP_STORAGE_KEY) === null) {
    writeStorage(
      BACKUP_STORAGE_KEY,
      readStorage(PROGRESS_STORAGE_KEY) ?? serializeProgress(EMPTY_PROGRESS),
    );
  }
  const levels = LEVELS.map((level, i) => ({
    ...level,
    secret: SECRET_LEVELS[i],
  }));
  const result = testSetup(setup, levels);
  writeStorage(PROGRESS_STORAGE_KEY, serializeProgress(result.progress));
  return setupNotice(result);
}
