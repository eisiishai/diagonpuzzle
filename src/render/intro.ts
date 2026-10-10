// Timing of the board building in as a level starts (the column sweep):
// the panel fades in, emitters slide in, cells pop in column by column from
// the left and the goal ignites last. See docs/DESIGN.md, Light and motion.

import { clamp01, easeOutBack, easeOutCubic } from "./easing";

const PANEL_FADE_MS = 160;
const LAUNCHER_STAGGER_MS = 35;
const LAUNCHER_SLIDE_MS = 260;
/** Launchers slide in from this far left, in cells. */
const LAUNCHER_SLIDE_CELLS = 0.4;
const CELLS_START_MS = 220;
const COLUMN_MS = 50;
const POP_MS = 230;
/** Cells pop in from this scale, overshoot slightly and settle at 1. */
const POP_FROM_SCALE = 0.55;
const GOAL_DELAY_MS = 120;
const GOAL_IGNITE_MS = 300;
/** The goal ignites from this scale, shrinking back to 1. */
const GOAL_FROM_SCALE = 1.35;

/** How a piece looks at a moment of the intro. */
export interface IntroLook {
  alpha: number;
  scale: number;
}

/** The panel and grid fade in first. */
export function introPanelAlpha(timeMs: number): number {
  return easeOutCubic(timeMs / PANEL_FADE_MS);
}

/**
 * The emitter of `row` slides in from the left, a little after the one
 * above it; `offset` is in cells (negative: left of its place).
 */
export function introLauncher(
  timeMs: number,
  row: number,
): { alpha: number; offset: number } {
  const t = (timeMs - row * LAUNCHER_STAGGER_MS) / LAUNCHER_SLIDE_MS;
  return {
    alpha: clamp01(t * 1.5),
    offset: -LAUNCHER_SLIDE_CELLS * (1 - easeOutCubic(t)),
  };
}

/** A cell in board column `column` pops in, one column after another. */
export function introCell(timeMs: number, column: number): IntroLook {
  const t = (timeMs - CELLS_START_MS - column * COLUMN_MS) / POP_MS;
  if (t <= 0) {
    return { alpha: 0, scale: POP_FROM_SCALE };
  }
  return {
    alpha: clamp01(t * 1.6),
    scale: POP_FROM_SCALE + (1 - POP_FROM_SCALE) * easeOutBack(t),
  };
}

/** When the goal ignites on a board `boardWidth` columns wide. */
export function introGoalStartMs(boardWidth: number): number {
  return CELLS_START_MS + boardWidth * COLUMN_MS + GOAL_DELAY_MS;
}

/** The goal stays dark until every column is in, then ignites. */
export function introGoal(timeMs: number, boardWidth: number): IntroLook {
  const t = (timeMs - introGoalStartMs(boardWidth)) / GOAL_IGNITE_MS;
  if (t <= 0) {
    return { alpha: 0, scale: GOAL_FROM_SCALE };
  }
  return {
    alpha: clamp01(t * 3),
    scale: 1 + (GOAL_FROM_SCALE - 1) * (1 - easeOutCubic(t)),
  };
}

/** How long the whole intro lasts on a board `boardWidth` columns wide. */
export function introLengthMs(boardWidth: number): number {
  return introGoalStartMs(boardWidth) + GOAL_IGNITE_MS;
}
