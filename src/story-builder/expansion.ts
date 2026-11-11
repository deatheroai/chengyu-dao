import { SENSES, type SenseId } from "./senses";
import type { Beat } from "./adventures";

/** Placeholder inside a sentence pattern, e.g. 像……一样. */
export const GAP = "……";

/** Counts Chinese characters (ignores punctuation, spaces, letters). */
export function countHanzi(text: string): number {
  return Array.from(text).filter((c) => /\p{Script=Han}/u.test(c)).length;
}

/** True when the text is a real attempt at a sentence: at least
 * `min` Chinese characters and no unfilled pattern gap. */
export function isUsableSentence(text: string, min = 3): boolean {
  return countHanzi(text) >= min && !text.includes(GAP);
}

/** Words for one sense on one beat: scene words first, then general. */
export function wordsFor(beat: Beat | undefined, sense: SenseId): string[] {
  const general = SENSES.find((s) => s.id === sense)?.words ?? [];
  const scene = beat?.words[sense] ?? [];
  return [...new Set([...scene, ...general])];
}

/** Does `text` use `word`? A pattern like 一边……一边…… matches when its
 * fixed parts appear in order with something in between; a plain word
 * matches when it appears, ignoring a trailing 的/地 so 软软的 also
 * counts for 软软地. */
export function usesWord(text: string, word: string): boolean {
  if (word.includes(GAP)) {
    const parts = word.split(GAP).filter(Boolean);
    let from = 0;
    for (const [i, part] of parts.entries()) {
      const at = text.indexOf(part, from);
      if (at < 0) return false;
      // Require real content between consecutive parts.
      if (i > 0 && at === from) return false;
      from = at + part.length;
    }
    return !text.includes(GAP);
  }
  const stem = word.length > 2 && /[的地]$/.test(word) ? word.slice(0, -1) : word;
  return text.includes(stem);
}

/** Which senses the sentence touches, based on the beat's word bank.
 * The child's own words count too when they match a bank word. */
export function sensesUsed(text: string, beat: Beat | undefined): SenseId[] {
  return SENSES.filter((s) => wordsFor(beat, s.id).some((w) => usesWord(text, w))).map((s) => s.id);
}

export interface InsertResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Inserts `word` into `value` replacing the [start, end) selection.
 * A pattern like 像……一样 selects its first gap so typing fills it. */
export function insertWord(value: string, start: number, end: number, word: string): InsertResult {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const next = before + word + after;
  const gap = word.indexOf(GAP);
  if (gap >= 0) {
    const at = before.length + gap;
    return { value: next, selectionStart: at, selectionEnd: at + GAP.length };
  }
  const caret = before.length + word.length;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}

/** Adds a full stop when the sentence doesn't end with punctuation. */
export function finishSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[。！？!?…”"]$/.test(t) ? t : `${t}。`;
}

/** 1–3 stars for a turn: ★ for writing a sentence, ★★ for using at
 * least one sense, ★★★ for using two or more different senses. */
export function turnStars(senses: SenseId[]): 1 | 2 | 3 {
  if (senses.length >= 2) return 3;
  if (senses.length === 1) return 2;
  return 1;
}
