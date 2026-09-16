/**
 * Pure scoring + localStorage high-score persistence (BACKLOG.md's
 * "Scoring + high score persistence" entry). Same direct-localStorage,
 * try/catch-on-parse shape `shared/sessionHistory.ts` already uses —
 * its own storage key, not idiom-door's, per the completely-independent-
 * game decision (DECISIONS.md).
 */

const STORAGE_KEY = "science-snake-high-score";

export const APPLE_POINTS = 5;
export const CORRECT_ANSWER_POINTS = 30;

export interface RunStats {
  applesEaten: number;
  questionsCorrect: number;
}

/** `score = apples*5 + questionsCorrect*30`, per your spec. Poison apples award 0 points and are never counted here (tracked separately as poisonApplesEaten — see itemSpawner.ts/BoardItem). */
export function calculateScore(stats: RunStats): number {
  return stats.applesEaten * APPLE_POINTS + stats.questionsCorrect * CORRECT_ANSWER_POINTS;
}

export interface HighScoreRecord extends RunStats {
  score: number;
  /** Epoch ms. */
  achievedAt: number;
}

function load(): HighScoreRecord | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.score !== "number") return null;
    return parsed as HighScoreRecord;
  } catch {
    return null;
  }
}

export function loadHighScore(): HighScoreRecord | null {
  return load();
}

/**
 * Recorded only on a win, per your spec ("for each game win, a high
 * score is recorded"). Only overwrites the stored record when this
 * run's score actually beats it — a losing run should never call this
 * at all, so there's no separate "is this a win" check here.
 */
export function recordHighScoreIfBetter(stats: RunStats, achievedAt: number = Date.now()): HighScoreRecord {
  const score = calculateScore(stats);
  const existing = load();
  if (existing && existing.score >= score) return existing;
  const record: HighScoreRecord = { ...stats, score, achievedAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function clearHighScore(): void {
  localStorage.removeItem(STORAGE_KEY);
}
