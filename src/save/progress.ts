// Player progress: which levels are completed and the best shot count for
// each. Pure functions; reading and writing storage is done by the caller.

export interface LevelProgress {
  bestShots: number;
}

export interface Progress {
  /** Keyed by level id; a level is completed when it has an entry. */
  readonly levels: Readonly<Partial<Record<string, LevelProgress>>>;
}

export const EMPTY_PROGRESS: Progress = { levels: {} };

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
    progress: { levels: { ...progress.levels, [levelId]: { bestShots } } },
    previousBest,
  };
}

export function isCompleted(progress: Progress, levelId: string): boolean {
  return progress.levels[levelId] !== undefined;
}

/** The first level is always unlocked; each other one once the previous is completed. */
export function isUnlocked(
  progress: Progress,
  levelIds: readonly string[],
  index: number,
): boolean {
  return index === 0 || isCompleted(progress, levelIds[index - 1]);
}

/** Index of the first level not yet completed, or 0 if all are. */
export function nextLevelIndex(
  progress: Progress,
  levelIds: readonly string[],
): number {
  const index = levelIds.findIndex((id) => !isCompleted(progress, id));
  return index === -1 ? 0 : index;
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
  return JSON.stringify({ version: FORMAT_VERSION, levels: progress.levels });
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
  return { levels };
}
