import type { TestResult } from "./memoryTest";

/**
 * Practice stars for one character:
 * 1 = traced it, 2 = wrote it alone with at most one wrong stroke,
 * 3 = wrote it alone with no wrong strokes at all.
 */
export type Stars = 0 | 1 | 2 | 3;

export function starsForTrace(): Stars {
  return 1;
}

export function starsForFreeWriting(totalMistakes: number): Stars {
  if (totalMistakes === 0) return 3;
  if (totalMistakes <= 1) return 2;
  return 1;
}

/** Everything saved for one story, on this device only. */
export interface StoryProgress {
  stars: Record<string, Stars>;
  /** Fastest time (ms) writing each character alone with no mistakes. */
  bestMs: Record<string, number>;
  /** Most recent memory-test result per character. */
  lastTest: Record<string, TestResult>;
  /** Best memory-test score so far (characters correct). */
  bestTestScore: number;
}

export function emptyProgress(): StoryProgress {
  return { stars: {}, bestMs: {}, lastTest: {}, bestTestScore: 0 };
}

/** Records stars, keeping the best ever earned. Returns true if it went up. */
export function recordStars(p: StoryProgress, char: string, stars: Stars): boolean {
  if (stars <= (p.stars[char] ?? 0)) return false;
  p.stars[char] = stars;
  return true;
}

/** Records a flawless free-writing time. Returns true if it is a new best. */
export function recordTime(p: StoryProgress, char: string, ms: number): boolean {
  const best = p.bestMs[char];
  if (best !== undefined && ms >= best) return false;
  p.bestMs[char] = ms;
  return true;
}

export function recordTest(p: StoryProgress, results: { char: string; result: TestResult }[]): void {
  for (const r of results) p.lastTest[r.char] = r.result;
  const correct = results.filter((r) => r.result === "correct").length;
  p.bestTestScore = Math.max(p.bestTestScore, correct);
}

/** "8.3 秒" — one decimal place, enough to see improvement. */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} 秒`;
}

// ---------- storage ----------

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const keyFor = (storyId: string) => `story-writer:v1:${storyId}`;

/** Loads saved progress, or empty progress if there is none, it is
 * unreadable, or storage is unavailable (private browsing etc.). */
export function loadProgress(storyId: string, store: KeyValueStore | null): StoryProgress {
  try {
    const raw = store?.getItem(keyFor(storyId));
    if (!raw) return emptyProgress();
    const data = JSON.parse(raw) as Partial<StoryProgress>;
    const stars: Record<string, Stars> = {};
    for (const [c, n] of Object.entries(data.stars ?? {})) {
      if (n === 1 || n === 2 || n === 3) stars[c] = n;
    }
    const bestMs: Record<string, number> = {};
    for (const [c, ms] of Object.entries(data.bestMs ?? {})) {
      if (typeof ms === "number" && ms > 0) bestMs[c] = ms;
    }
    const lastTest: Record<string, TestResult> = {};
    for (const [c, r] of Object.entries(data.lastTest ?? {})) {
      if (r === "correct" || r === "shaky" || r === "revealed") lastTest[c] = r;
    }
    const bestTestScore = typeof data.bestTestScore === "number" ? data.bestTestScore : 0;
    return { stars, bestMs, lastTest, bestTestScore };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(storyId: string, p: StoryProgress, store: KeyValueStore | null): void {
  try {
    store?.setItem(keyFor(storyId), JSON.stringify(p));
  } catch {
    // Storage full or blocked: progress just won't persist this time.
  }
}

export function clearProgress(storyId: string, store: KeyValueStore | null): void {
  try {
    store?.removeItem(keyFor(storyId));
  } catch {
    // Nothing to clear.
  }
}

/** window.localStorage, or null where touching it throws. */
export function deviceStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
