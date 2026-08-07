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

export interface ShortScenario {
  hanzi: string;
  pinyin: string;
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
   * One-line condensation of dailyLifeScenario for the Snippet 3
   * application-check multiple choice, where reading 2-3 full paragraphs
   * to compare would be a lot of cognitive load for this age group. In
   * Mandarin (not English) per feedback that the app-check read as too
   * English-heavy for a Chinese-learning game — deliberately doesn't
   * contain the idiom's own hanzi, otherwise the "which one fits?"
   * check would just become a literal text-match instead of a
   * comprehension check. New wording I authored, not research-agent
   * verified — flagged for a look.
   */
  scenarioShort: ShortScenario;
  exampleSentence: IdiomExampleSentence;
  ageBand: "lower-primary" | "upper-primary";
  theme: IdiomTheme;
  /** Provenance/audit trail — not shown in-game, kept for content review history. */
  sourceNotes: string;
}
