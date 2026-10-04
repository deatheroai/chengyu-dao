/**
 * Pure scoring + localStorage persistence (BACKLOG.md's "Scoring + high
 * score persistence" entry). Same direct-localStorage, try/catch-on-parse
 * shape `shared/sessionHistory.ts` already uses — its own storage keys,
 * not idiom-door's, per the completely-independent-game decision
 * (DECISIONS.md).
 */

const HIGH_SCORE_KEY = "science-snake-high-score";
const LAST_RUN_KEY = "science-snake-last-run";
const RECENT_RUNS_KEY = "science-snake-recent-runs";

/** How many runs the runs board shows (per "a board showing the last four runs"). */
export const RECENT_RUNS_COUNT = 4;

export const APPLE_POINTS = 5;
export const CORRECT_ANSWER_POINTS = 30;
/** The golden apples (BACKLOG.md's redesign, step 2): eating one is worth an apple's points just for trying... */
export const GOLDEN_ATTEMPT_POINTS = 5;
/** ...and typing the whole answer correctly is worth five times the answer room's 30. */
export const GOLDEN_CORRECT_POINTS = 150;

export interface RunStats {
  applesEaten: number;
  /** Answered through the answer room. */
  questionsCorrect: number;
  /** Golden apples eaten. Optional so records saved before golden apples existed still load. */
  goldenAttempts?: number;
  /** Questions answered by typing the whole answer after a golden apple — counted here, not in `questionsCorrect`. */
  goldenCorrect?: number;
}

/**
 * `score = apples*5 + questionsCorrect*30 + goldenAttempts*5 +
 * goldenCorrect*150`. Poison apples award 0 points and are never counted
 * here (tracked separately as poisonApplesEaten — see
 * itemSpawner.ts/BoardItem).
 */
export function calculateScore(stats: RunStats): number {
  return (
    stats.applesEaten * APPLE_POINTS +
    stats.questionsCorrect * CORRECT_ANSWER_POINTS +
    (stats.goldenAttempts ?? 0) * GOLDEN_ATTEMPT_POINTS +
    (stats.goldenCorrect ?? 0) * GOLDEN_CORRECT_POINTS
  );
}

export interface ScoreRecord extends RunStats {
  score: number;
  /** Epoch ms. */
  achievedAt: number;
}

function loadRecord(key: string): ScoreRecord | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.score !== "number") return null;
    return parsed as ScoreRecord;
  } catch {
    return null;
  }
}

export function loadHighScore(): ScoreRecord | null {
  return loadRecord(HIGH_SCORE_KEY);
}

export function loadLastRun(): ScoreRecord | null {
  return loadRecord(LAST_RUN_KEY);
}

/** Newest first, at most RECENT_RUNS_COUNT. Before this list existed only the last run was kept, so that seeds it. */
export function loadRecentRuns(): ScoreRecord[] {
  const raw = localStorage.getItem(RECENT_RUNS_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isScoreRecord).slice(0, RECENT_RUNS_COUNT);
    } catch {
      // Fall through to the last run.
    }
  }
  const last = loadLastRun();
  return last ? [last] : [];
}

function saveRecentRuns(runs: ScoreRecord[]): void {
  localStorage.setItem(RECENT_RUNS_KEY, JSON.stringify(runs.slice(0, RECENT_RUNS_COUNT)));
}

export interface RunOutcome {
  score: number;
  /** The score of the run before this one (null on a player's very first completed run ever). */
  previousScore: number | null;
  isNewHighScore: boolean;
  /** The best score on record after this run — equals `score` when `isNewHighScore` is true. */
  highScore: number;
}

/**
 * Records this run's result — called at the end of every completed run,
 * win or lose alike, so the child gets improvement feedback even on a
 * loss (a run that suffocates early having answered several questions
 * correctly can still score more than a scraped-together win). Compares
 * against the immediately-previous run (round-over-round feedback) and
 * against the all-time best (a new-high-score moment), independently.
 */
export function recordRun(stats: RunStats, achievedAt: number = Date.now()): RunOutcome {
  const score = calculateScore(stats);
  const previousRun = loadLastRun();
  const existingHighScore = loadHighScore();
  const isNewHighScore = !existingHighScore || score > existingHighScore.score;

  const record: ScoreRecord = { ...stats, score, achievedAt };
  saveRecentRuns([record, ...loadRecentRuns()]);
  localStorage.setItem(LAST_RUN_KEY, JSON.stringify(record));
  if (isNewHighScore) {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(record));
  }

  return {
    score,
    previousScore: previousRun ? previousRun.score : null,
    isNewHighScore,
    highScore: isNewHighScore ? score : existingHighScore!.score,
  };
}

/**
 * One-line, kid-readable summary of how this run compares — round-over-
 * round (vs the immediately-prior run) and, separately, whether it's a
 * new all-time best. Pure formatting only, so it's testable without any
 * DOM (the win/lose cards just drop the returned string in).
 */
