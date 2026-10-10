import { Application } from "pixi.js";
import { level01 } from "./levels/level01";
import { parseLevel } from "./levels/parse";
import { GameScene } from "./scenes/GameScene";

(async () => {
  const app = new Application();
  await app.init({ background: "#161a24", resizeTo: window, antialias: true });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const scene = new GameScene(parseLevel(level01));
  app.stage.addChild(scene);

  const layout = () => scene.layout(window.innerWidth, window.innerHeight);
  layout();
  window.addEventListener("resize", layout);
})();
