// Player-facing text about shots, par and stars. Pure, so it can be tested.

import type { MirrorType } from "../game/types";
import { earnsStar } from "../save/progress";

export const STAR = "★";

export function shotCount(shots: number): string {
  return shots === 1 ? "1 shot" : `${shots} shots`;
}

/**
 * The hint that every level at par is not the end: bonus targets now wait
 * in every level, unnamed so they stay a surprise.
 */
export const ALL_PAR_HINT = "Replay any level: something new awaits there.";

/**
 * Message shown when a level is completed. When it earned the last star
 * (`allAtPar`), the hint to replay levels takes the place of the
 * instruction to continue, so the message stays two lines long.
 */
export function completionMessage(
  shots: number,
  par: number,
  previousBest: number | undefined,
  allAtPar = false,
): string {
  const result = earnsStar(shots, par)
    ? `${STAR} Par! Level complete in ${shotCount(shots)}.`
    : `Level complete in ${shotCount(shots)}. Par is ${par}: try again for a ${STAR}.`;
  const next = allAtPar
    ? `Every level is at par! ${ALL_PAR_HINT}`
    : "Press Enter to continue.";
  return `${result}${bestText(shots, previousBest)} ${next}`;
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
  "locked" | "open" | "skipped" | "done" | "star" | "golden" | "prism";

/**
 * A level's row in the title screen's level list: its state (for the icon
 * column), its numbered name and the score text aligned on the right.
 * Golden: all its bonus targets collected (which needs a star first).
 * Prism: a level of the secret chapter, which has no bonus targets, at
 * par.
 */
export function levelListRow(
  number: number,
  name: string,
  par: number,
  unlocked: boolean,
  best: number | undefined,
  skipped = false,
  golden = false,
  secret = false,
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
  const star = earnsStar(best, par);
  const state = golden
    ? "golden"
    : star && secret
      ? "prism"
      : star
        ? "star"
        : "done";
  return { state, title, detail: `best ${best} / par ${par}` };
}

/** What decides a level's opening message. */
export interface IntroFacts {
  /** A bonus target is shown and not yet collected. */
  bonusToFind: boolean;
  /** The mirror the player may place, if the level gives one. */
  playerMirror?: MirrorType;
  /** Goal hits needed to complete the level. */
  goalHits: number;
  /** The level has breakable walls. */
  hasBreakable: boolean;
  /** The level has reflectors. */
  hasReflector: boolean;
  /** The level has glass mirrors. */
  hasGlass: boolean;
  /** The level has fixed mirrors. */
  hasFixed: boolean;
  /** The level has portals. */
  hasPortal: boolean;
  /** The level has one-way gates. */
  hasGate: boolean;
}

/**
 * The message shown when a level starts or restarts: about the newest thing
 * in it, in this order: a bonus target to find, one-way gates, portals, fixed mirrors, glass
 * mirrors, reflectors,
 * the player's mirror, a goal needing several hits, breakable walls; else how to play.
 */
export function introMessage(facts: IntroFacts): string {
  const {
    bonusToFind,
    playerMirror,
    goalHits,
    hasBreakable,
    hasReflector,
    hasGlass,
    hasFixed,
    hasPortal,
    hasGate,
  } = facts;
  if (bonusToFind) {
    return "A bonus target has appeared! Hitting it is optional and turns this level's star golden.";
  }
  if (hasGate) {
    return "One-way gates let the pellet through only the way their arrow points, and stop it from any other side.";
  }
  if (hasPortal) {
    return "Portals come in pairs: the pellet goes into one and comes out of the other, moving the same way.";
  }
  if (hasFixed) {
    return "Steel mirrors are bolted down: they turn the pellet but never flip.";
  }
  if (hasGlass) {
    return "Glass mirrors turn the pellet once, then shatter: later shots pass through.";
  }
  if (hasReflector) {
    return "Round reflectors send the pellet straight back, into the mirrors it has just flipped.";
  }
  if (playerMirror) {
    const symbol = playerMirror === "mirrorSlash" ? "/" : "\\";
    return `Place your ${symbol} mirror on any empty cell: click it, tap it twice, or press P. It takes no shot; only Restart takes it back.`;
  }
  if (goalHits > 1) {
    return `This goal needs ${goalHits} hits, each from a separate shot. Mirrors stay flipped between shots.`;
  }
  if (hasBreakable) {
    return "Cracked walls stop the pellet and break: the next shot passes through.";
  }
  return "Aim with ↑/↓ and fire with Enter, or click an emitter. Mirrors turn when hit.";
}

/**
 * The second hint's message (see docs/DESIGN.md, Hints): the framed
 * emitter fires a par solution's first shot, after placing the player's
 * mirror if `placeFirst`. `shotsFired` in this try: the hint is from the
 * starting board, so the player is asked to restart.
 */
export function firstShotHintMessage(
  placeFirst: boolean,
  shotsFired: number,
): string {
  const start = placeFirst
    ? "from the start, place your mirror, then fire the framed emitter first"
    : "from the start, fire the framed emitter first";
  return `Hint 2: ${start}: it begins a par solution.${shotsFired > 0 ? " Restart to try it." : ""}`;
}

/**
 * The hint button's label: the first hint until it is opened, then the
 * wait for the second (`waitLeftMs`, counted down in whole seconds), then
 * the second.
 */
export function hintLabel(stage: 0 | 1 | 2, waitLeftMs: number): string {
  if (stage === 0) {
    return "HINT · H";
  }
  if (stage === 2) {
    return "HINT 2 · H";
  }
  const seconds = Math.max(0, Math.ceil(waitLeftMs / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return `HINT 2 IN ${clock}`;
}
