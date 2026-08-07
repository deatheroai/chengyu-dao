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
}

export interface IdiomContent {
  id: string;
  hanzi: string;
  pinyin: string;
  /** Character-by-character breakdown, helping a child see how the idiom is built. */
  literalMeaning: string;
  /** Plain-English meaning. */
  meaning: string;
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
