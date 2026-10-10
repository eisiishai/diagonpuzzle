// Player progress: which levels are completed and the best shot count for
// each, and which levels were skipped. Pure functions; reading and writing
// storage is done by the caller.

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
}

export const EMPTY_PROGRESS: Progress = { levels: {}, skipped: [] };

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

export function isSkipped(progress: Progress, levelId: string): boolean {
  return progress.skipped.includes(levelId);
}

export function isCompleted(progress: Progress, levelId: string): boolean {
  return progress.levels[levelId] !== undefined;
}

/**
 * The first level is always unlocked; each other one once the previous is
 * completed or skipped.
 */
export function isUnlocked(
  progress: Progress,
  levelIds: readonly string[],
  index: number,
): boolean {
  if (index === 0) {
    return true;
  }
  const previous = levelIds[index - 1];
  return isCompleted(progress, previous) || isSkipped(progress, previous);
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

export function serializeProgress(progress: Progress): string {
  return JSON.stringify({
    version: FORMAT_VERSION,
    levels: progress.levels,
    skipped: progress.skipped,
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
  return { levels, skipped };
}