export function describeRunOutcome(outcome: RunOutcome): string {
  if (outcome.previousScore === null) {
    return outcome.isNewHighScore ? "🏆 New high score — your first run!" : "First run recorded!";
  }
  const delta = outcome.score - outcome.previousScore;
  if (outcome.isNewHighScore) {
    return `🏆 New high score! (+${delta} vs your last run)`;
  }
  if (delta > 0) return `📈 +${delta} vs your last run (best: ${outcome.highScore})`;
  if (delta < 0) return `📉 ${delta} vs your last run (best: ${outcome.highScore})`;
  return `Same as your last run (best: ${outcome.highScore})`;
}

/** What a Science Snake cloud save holds: the records this module
 * keeps locally. `recentRuns` is optional, so saves made before the runs
 * board existed are still valid. */
export interface ScienceSnakeCloudSave {
  highScore: ScoreRecord | null;
  lastRun: ScoreRecord | null;
  recentRuns?: ScoreRecord[];
}

export function exportScoresForCloud(): ScienceSnakeCloudSave {
  return { highScore: loadHighScore(), lastRun: loadLastRun(), recentRuns: loadRecentRuns() };
}

function isScoreRecord(value: unknown): value is ScoreRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.score === "number" &&
    typeof record.achievedAt === "number" &&
    typeof record.applesEaten === "number" &&
    typeof record.questionsCorrect === "number"
  );
}

function isScoreRecordOrNull(value: unknown): value is ScoreRecord | null {
  return value === null || isScoreRecord(value);
}

/** Whether `remote` is shaped like a Science Snake save at all. */
export function isScienceSnakeCloudSave(remote: unknown): remote is ScienceSnakeCloudSave {
  if (!remote || typeof remote !== "object") return false;
  const save = remote as Record<string, unknown>;
  const recentRunsOk = save.recentRuns === undefined || (Array.isArray(save.recentRuns) && save.recentRuns.every(isScoreRecord));
  return "highScore" in save && "lastRun" in save && isScoreRecordOrNull(save.highScore) && isScoreRecordOrNull(save.lastRun) && recentRunsOk;
}

/**
 * Merges a fetched cloud save into this device's records rather than
 * overwriting them, so syncing can never lose a score either side
 * has: the high score is whichever is higher (a tie keeps the local
 * one), and the last run is whichever happened most recently. Returns
 * false, changing nothing, when `remote` isn't a Science Snake save —
 * the caller uses that to tell "nothing to restore from that code"
 * apart from a real restore.
 */
export function mergeScoresFromCloud(remote: unknown): boolean {
  if (!isScienceSnakeCloudSave(remote)) return false;
  const localHigh = loadHighScore();
  if (remote.highScore && (!localHigh || remote.highScore.score > localHigh.score)) {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(remote.highScore));
  }
  const localLast = loadLastRun();
  if (remote.lastRun && (!localLast || remote.lastRun.achievedAt > localLast.achievedAt)) {
    localStorage.setItem(LAST_RUN_KEY, JSON.stringify(remote.lastRun));
  }
  // The runs board: both devices' runs together, newest first, the same
  // run (same time and score) counted once.
  const seen = new Set<string>();
  const merged = [...loadRecentRuns(), ...(remote.recentRuns ?? []), ...(remote.lastRun ? [remote.lastRun] : [])]
    .sort((a, b) => b.achievedAt - a.achievedAt)
    .filter((run) => {
      const id = `${run.achievedAt}:${run.score}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  saveRecentRuns(merged);
  return true;
}

export function clearHighScore(): void {
  localStorage.removeItem(HIGH_SCORE_KEY);
  localStorage.removeItem(LAST_RUN_KEY);
  localStorage.removeItem(RECENT_RUNS_KEY);
}

/** One row of the runs board: a run's four numbers, and which of them beat the run before it. */
export interface RunBoardRow {
  achievedAt: number;
  score: number;
  /** Every question answered right: in the answer room or by typing a golden answer. */
  correct: number;
  apples: number;
  /** Golden apples eaten. */
  golden: number;
  /** Which numbers went up since the run before this one (all false for the oldest run shown). */
  up: { score: boolean; correct: boolean; apples: boolean; golden: boolean };
}

/** The runs board's rows, newest first (per "a board showing the last four runs and the questions answered correctly, apples eaten and golden apples eaten... to encourage the child to keep improving"). */
export function buildRunBoard(runs: ScoreRecord[]): RunBoardRow[] {
  const numbers = runs.map((run) => ({
    achievedAt: run.achievedAt,
    score: run.score,
    correct: run.questionsCorrect + (run.goldenCorrect ?? 0),
    apples: run.applesEaten,
    golden: run.goldenAttempts ?? 0,
  }));
  return numbers.map((row, i) => {
    const before = numbers[i + 1];
    return {
      ...row,
      up: {
        score: !!before && row.score > before.score,
        correct: !!before && row.correct > before.correct,
        apples: !!before && row.apples > before.apples,
        golden: !!before && row.golden > before.golden,
      },
    };
  });
}
