import type { ScienceQuestion } from "./types";

/**
 * Pure grading for the science-snake question overlay (BACKLOG.md's
 * "Pure grading module" entry): turns a child's typed sentence into a
 * verdict, and turns that verdict plus which try it was into what the
 * overlay should do next. Deliberately separated from the DOM/Phaser
 * wiring that will drive it, same pure-function-plus-thin-Scene split
 * every other mechanic in this project keeps (see writingScore.ts/
 * writingStage.ts for the sibling pattern).
 */

/**
 * A correct answer needs at least one case-insensitive substring match
 * from *every* one of a question's requiredKeywords OR-groups. Exported
 * on its own (not just folded into gradeAnswer) because the hint-safety
 * check needs the raw keyword match independent of whether the hint
 * text itself would also count as a well-formed sentence.
 */
export function satisfiesRequiredKeywords(answer: string, requiredKeywords: string[][]): boolean {
  // Padded so a keyword written with a leading space to mark a whole
  // word (" n and n", so "an and no" can't match) still matches at the
  // very start of an answer.
  const normalized = ` ${normalizeForMatching(answer)} `;
  return requiredKeywords.every((group) => group.some((keyword) => normalized.includes(normalizeForMatching(keyword))));
}

/**
 * Lowercases, treats hyphens as spaces ("water resistant" must match a
 * "water-resistant" keyword and vice versa), turns phone keyboards'
 * curly apostrophes into straight ones ("doesn’t" vs "doesn't"), and
 * collapses runs of whitespace — applied to both sides so keyword
 * authors don't have to list every spelling variant by hand.
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Cheap "does this read as a sentence" signal, not a real grammar
 * checker (per BACKLOG.md's "lenient, not a grammar checker") — a real
 * sentence attempt almost always contains at least one common
 * function/linking word; a bare keyword fragment ("grow reproduce",
 * "iron magnet") typically doesn't. Deliberately generous: this only
 * exists to catch someone typing a word salad instead of an actual
 * attempt, not to police grammar a P4 child hasn't been taught yet.
 */
const SENTENCE_SIGNAL_WORDS = new Set([
  "is", "are", "was", "were", "am", "be", "been", "being",
  "has", "have", "had", "do", "does", "did",
  "can", "could", "will", "would", "should",
  "because", "so", "when", "if", "the", "a", "an", "to", "it", "this", "that", "and", "but",
]);

function hasSentenceShape(answer: string): boolean {
  const words = answer.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.some((word) => SENTENCE_SIGNAL_WORDS.has(word.replace(/[.,!?]/g, "")));
}

/** A malformed answer fails regardless of what keywords it happens to contain. */
export function isMalformed(answer: string, minWords: number): boolean {
  const trimmed = answer.trim();
  if (!trimmed) return true;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < minWords) return true;
  return !hasSentenceShape(trimmed);
}

export type AnswerVerdict = "correct" | "malformed" | "incorrect";

/** Malformed is checked before keyword-matching — a well-formed sentence that's simply missing a required concept is "incorrect", not "malformed". */
export function gradeAnswer(answer: string, question: Pick<ScienceQuestion, "minWords" | "requiredKeywords">): AnswerVerdict {
  if (isMalformed(answer, question.minWords)) return "malformed";
  if (satisfiesRequiredKeywords(answer, question.requiredKeywords)) return "correct";
  return "incorrect";
}

/**
 * The two-try flow itself (BACKLOG.md: "ASK → [wrong: HINT+ASK try 2] →
 * [wrong: REVEAL]"). `retry` tells the overlay to show the question's
 * `hint` and accept a second attempt; `reveal` tells it to move into
 * chunkWords.ts's word-chunk reveal. Neither branch loses points/growth
 * on its own — that consequence lives in the snake/scoring modules that
 * react to the final outcome, not here.
 */
export type AttemptResult =
  | { outcome: "correct" }
  | { outcome: "retry"; verdict: "malformed" | "incorrect" }
  | { outcome: "reveal"; verdict: "malformed" | "incorrect" };

export function resolveAttempt(
  question: Pick<ScienceQuestion, "minWords" | "requiredKeywords">,
  answer: string,
  tryNumber: 1 | 2,
): AttemptResult {
  const verdict = gradeAnswer(answer, question);
  if (verdict === "correct") return { outcome: "correct" };
  return tryNumber === 1 ? { outcome: "retry", verdict } : { outcome: "reveal", verdict };
}
