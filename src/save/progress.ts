// Player progress: which levels are completed and the best shot count for
// each, which levels were skipped, which bonus targets were collected, and
// how many visible skips are left, and which levels' hints were opened.
// Pure functions; reading and writing storage is done by the caller.

export interface LevelProgress {
  bestShots: number;
}

export interface Progress {
  /** Keyed by level id; a level is completed when it has an entry. */
  readonly levels: Readonly<Partial<Record<string, LevelProgress>>>;
  /**
   * Ids of levels skipped without completing them (with the hidden skip).
   * A skipped level is not passed, but unlocks the level after it.
   */
  readonly skipped: readonly string[];
  /**
   * Collected bonus targets, keyed by level id: indices into the level's
   * bonus targets in reading order (see bonusPositions()). Kept apart from
   * completion and best scores.
   */
  readonly bonuses: Readonly<Partial<Record<string, readonly number[]>>>;
  /**
   * Visible skips left (the Skip button), 0 to MAX_SKIPS. The hidden debug
   * skip doesn't use them.
   */
  readonly skipsLeft: number;
  /**
   * Time spent on level screens since the last skip was used, counted only
   * while none are left; reaching SKIP_WAIT_MS gives one back.
   */
  readonly skipWaitMs: number;
  /**
   * Levels whose text hint was opened, keyed by level id: time spent on
   * the level's screen since then, up to HINT_WAIT_MS, which opens the
   * second hint (see docs/DESIGN.md, Hints).
   */
  readonly hints: Readonly<Partial<Record<string, number>>>;
}

/** Visible skips a player starts with and can hold at most. */
export const MAX_SKIPS = 3;

/** Time on level screens with no skips left that earns one back. */
export const SKIP_WAIT_MS = 5 * 60 * 1000;

/** Time on a level's screen after opening its text hint that opens the second. */
export const HINT_WAIT_MS = 2 * 60 * 1000;

/** What progress needs to know about a level for stars and bonus targets. */
export interface LevelSummary {
  id: string;
  minShots: number;
  /** Number of bonus targets in the level. */
  bonusCount: number;
  /** In a secret chapter; secret levels come after all the others. */
  secret?: boolean;
}

export const EMPTY_PROGRESS: Progress = {
  levels: {},
  skipped: [],
  bonuses: {},
  skipsLeft: MAX_SKIPS,
  skipWaitMs: 0,
  hints: {},
};

const FORMAT_VERSION = 1;

export interface CompletionResult {
  progress: Progress;
  /** Best shot count before this completion, if the level was completed before. */
  previousBest?: number;
}

export function recordCompletion(
  progress: Progress,
  levelId: string,
  shots: number,
): CompletionResult {
  const previousBest = progress.levels[levelId]?.bestShots;
  const bestShots =
    previousBest === undefined ? shots : Math.min(previousBest, shots);
  return {
    progress: {
      ...progress,
      levels: { ...progress.levels, [levelId]: { bestShots } },
      skipped: progress.skipped.filter((id) => id !== levelId),
    },
    previousBest,
  };
}

/**
 * Marks a level as skipped. A level that is already completed stays
 * completed, so skipping it again changes nothing.
 */
export function recordSkip(progress: Progress, levelId: string): Progress {
  if (isCompleted(progress, levelId) || isSkipped(progress, levelId)) {
    return progress;
  }
  return { ...progress, skipped: [...progress.skipped, levelId] };
}

/**
 * Skips a level with the visible Skip button: marks it skipped and uses one
 * of the skips left. Unchanged if none are left, or if the level is already
 * completed or skipped (it needs no skip then).
 */
export function spendSkip(progress: Progress, levelId: string): Progress {
  if (
    progress.skipsLeft <= 0 ||
    isCompleted(progress, levelId) ||
    isSkipped(progress, levelId)
  ) {
    return progress;
  }
  return {
    ...recordSkip(progress, levelId),
    skipsLeft: progress.skipsLeft - 1,
    skipWaitMs: 0,
  };
}

/** Gives back one used skip, up to MAX_SKIPS. */
export function returnSkip(progress: Progress): Progress {
  return progress.skipsLeft >= MAX_SKIPS
    ? progress
    : { ...progress, skipsLeft: progress.skipsLeft + 1, skipWaitMs: 0 };
}

/**
 * Counts `ms` spent on a level screen. With no skips left, SKIP_WAIT_MS of
 * it gives one back; otherwise nothing changes.
 */
export function addLevelTime(progress: Progress, ms: number): Progress {
  if (progress.skipsLeft > 0) {
    return progress;
  }
  const skipWaitMs = progress.skipWaitMs + ms;
  return skipWaitMs >= SKIP_WAIT_MS
    ? returnSkip(progress)
    : { ...progress, skipWaitMs };
}

/**
 * How far a level's hints are open: 0 none, 1 the text hint, 2 also the
 * first shot of a par solution.
 */
