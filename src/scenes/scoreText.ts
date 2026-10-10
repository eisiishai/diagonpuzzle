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

/** A level's line in the title screen's level list. */
export function levelListLabel(
  number: number,
  name: string,
  par: number,
  unlocked: boolean,
  best: number | undefined,
): string {
  const title = `${number}. ${name}`;
  if (!unlocked) {
    return `🔒 ${title}`;
  }
  if (best === undefined) {
    return `${title}  ·  par ${par}`;
  }
  const star = earnsStar(best, par) ? `  ${STAR}` : "";
  return `✓ ${title}  ·  best ${best} / par ${par}${star}`;
}
