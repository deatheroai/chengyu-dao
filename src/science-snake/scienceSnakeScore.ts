/**
 * Pure scoring + localStorage persistence (BACKLOG.md's "Scoring + high
 * score persistence" entry). Same direct-localStorage, try/catch-on-parse
 * shape `shared/sessionHistory.ts` already uses — its own storage keys,
 * not idiom-door's, per the completely-independent-game decision
 * (DECISIONS.md).
 */

const HIGH_SCORE_KEY = "science-snake-high-score";
const LAST_RUN_KEY = "science-snake-last-run";

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

export function clearHighScore(): void {
  localStorage.removeItem(HIGH_SCORE_KEY);
  localStorage.removeItem(LAST_RUN_KEY);
}
