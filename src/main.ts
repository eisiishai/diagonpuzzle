import { Application } from "pixi.js";
import { GameAudio } from "./audio/GameAudio";
import { bindKeyboard } from "./input/keyboard";
import { LEVELS } from "./levels/levels";
import { parseLevel } from "./levels/parse";
import { GameScene } from "./scenes/GameScene";

(async () => {
  const app = new Application();
  await app.init({ background: "#161a24", resizeTo: window, antialias: true });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Browsers only allow audio after a user gesture. Registered before the
  // keyboard binding so the audio is ready when the first action plays a sound.
  const audio = new GameAudio();
  window.addEventListener("pointerdown", () => audio.unlock());
  window.addEventListener("keydown", () => audio.unlock());

  let scene: GameScene | undefined;
  const layout = () => scene?.layout(window.innerWidth, window.innerHeight);

  const startLevel = (index: number) => {
    scene?.destroy({ children: true });
    const level = LEVELS[index];
    scene = new GameScene({
      board: parseLevel(level.grid),
      levelNumber: index + 1,
      levelCount: LEVELS.length,
      levelName: level.name,
      audio,
      // Deferred: onNext can be called from the old scene's own pointer
      // event, which should finish before that scene is destroyed.
      onNext: () =>
        queueMicrotask(() => startLevel((index + 1) % LEVELS.length)),
    });
    app.stage.addChild(scene);
    layout();
  };

  startLevel(0);
  window.addEventListener("resize", layout);
  bindKeyboard((action) => scene?.handleAction(action));
  app.ticker.add((ticker) => scene?.update(ticker.deltaMS));
})();
