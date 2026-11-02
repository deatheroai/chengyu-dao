/** How one character went in the write-from-memory test. */
export type TestResult = "correct" | "shaky" | "revealed";

/**
 * Grades one character from hanzi-writer's quiz summary. Up to one
 * wrong stroke still counts as correct (a slip of the finger); more
 * than that means she got there but it isn't solid yet. Tapping
 * "show me" before finishing is always "revealed".
 */
export function gradeAttempt(totalMistakes: number, revealed: boolean): TestResult {
  if (revealed) return "revealed";
  return totalMistakes <= 1 ? "correct" : "shaky";
}

export interface TestSummary {
  correct: number;
  total: number;
  /** Characters worth practising again (shaky or revealed). */
  toReview: string[];
}

export function summarize(results: { char: string; result: TestResult }[]): TestSummary {
  return {
    correct: results.filter((r) => r.result === "correct").length,
    total: results.length,
    toReview: results.filter((r) => r.result !== "correct").map((r) => r.char),
  };
}

/** Fisher–Yates shuffle, so the test order differs from the practice order. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