export function hintStage(progress: Progress, levelId: string): 0 | 1 | 2 {
  const waited = progress.hints[levelId];
  if (waited === undefined) {
    return 0;
  }
  return waited >= HINT_WAIT_MS ? 2 : 1;
}

/** Time on the level's screen left before its second hint opens. */
export function hintWaitLeft(progress: Progress, levelId: string): number {
  return HINT_WAIT_MS - (progress.hints[levelId] ?? 0);
}

/** Opens a level's text hint, which starts the wait for the second. */
export function openHint(progress: Progress, levelId: string): Progress {
  return progress.hints[levelId] !== undefined
    ? progress
    : { ...progress, hints: { ...progress.hints, [levelId]: 0 } };
}

/**
 * Counts `ms` spent on a level's screen towards its second hint, if its
 * text hint is open and the second isn't yet.
 */
export function addHintTime(
  progress: Progress,
  levelId: string,
  ms: number,
): Progress {
  const waited = progress.hints[levelId];
  if (waited === undefined || waited >= HINT_WAIT_MS) {
    return progress;
  }
  return {
    ...progress,
    hints: {
      ...progress.hints,
      [levelId]: Math.min(HINT_WAIT_MS, waited + ms),
    },
  };
}

export function isSkipped(progress: Progress, levelId: string): boolean {
  return progress.skipped.includes(levelId);
}

export function isCompleted(progress: Progress, levelId: string): boolean {
  return progress.levels[levelId] !== undefined;
}

/**
 * The first level is always unlocked; each other one once the previous is
 * completed or skipped. A level already completed or skipped always stays
 * unlocked, even if levels before it are not (e.g. after levels are added
 * or reordered).
 */
export function isUnlocked(
  progress: Progress,
  levelIds: readonly string[],
  index: number,
): boolean {
  const passed = (id: string) =>
    isCompleted(progress, id) || isSkipped(progress, id);
  return index === 0 || passed(levelIds[index]) || passed(levelIds[index - 1]);
}

/**
 * Index of the level to continue from: the first one neither completed nor
 * skipped, else the first skipped one, else 0 when all are completed.
 */
export function nextLevelIndex(
  progress: Progress,
  levelIds: readonly string[],
): number {
  const fresh = levelIds.findIndex(
    (id) => !isCompleted(progress, id) && !isSkipped(progress, id),
  );
  if (fresh !== -1) {
    return fresh;
  }
  const skipped = levelIds.findIndex((id) => !isCompleted(progress, id));
  return skipped === -1 ? 0 : skipped;
}

/** A level earns a star when completed in par (its minimum shot count). */
export function earnsStar(shots: number, par: number): boolean {
  return shots <= par;
}

/** Number of levels completed in par. */
export function starCount(
  progress: Progress,
  levels: readonly { id: string; minShots: number }[],
): number {
  return levels.filter((level) => {
    const best = progress.levels[level.id]?.bestShots;
    return best !== undefined && earnsStar(best, level.minShots);
  }).length;
}

/**
 * True when going from `before` to `after` earned the last missing star, so
 * every level is now completed in par.
 */
export function completesAllPar(
  before: Progress,
  after: Progress,
  levels: readonly { id: string; minShots: number }[],
): boolean {
  return (
    starCount(before, levels) < levels.length &&
    starCount(after, levels) === levels.length
  );
}

/** Records that bonus target `index` of a level was hit. */
export function recordBonus(
  progress: Progress,
  levelId: string,
  index: number,
): Progress {
  const collected = collectedBonuses(progress, levelId);
  if (collected.includes(index)) {
    return progress;
  }
  return {
    ...progress,
    bonuses: { ...progress.bonuses, [levelId]: [...collected, index] },
  };
}

/** Indices of the level's bonus targets collected so far. */
export function collectedBonuses(
  progress: Progress,
  levelId: string,
): readonly number[] {
  return progress.bonuses[levelId] ?? [];
}

/**
 * True when the level has bonus targets and all are collected: its star
 * turns golden.
 */
export function hasAllBonuses(
  progress: Progress,
  level: Pick<LevelSummary, "id" | "bonusCount">,
): boolean {
  const collected = collectedBonuses(progress, level.id);
  return (
    level.bonusCount > 0 &&
    Array.from({ length: level.bonusCount }, (_, i) => i).every((i) =>
      collected.includes(i),
    )
  );
}

/** Number of levels with all their bonus targets collected (golden stars). */
export function goldenStarCount(
  progress: Progress,
  levels: readonly LevelSummary[],
): number {
  return levels.filter((level) => hasAllBonuses(progress, level)).length;
}

/** Number of levels that have bonus targets. */
export function bonusLevelCount(levels: readonly LevelSummary[]): number {
  return levels.filter((level) => level.bonusCount > 0).length;
}

/** True once every bonus target of the game is collected (and there are some). */
export function hasFoundAllBonuses(
  progress: Progress,
  levels: readonly LevelSummary[],
): boolean {
  const total = bonusLevelCount(levels);
  return total > 0 && goldenStarCount(progress, levels) === total;
}

