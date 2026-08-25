/**
 * Which broad life-lesson theme an idiom belongs to. Used for content
 * organization (see SNIPPET_PLANS.md's grouped review) and, later, for
 * session pacing (e.g. drawing a session's idioms from different themes).
 */
export type IdiomTheme = "focus" | "honesty" | "kindness" | "wisdom";

export interface IdiomExampleSentence {
  hanzi: string;
  pinyin: string;
  english: string;
  /**
   * `pinyin` above is natural word-grouped prose (multi-character words
   * share one romanized token, e.g. "shíhou" for 时候, and punctuation
   * has no token at all) — good for reading aloud, but useless for
   * lining pinyin up against individual characters. `charPinyin` is a
   * parallel array, one entry per `Array.from(hanzi)` character in
   * the same order (empty string for punctuation, which has no
   * reading) — added 2026-08-28 per your "very hard for the child to
   * learn if the pinyin is on a separate paragraph" feedback, so the
   * UI can render pinyin directly over/under each character (ruby
   * annotation) instead. Hand-derived from the same already-approved
   * `pinyin` (cross-checked token-by-token against it for tone
   * accuracy, not guessed from scratch) — same "needs your review
   * before treated as fully vetted" status as the rest of this
   * project's authored Chinese text.
   */
  charPinyin: string[];
}

export interface IdiomMeaningZh {
  hanzi: string;
  pinyin: string;
  /** Same purpose/provenance as IdiomExampleSentence.charPinyin above. */
  charPinyin: string[];
}

export interface IdiomContent {
  id: string;
  hanzi: string;
  pinyin: string;
  /** Character-by-character breakdown, helping a child see how the idiom is built. */
  literalMeaning: string;
  /** Plain-English meaning. */
  meaning: string;
  /**
   * A Mandarin paraphrase of `meaning` (with pinyin) — deliberately
   * *not* the idiom's own hanzi, and phrased differently enough not to
   * hand the puzzle's answer to a child reading it (idiom-door.html's
   * intro screen shows this as the primary clue, since the game is
   * Mandarin-first; English is a click-to-reveal fallback for a child
   * who doesn't yet read the Mandarin). New content, same "needs your
   * review before treated as fully vetted" status as the rest of this
   * project's authored Chinese text — see DECISIONS.md.
   */
  meaningZh: IdiomMeaningZh;
  /** The most important field: a concrete scenario a 7-9 year old recognizes. */
  dailyLifeScenario: string;
  /**
   * Also doubles as the Snippet 3 application-check's multiple-choice
   * option content (hanzi + pinyin, no English) — showing the idiom
   * used naturally in a sentence teaches usage directly, per feedback
   * that a separate idiom-free scenario sentence read as an unnecessary
   * extra layer. Already research-approved Snippet 1 content, so no new
   * unverified text is introduced for this.
   */
  exampleSentence: IdiomExampleSentence;
  ageBand: "lower-primary" | "upper-primary";
  theme: IdiomTheme;
  /** Provenance/audit trail — not shown in-game, kept for content review history. */
  sourceNotes: string;
}
