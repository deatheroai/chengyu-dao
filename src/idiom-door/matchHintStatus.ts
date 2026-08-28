import type { IdiomContent } from "../idioms/types";
import { renderRubyText } from "../shared/rubyText";

const BLANK_CHAR = "○";

/**
 * Builds the "first two characters, then blank out the last two" hint
 * content for a given idiom — same masking technique
 * balloonLevelContent.ts's buildMaskedSentence uses for the idiom's own
 * hanzi within a full sentence, just applied to the idiom's own 4
 * characters directly rather than a sentence containing them.
 */
export function buildHintMaskedIdiom(idiom: IdiomContent): { hanzi: string; charPinyin: string[] } {
  const chars = Array.from(idiom.hanzi);
  const syllables = idiom.pinyin.split(" ");
  const hanzi = [...chars.slice(0, 2), BLANK_CHAR, BLANK_CHAR].join("");
  const charPinyin = [...syllables.slice(0, 2), "", ""];
  return { hanzi, charPinyin };
}

/**
 * Shows the match stage's "I don't know this one" hint card: the
 * idiom's first two characters (ruby-annotated), its last two blanked
 * out, then its plain-English meaning — see IdiomMatchScene's
 * endDrag for when this fires (a tap-and-release with no drag on a
 * first-half tile, not a drag that misses its target).
 */
export function showMatchHint(idiom: IdiomContent): void {
  const card = document.getElementById("match-hint-card");
  if (!card) return;
  const { hanzi, charPinyin } = buildHintMaskedIdiom(idiom);
  const hanziEl = card.querySelector<HTMLElement>("[data-hint-hanzi]");
  const meaningEl = card.querySelector<HTMLElement>("[data-hint-meaning]");
  if (hanziEl) renderRubyText(hanziEl, hanzi, charPinyin);
  if (meaningEl) meaningEl.textContent = idiom.meaning;
  card.classList.add("visible");
}

export function hideMatchHint(): void {
  document.getElementById("match-hint-card")?.classList.remove("visible");
}
