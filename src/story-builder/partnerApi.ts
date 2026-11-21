import type { SenseId } from "./senses";
// .js extension: the serverless function loads this file unbundled (see tsconfig.api.json).
import { cleanFeedbackOut, type FeedbackOut } from "./feedback.js";
import { cleanFixes, type Fix } from "./corrections.js";

/**
 * The contract between the story page and api/story-partner.ts (the
 * AI 团团). Shared by both sides; no DOM and no runtime imports, so the
 * serverless function can load it as-is (feedback.ts is the same).
 */

export const PARTNER_SENSES = ["see", "hear", "smell", "touch", "feel", "pattern"] as const satisfies readonly SenseId[];

/** Upper bounds on what the page may send (also keeps prompts small). */
export const LIMITS = { text: 120, idea: 60, lines: 16 } as const;

export interface StoryLineIn {
  /** "parent": the one turn a grown-up wrote for the child. */
  by: "partner" | "child" | "parent";
  text: string;
}

/** A word from 团团's line for the child to learn (📗 新词), usually an
 * everyday Singapore word like 巴刹 or 组屋楼下. */
export interface NewWord {
  word: string;
  meaning: string;
}

/** 团团's next line, the question for the child, and 💡 hints per mission. */
export interface NextBeat {
  line: string;
  /** Empty when `line` is the ending. */
  question: string;
  hints: Record<SenseId, string[]>;
  /** A word in `line` worth learning, with what it means. */
  word?: NewWord;
}

export interface StartRequest {
  action: "start";
  /** The child's own idea for a story. */
  idea: string;
}

export interface TurnRequest {
  action: "turn";
  story: StoryLineIn[];
  /** Who wrote this turn. A parent's turn has no mission. Default child. */
  writer?: "child" | "parent";
  /** The sentence before the mission (the same as `sentence` for a parent). */
  original: string;
  /** The sentence after the mission. */
  sentence: string;
  /** The child's mission; absent on a parent's turn. */
  mission?: SenseId;
  /** Turns still to come after this one; 0 means write the ending. */
  turnsLeft: number;
  /** Also return two other ways the story could go (see `alternatives`). */
  choices?: boolean;
}

export type PartnerRequest = StartRequest | TurnRequest;

export interface StartResponse {
  next: NextBeat;
}

export interface TurnResponse {
  missionDone: boolean;
  /** A short warm reaction to what the child actually wrote. */
  reaction: string;
  /** When the mission isn't done yet: a nudge (a question, not the answer). */
  hint: string;
  next: NextBeat;
  /** 错别字 in the child's sentence, for the child to fix (never on a
   * parent's turn). The page still checks each one is in the sentence. */
  fixes?: Fix[];
  /** When the request asked for choices: two other next beats, so the
   * child can pick which of three ways the story goes. */
  alternatives?: NextBeat[];
  /** Last turn only: the 好词卡 vocabulary feedback for the whole story. */
  feedback?: FeedbackOut;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const isText = (x: unknown, max: number): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= max;
const isSense = (x: unknown): x is SenseId => (PARTNER_SENSES as readonly unknown[]).includes(x);

/** Validates an incoming request body; returns the request or an error code. */
export function parsePartnerRequest(body: unknown): PartnerRequest | { error: string } {
  if (!isObj(body)) return { error: "invalid-body" };
  if (body.action === "start") {
    return isText(body.idea, LIMITS.idea) ? { action: "start", idea: body.idea.trim() } : { error: "invalid-idea" };
  }
  if (body.action === "turn") {
    const { story, original, sentence, mission, turnsLeft, writer, choices } = body;
    if (writer !== undefined && writer !== "child" && writer !== "parent") return { error: "invalid-writer" };
    if (!Array.isArray(story) || story.length === 0 || story.length > LIMITS.lines) return { error: "invalid-story" };
    const lines: StoryLineIn[] = [];
    for (const l of story) {
      if (!isObj(l) || (l.by !== "partner" && l.by !== "child" && l.by !== "parent") || !isText(l.text, LIMITS.text)) {
        return { error: "invalid-story" };
      }
      lines.push({ by: l.by, text: l.text.trim() });
    }
    if (!isText(original, LIMITS.text) || !isText(sentence, LIMITS.text)) return { error: "invalid-sentence" };
    const byParent = writer === "parent";
    if (!byParent && !isSense(mission)) return { error: "invalid-mission" };
    if (typeof turnsLeft !== "number" || !Number.isInteger(turnsLeft) || turnsLeft < 0 || turnsLeft > 10) {
      return { error: "invalid-turns" };
    }
    return {
      action: "turn",
      story: lines,
      ...(byParent ? { writer: "parent" as const } : {}),
      original: original.trim(),
      sentence: sentence.trim(),
      ...(byParent ? {} : { mission: mission as SenseId }),
      turnsLeft,
      ...(choices === true && turnsLeft > 0 ? { choices: true } : {}),
    };
  }
  return { error: "invalid-action" };
}

function cleanHints(x: unknown): Record<SenseId, string[]> | null {
  if (!isObj(x)) return null;
  const out = {} as Record<SenseId, string[]>;
  for (const s of PARTNER_SENSES) {
    const v = x[s];
    out[s] = Array.isArray(v) ? v.filter((w): w is string => isText(w, 30)).slice(0, 3) : [];
  }
  return out;
}

/** Checks a NextBeat from the server (or the model) and trims it. */
export function cleanNextBeat(x: unknown): NextBeat | null {
  if (!isObj(x) || !isText(x.line, 200) || typeof x.question !== "string") return null;
  const hints = cleanHints(x.hints);
  if (!hints) return null;
  const line = x.line.trim();
  const word = cleanNewWord(x.word, line);
  return { line, question: x.question.trim().slice(0, 80), hints, ...(word ? { word } : {}) };
}

/** Keeps a 📗 新词 only when it really is in the line. */
export function cleanNewWord(x: unknown, line: string): NewWord | undefined {
  if (!isObj(x) || typeof x.word !== "string" || typeof x.meaning !== "string") return undefined;
  const word = x.word.trim().replace(/^[“"「]+|[”"」]+$/g, "");
  const meaning = x.meaning.trim().slice(0, 40);
  if (!word || Array.from(word).length > 8 || !meaning || !line.includes(word)) return undefined;
  return { word, meaning };
}

export function cleanTurnResponse(x: unknown): TurnResponse | null {
  if (!isObj(x) || typeof x.missionDone !== "boolean") return null;
  const next = cleanNextBeat(x.next);
  if (!next) return null;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const feedback = x.feedback === undefined ? null : cleanFeedbackOut(x.feedback);
  const alternatives = Array.isArray(x.alternatives)
    ? x.alternatives
        .map(cleanNextBeat)
        .filter((b): b is NextBeat => b !== null && b.question !== "" && b.line !== next.line)
        .slice(0, 2)
    : [];
  const fixes = cleanFixes(x.fixes);
  return {
    missionDone: x.missionDone,
    reaction: str(x.reaction, 80),
    hint: str(x.hint, 80),
    next,
    ...(fixes.length ? { fixes } : {}),
    ...(alternatives.length ? { alternatives } : {}),
    ...(feedback ? { feedback } : {}),
  };
}

export function cleanStartResponse(x: unknown): StartResponse | null {
  if (!isObj(x)) return null;
  const next = cleanNextBeat(x.next);
  return next ? { next } : null;
}
