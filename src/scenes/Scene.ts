import type { Container } from "pixi.js";
import type { GameAction } from "../input/keyboard";

/** A full screen of the game, such as the title screen or a level. */
export interface Scene extends Container {
  /** Positions the scene in a screen of the given size. */
  layout(screenWidth: number, screenHeight: number): void;
  handleAction(action: GameAction): void;
  update(deltaMs: number): void;
}
