// What the test hook (src/testHook.ts) reports to the browser smoke tests
// in e2e/. Positions are in canvas pixels (CSS pixels from the canvas's top
// left corner), where a test can click or tap.

import type { LevelPhase } from "./game/LevelSession";
import type { CellType, Position } from "./game/types";
import type { LevelRowState } from "./scenes/scoreText";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ButtonTestState {
  label: string;
  disabled: boolean;
  /** The button's centre. */
  center: Point;
  /**
   * False for a button scrolled out of its list's view (its centre is
   * hidden), which has to be scrolled into view to be pressed.
   */
  inView: boolean;
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
  /** Centre of the level's name in the header (held, the hidden skip). */
  levelName: Point;
  /** Centre of each row's launcher, top row first. */
  launchers: Point[];
  /** `cells[y][x]`: board cell (x, y) by the rules, and its centre. */
  cells: { type: CellType; center: Point }[][];
  /**
   * `shown[y][x]`: board cell (x, y) as drawn, a mirror's direction read
   * from its rotation; null for a mirror still turning.
   */
  shown: (CellType | null)[][];
  /** The big celebration's banner text while it shows, else null. */
  banner: string | null;
}

export interface TitleTestState {
  /** The level list's header, e.g. "LEVELS  ·  ★ 2/18". */
  header: string;
  /** Each level's state and score text, first level first. */
  levels: { state: LevelRowState; detail: string }[];
  /** Each chapter's label, e.g. "01 BASICS ★ 5/5". */
  chapters: string[];
  /** The selected level's name and score, e.g. "1. First light · par 1". */
  detail: string;
  /** The part of the screen where the scrolling level list shows. */
  listView: Rect;
  /** The list's scroll bar, while it doesn't all fit. */
  scrollBar: { track: Rect; thumb: Rect } | null;
}

export interface TestState {
  scene: "title" | "level" | null;
  /** The scene's visible buttons, in drawing order. */
  buttons: ButtonTestState[];
  /** Only on a level screen. */
  level?: LevelTestState;
  /** Only on the title screen. */
  title?: TitleTestState;
}