/**
 * True when going from `before` to `after` collected the last bonus target
 * of the whole game.
 */
export function completesAllBonuses(
  before: Progress,
  after: Progress,
  levels: readonly LevelSummary[],
): boolean {
  return (
    !hasFoundAllBonuses(before, levels) && hasFoundAllBonuses(after, levels)
  );
}

/**
 * How many levels, from the first, are in the game for this player: the
 * secret ones (at the end) only once every bonus target of the others is
 * found, and from then on.
 */
export function openLevelCount(
  progress: Progress,
  levels: readonly LevelSummary[],
): number {
  const main = levels.filter((level) => !level.secret);
  return hasFoundAllBonuses(progress, main) ? levels.length : main.length;
}

/**
 * True when going from `before` to `after` opened the secret levels (there
 * are some).
 */
export function opensSecretLevels(
  before: Progress,
  after: Progress,
  levels: readonly LevelSummary[],
): boolean {
  return (
    openLevelCount(before, levels) < levels.length &&
    openLevelCount(after, levels) === levels.length
  );
}

/**
 * True when there are secret levels in `levels` and all of them are at
 * par: with every bonus target found, the whole game is done.
 */
export function hasSecretLevelsAtPar(
  progress: Progress,
  levels: readonly LevelSummary[],
): boolean {
  const secret = levels.filter((level) => level.secret);
  return secret.length > 0 && starCount(progress, secret) === secret.length;
}

/**
 * True when going from `before` to `after` earned the last missing star of
 * the secret levels (there are some), so all of them are at par.
 */
export function completesSecretPar(
  before: Progress,
  after: Progress,
  levels: readonly LevelSummary[],
): boolean {
  const secret = levels.filter((level) => level.secret);
  return secret.length > 0 && completesAllPar(before, after, secret);
}

export function serializeProgress(progress: Progress): string {
  return JSON.stringify({
    version: FORMAT_VERSION,
    levels: progress.levels,
    skipped: progress.skipped,
    bonuses: progress.bonuses,
    skipsLeft: progress.skipsLeft,
    skipWaitMs: progress.skipWaitMs,
    hints: progress.hints,
  });
}

/** Parses saved progress; anything missing or malformed gives empty progress. */
export function parseProgress(json: string | null): Progress {
  if (json === null) {
    return EMPTY_PROGRESS;
  }
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("version" in data) ||
    data.version !== FORMAT_VERSION ||
    !("levels" in data) ||
    typeof data.levels !== "object" ||
    data.levels === null
  ) {
    return EMPTY_PROGRESS;
  }

  const levels: Record<string, LevelProgress> = {};
  for (const [id, entry] of Object.entries(data.levels)) {
    const bestShots: unknown = entry?.bestShots;
    if (
      typeof bestShots === "number" &&
      Number.isInteger(bestShots) &&
      bestShots > 0
    ) {
      levels[id] = { bestShots };
    }
  }

  // Saves from before skipping existed have no "skipped" list.
  const skipped =
    "skipped" in data && Array.isArray(data.skipped)
      ? data.skipped.filter(
          (id): id is string => typeof id === "string" && !(id in levels),
        )
      : [];

  // Saves from before bonus targets existed have no "bonuses".
  const bonuses: Record<string, number[]> = {};
  if (
    "bonuses" in data &&
    typeof data.bonuses === "object" &&
    data.bonuses !== null
  ) {
    for (const [id, entry] of Object.entries(data.bonuses)) {
      if (Array.isArray(entry)) {
        const indices = entry.filter(
          (index): index is number => Number.isInteger(index) && index >= 0,
        );
        bonuses[id] = [...new Set(indices)];
      }
    }
  }
  // Saves from before visible skips existed start with all of them.
  const skipsLeft =
    "skipsLeft" in data &&
    typeof data.skipsLeft === "number" &&
    Number.isInteger(data.skipsLeft)
      ? Math.max(0, Math.min(MAX_SKIPS, data.skipsLeft))
      : MAX_SKIPS;
  const skipWaitMs =
    "skipWaitMs" in data &&
    typeof data.skipWaitMs === "number" &&
    Number.isFinite(data.skipWaitMs)
      ? Math.max(0, Math.min(SKIP_WAIT_MS, data.skipWaitMs))
      : 0;
  // Saves from before hints existed have none open.
  const hints: Record<string, number> = {};
  if (
    "hints" in data &&
    typeof data.hints === "object" &&
    data.hints !== null &&
    !Array.isArray(data.hints)
  ) {
    for (const [id, waited] of Object.entries(data.hints)) {
      if (typeof waited === "number" && Number.isFinite(waited)) {
        hints[id] = Math.max(0, Math.min(HINT_WAIT_MS, waited));
      }
    }
  }
  return { levels, skipped, bonuses, skipsLeft, skipWaitMs, hints };
}
