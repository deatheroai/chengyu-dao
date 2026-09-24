/**
 * Which P4 (Singapore MOE) Science syllabus strand a question belongs to.
 * Grows as more batches get authored — see BACKLOG.md's Science Snake
 * content-bank entry — rather than being pre-populated with every
 * eventual topic up front.
 */
export type ScienceTopic =
  | "diversity-living-nonliving"
  | "life-cycles"
  | "states-of-matter"
  | "magnets"
  | "plant-systems"
  | "materials"
  | "water-cycle"
  | "light-and-shadows"
  | "human-digestive-system"
  | "fungi"
  | "heat"
  | "classifying-animals";

export interface ScienceQuestion {
  id: string;
  topic: ScienceTopic;
  /** Doubles as this question's snake-food sprite on the game grid. */
  icon: string;
  /**
   * Always a short concrete scenario (a named child doing/observing
   * something), never a bare recall-the-fact prompt — per your "a little
   * more descriptive scenario... give the child enough to reason from"
   * feedback on the first content batch. Short-answer only; MCQ-shaped
   * content (e.g. "list the stages in order") is out of scope for this
   * game.
   */
  prompt: string;
  /**
   * OR-groups of acceptable keyword phrases — a correct answer needs at
   * least one case-insensitive match from *every* group. See
   * answerGrading.ts (not yet built, BACKLOG.md) for the grading logic
   * this data feeds.
   */
  requiredKeywords: string[][];
  /** Word-count floor below which an answer is malformed regardless of keyword matches. */
  minWords: number;
  /** A Socratic nudge shown after the first wrong try — guides toward the concept, never states the answer. */
  hint: string;
  /** Revealed word-chunked (3 words per tap) after the second wrong try, so the child has to read it, not skim it. */
  modelAnswer: string;
  /** Provenance/audit trail — not shown in-game, kept for content review history. */
  sourceNotes: string;
}
