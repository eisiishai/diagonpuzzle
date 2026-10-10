// Player-facing text about shots, par and stars. Pure, so it can be tested.

import { earnsStar } from "../save/progress";

export const STAR = "★";

export function shotCount(shots: number): string {
  return shots === 1 ? "1 shot" : `${shots} shots`;
}

/** Message shown when a level is completed. */
export function completionMessage(
  shots: number,
  par: number,
  previousBest: number | undefined,
): string {
  const result = earnsStar(shots, par)
    ? `${STAR} Par! Level complete in ${shotCount(shots)}.`
    : `Level complete in ${shotCount(shots)}. Par is ${par}: try again for a ${STAR}.`;
  return `${result}${bestText(shots, previousBest)} Press Enter to continue.`;
}

function bestText(shots: number, previousBest: number | undefined): string {
  if (previousBest === undefined) {
    return "";
  }
  if (shots < previousBest) {
    return ` New best! (was ${previousBest})`;
  }
  return ` Best: ${shotCount(previousBest)}.`;
}

/** A level's state in the title screen's level list, shown as an icon. */
export type LevelRowState =
  "locked" | "open" | "skipped" | "done" | "star" | "golden";

/**
 * A level's row in the title screen's level list: its state (for the icon
 * column), its numbered name and the score text aligned on the right.
 * Golden: all its bonus targets collected (which needs a star first).
 */
export function levelListRow(
  number: number,
  name: string,
  par: number,
  unlocked: boolean,
  best: number | undefined,
  skipped = false,
  golden = false,
): { state: LevelRowState; title: string; detail: string } {
  const title = `${number}. ${name}`;
  if (!unlocked) {
    return { state: "locked", title, detail: "" };
  }
  if (best === undefined) {
    return skipped
      ? { state: "skipped", title, detail: `skipped · par ${par}` }
      : { state: "open", title, detail: `par ${par}` };
  }
  const state = golden ? "golden" : earnsStar(best, par) ? "star" : "done";
  return { state, title, detail: `best ${best} / par ${par}` };
}
