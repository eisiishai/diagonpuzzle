import {
  EMPTY_PROGRESS,
  addLevelTime,
  collectedBonuses,
  completesAllBonuses,
  completesAllPar,
  earnsStar,
  hasAllBonuses,
  isCompleted,
  isSkipped,
  recordBonus,
  recordCompletion,
  recordSkip,
  returnSkip,
  spendSkip,
} from "./progress";
import type { LevelSummary, Progress } from "./progress";

/**
 * Time on level screens is saved this often, rather than every frame, so a
 * closed tab loses at most this much of the wait for a skip.
 */
export const SAVE_WAIT_EVERY_MS = 5000;

/** What a level screen needs to know from progress as it starts. */
export interface LevelStart {
  /**
   * The level's bonus targets are shown: it was completed at par before
   * this visit (on the visit that first reaches par, they appear from the
   * next restart; see CompletionReport). Collected ones are shown too, so
   * they can be hit again.
   */
  bonusesShown: boolean;
  /** The level's bonus targets collected before this visit. */
  bonusesCollected: number;
  /** The level was completed or skipped before this visit. */
  passedBefore: boolean;
  /** Visible skips left. */
  skipsLeft: number;
}

export interface CompletionReport {
  /** The level's best shot count before this completion, if any. */
  previousBest?: number;
  /** True if this completion earned the last star: every level is at par. */
  allLevelsAtPar: boolean;
  /** Skips left after one was given back for this, if one was. */
  skipReturned?: number;
  /**
   * The level is at par now, so its bonus targets show: from the next
   * restart in this visit, and on every later visit.
   */
  bonusesShown: boolean;
}

export interface BonusReport {
  /** True if this hit collected the level's last bonus target for the first time. */
  newlyGolden: boolean;
  /** The level's bonus targets collected so far, including this one. */
  collected: number;
  /** True if this was the last bonus target of the whole game. */
  allBonuses: boolean;
  /** Skips left after one was given back for this, if one was. */
  skipReturned?: number;
}

export interface LevelTimeReport {
  /** Skips left changed: a skip was earned back by waiting. */
  skipsChanged: boolean;
  /** The progress should be saved now. */
  save: boolean;
}

/**
 * The player's progress through the game, and the rules for how events in
 * play change it: completions, bonus targets, skips and the wait for a skip.
 * The only owner of the progress while the game runs; the caller reads and
 * writes storage and saves after every event, and after level time when
 * addLevelTime() says so. Levels are given by their index in `levels`.
 */
export class GameProgress {
  readonly levels: readonly LevelSummary[];
  private _progress: Progress;

  constructor(levels: readonly LevelSummary[], saved: Progress) {
    this.levels = levels;
    this._progress = saved;
  }

  get progress(): Progress {
    return this._progress;
  }

  levelStart(index: number): LevelStart {
    const { id } = this.levels[index];
    return {
      bonusesShown: this.atPar(index),
      bonusesCollected: collectedBonuses(this._progress, id).length,
      passedBefore:
        isCompleted(this._progress, id) || isSkipped(this._progress, id),
      skipsLeft: this._progress.skipsLeft,
    };
  }

  /**
   * Records a completion in `shots`. The first completion of a level gives
   * back a used skip.
   */
  complete(index: number, shots: number): CompletionReport {
    const before = this._progress;
    const result = recordCompletion(before, this.levels[index].id, shots);
    this._progress = result.progress;
    const skipReturned =
      result.previousBest === undefined ? this.giveBackSkip() : undefined;
    return {
      previousBest: result.previousBest,
      skipReturned,
      allLevelsAtPar: completesAllPar(before, this._progress, this.levels),
      bonusesShown: this.atPar(index),
    };
  }

  /** True if level `index` has been completed at par. */
  private atPar(index: number): boolean {
    const { id, minShots } = this.levels[index];
    const best = this._progress.levels[id]?.bestShots;
    return best !== undefined && earnsStar(best, minShots);
  }

  /**
   * Records a hit on bonus target `bonus` (its index in reading order).
   * Collecting one for the first time gives back a used skip.
   */
  collectBonus(index: number, bonus: number): BonusReport {
    const level = this.levels[index];
    const before = this._progress;
    this._progress = recordBonus(before, level.id, bonus);
    const skipReturned =
      this._progress !== before ? this.giveBackSkip() : undefined;
    return {
      skipReturned,
      newlyGolden:
        !hasAllBonuses(before, level) && hasAllBonuses(this._progress, level),
      collected: collectedBonuses(this._progress, level.id).length,
      allBonuses: completesAllBonuses(before, this._progress, this.levels),
    };
  }

  /** Skips a level with the visible Skip button, using one skip. */
  useSkip(index: number): void {
    this._progress = spendSkip(this._progress, this.levels[index].id);
  }

  /** Skips a level with the hidden skip, which uses none of the visible ones. */
  hiddenSkip(index: number): void {
    this._progress = recordSkip(this._progress, this.levels[index].id);
  }

  /**
   * Counts time on a level screen, which earns a skip back when none are
   * left. Asks for a save when a skip comes back, and every
   * SAVE_WAIT_EVERY_MS of waiting.
   */
  addLevelTime(ms: number): LevelTimeReport {
    const before = this._progress;
    this._progress = addLevelTime(before, ms);
    const skipsChanged = this._progress.skipsLeft !== before.skipsLeft;
    const waitSaves = (progress: Progress) =>
      Math.floor(progress.skipWaitMs / SAVE_WAIT_EVERY_MS);
    return {
      skipsChanged,
      save: skipsChanged || waitSaves(this._progress) !== waitSaves(before),
    };
  }

  /** Forgets all progress. */
  reset(): void {
    this._progress = EMPTY_PROGRESS;
  }

  /**
   * Gives back a used skip, if any were used; returns the skips left then,
   * or undefined if none was given back.
   */
  private giveBackSkip(): number | undefined {
    const after = returnSkip(this._progress);
    if (after === this._progress) {
      return undefined;
    }
    this._progress = after;
    return after.skipsLeft;
  }
}
