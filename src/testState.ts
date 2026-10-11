// What the test hook (src/testHook.ts) reports to the browser smoke tests
// in e2e/. Positions are in canvas pixels (CSS pixels from the canvas's top
// left corner), where a test can click or tap.

import type { LevelPhase } from "./game/LevelSession";
import type { CellType, Position } from "./game/types";

export interface Point {
  x: number;
  y: number;
}

export interface ButtonTestState {
  label: string;
  disabled: boolean;
  /** The button's centre. */
  center: Point;
}

export interface LevelTestState {
  /** 1 for the first level. */
  number: number;
  phase: LevelPhase;
  shots: number;
  hits: number;
  goalHits: number;
  selectedRow: number;
  mirrorInHand: boolean;
  /** Where the player's mirror would go, while choosing its cell. */
  placementPreview: Position | null;
  message: string;
  /** Centre of each row's launcher, top row first. */
  launchers: Point[];
  /** `cells[y][x]`: board cell (x, y) by the rules, and its centre. */
  cells: { type: CellType; center: Point }[][];
  /**
   * `shown[y][x]`: board cell (x, y) as drawn, a mirror's direction read
   * from its rotation; null for a mirror still turning.
   */
  shown: (CellType | null)[][];
}

export interface TestState {
  scene: "title" | "level" | null;
  /** The scene's visible buttons, in drawing order. */
  buttons: ButtonTestState[];
  /** Only on a level screen. */
  level?: LevelTestState;
}
