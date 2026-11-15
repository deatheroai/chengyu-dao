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

/** Does `text` use `word`? A pattern like 像……一样 matches when its
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
      if (i > 0 && at === from) return false;
      from = at + part.length;
    }
    return !text.includes(GAP);
  }
  const stem = word.length > 2 && /[的地]$/.test(word) ? word.slice(0, -1) : word;
  return text.includes(stem);
}

/** Which senses the sentence visibly uses, judged by the word banks.
 * Only used to grey out spinner slots, so missing a creative word of
 * the child's own is harmless. */
export function sensesUsed(text: string, beat: Beat | undefined): SenseId[] {
  return SENSES.filter((s) => wordsFor(beat, s.id).some((w) => usesWord(text, w))).map((s) => s.id);
}

/** Adds a full stop when the sentence doesn't end with punctuation. */
export function finishSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[。！？!?…”"]$/.test(t) ? t : `${t}。`;
}
