import type { SenseId } from "./senses";

/**
 * The 好词卡 (good-words card) shown after a story: two words the child
 * used well and one sentence to make richer. Vocabulary only, never
 * grammar. Shared by the page and api/story-partner.ts, so no DOM and
 * no runtime imports.
 */

export interface FeedbackStar {
  /** Words copied from one of the child's sentences. */
  quote: string;
  /** Why they work, in one short sentence. */
  why: string;
}

export interface FeedbackWish {
  /** The child's sentence to make richer, exactly as in the story. */
  sentence: string;
  /** A friendly nudge at one plain or repeated word (never the answer). */
  tip: string;
  /** 💡 richer words the child could use. */
  words: string[];
  /** The child's rewrite, once they've done it. */
  rewritten?: string;
}

export interface StoryFeedback {
  source: "ai" | "offline";
  stars: FeedbackStar[];
  wish?: FeedbackWish;
  /** Characters the AI thinks are worth practising (教团团写字 favours them). */
  practice?: string[];
}

/** What the AI returns on the last turn: the wish points at a child
 * sentence by number (1 = the child's first sentence). */
export interface FeedbackOut {
  stars: FeedbackStar[];
  wish: { turn: number; tip: string; words: string[] };
  /** Up to 3 challenging characters from the child's sentences. */
  practice?: string[];
}

/** The child's own lines, as the page and the AI both see them. */
export interface ChildSentence {
  text: string;
  /** The sentence before the mission. */
  plain?: string;
  mission?: SenseId;
  missionDone?: boolean;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
const isHan = (c: string) => /\p{Script=Han}/u.test(c);

/** Single Chinese characters, at most three, no repeats. */
function cleanChars(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  const chars = x.map((c) => str(c, 4)).filter((c) => Array.from(c).length === 1 && isHan(c));
  return [...new Set(chars)].slice(0, 3);
}

function cleanWords(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  const words = x.map((w) => str(w, 12)).filter(Boolean);
  return [...new Set(words)].slice(0, 3);
}

/** Checks a star against the child's sentences: the quote must really
 * be something they wrote. */
function cleanStar(x: unknown, sentences: string[]): FeedbackStar | null {
  if (!isObj(x)) return null;
  const quote = str(x.quote, 20).replace(/^[“"「]+|[”"」]+$/g, "");
  const why = str(x.why, 40);
  if (!quote || !why || !sentences.some((s) => s.includes(quote))) return null;
  return { quote, why };
}

/** Turns the AI's feedback into a card for these child sentences, or
 * null when nothing usable is left. */
export function feedbackFromAi(x: unknown, sentences: string[]): StoryFeedback | null {
  if (!isObj(x)) return null;
  const stars = (Array.isArray(x.stars) ? x.stars : [])
    .map((s) => cleanStar(s, sentences))
    .filter((s): s is FeedbackStar => s !== null)
    .filter((s, i, all) => all.findIndex((o) => o.quote === s.quote) === i)
    .slice(0, 2);
  let wish: FeedbackWish | undefined;
  if (isObj(x.wish)) {
    const turn = x.wish.turn;
    const tip = str(x.wish.tip, 50);
    const words = cleanWords(x.wish.words);
    const sentence = typeof turn === "number" && Number.isInteger(turn) ? sentences[turn - 1] : undefined;
    if (sentence && tip && words.length) wish = { sentence, tip, words };
  }
  const text = sentences.join("");
  const practice = cleanChars(x.practice).filter((c) => text.includes(c));
  if (!stars.length && !wish) return null;
  return { source: "ai", stars, wish, ...(practice.length ? { practice } : {}) };
}

/** Validates the AI's raw feedback shape (before it is matched to sentences). */
export function cleanFeedbackOut(x: unknown): FeedbackOut | null {
  if (!isObj(x) || !Array.isArray(x.stars) || !isObj(x.wish)) return null;
  const stars = x.stars
    .filter(isObj)
    .map((s) => ({ quote: str(s.quote, 20), why: str(s.why, 40) }))
    .filter((s) => s.quote && s.why)
    .slice(0, 2);
  const turn = x.wish.turn;
  const practice = cleanChars(x.practice);
  return {
    stars,
    wish: {
      turn: typeof turn === "number" && Number.isInteger(turn) ? turn : 0,
      tip: str(x.wish.tip, 50),
      words: cleanWords(x.wish.words),
    },
    ...(practice.length ? { practice } : {}),
  };
}

/** Validates a card read back from storage. */
export function cleanStoryFeedback(x: unknown): StoryFeedback | undefined {
  if (!isObj(x) || (x.source !== "ai" && x.source !== "offline") || !Array.isArray(x.stars)) return undefined;
  const stars = x.stars
    .filter(isObj)
    .map((s) => ({ quote: str(s.quote, 20), why: str(s.why, 40) }))
    .filter((s) => s.quote && s.why)
    .slice(0, 2);
  let wish: FeedbackWish | undefined;
  if (isObj(x.wish)) {
    const sentence = str(x.wish.sentence, 200);
    const tip = str(x.wish.tip, 50);
    const words = cleanWords(x.wish.words);
    const rewritten = str(x.wish.rewritten, 200);
    if (sentence && tip && words.length) wish = { sentence, tip, words, ...(rewritten ? { rewritten } : {}) };
  }
  const practice = cleanChars(x.practice);
  return { source: x.source, stars, wish, ...(practice.length ? { practice } : {}) };
}

// ---------- offline card (no AI) ----------

/** What the child added in the mission step: the part of `after` that
 * isn't in `before`, trimmed of punctuation at the edges. */
export function addedText(before: string, after: string): string {
  const a = Array.from(before);
  const b = Array.from(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  return b
    .slice(start, b.length - end)
    .join("")
    .replace(/^[\s，,。！？!?、：:；;]+|[\s，,。！？!?、：:；;]+$/g, "");
}

const WHY_BY_MISSION: Record<SenseId, string> = {
  see: "你写出了看到的样子，画面更清楚了！",
  hear: "你加了声音，故事好像能听见了！",
  smell: "你加了味道，我好像也闻到了！",
  touch: "你写出了摸起来的感觉！",
  feel: "你写出了心里的感觉！",
  pattern: "你用了比喻，好有想象力！",
};

/** Everyday words with richer ones a P2–P4 pupil can use instead. */
export const RICHER_WORDS: Record<string, string[]> = {
  亮: ["闪闪发光", "亮晶晶的", "金灿灿的"],
  大: ["巨大的", "大大的", "高高的"],
  小: ["小小的", "小巧的", "一点点"],
  好: ["很棒", "美好的", "了不起"],
  很: ["非常", "特别", "……极了"],
  高兴: ["开心极了", "笑眯眯地", "乐开了花"],
  开心: ["开心极了", "笑眯眯地", "高兴得跳起来"],
  说: ["喊", "小声地说", "大声地说"],
  看: ["望着", "盯着", "看见"],
  走: ["跑", "蹦蹦跳跳地走", "慢慢地走"],
  红: ["红红的", "红彤彤的", "火红的"],
  吃: ["大口大口地吃", "尝了尝", "咬了一口"],
  美: ["美丽的", "漂亮的", "五颜六色的"],
  然后: ["接着", "忽然", "最后"],
};

/** How many separate times `word` is used in `text`; a doubled form
 * like 亮亮 counts once. */
export function timesUsed(text: string, word: string): number {
  let count = 0;
  let from = 0;
  for (;;) {
    const at = text.indexOf(word, from);
    if (at < 0) return count;
    count++;
    from = at + word.length;
    while (text.startsWith(word, from)) from += word.length;
  }
}

/** The first everyday word a sentence repeats, if any. */
export function repeatedWord(text: string): string | undefined {
  return Object.keys(RICHER_WORDS).find((w) => timesUsed(text, w) >= 2);
}

/** Keeps a star's quote short: a long addition is cut to its last
 * clause, without stray quote marks at the edges. */
export function shortQuote(text: string, max = 8): string {
  const hanCount = (t: string) => Array.from(t).filter(isHan).length;
  let q = text;
  if (hanCount(q) > max) {
    const clauses = q.split(/[，,。；;：:]/).filter((c) => hanCount(c) > 0);
    q = clauses.at(-1) ?? q;
  }
  q = q.replace(/^[\s”"’」]+/, "").replace(/[\s“"‘「]+$/, "");
  return Array.from(q).slice(0, 20).join("");
}

/** A card built without AI: stars for what each mission added, and a
 * wish when a sentence repeats an everyday word. */
export function offlineFeedback(lines: ChildSentence[]): StoryFeedback {
  const stars: FeedbackStar[] = [];
  for (const l of lines) {
    if (stars.length >= 2) break;
    if (!l.missionDone || !l.mission || !l.plain) continue;
    const quote = addedText(l.plain, l.text);
    if (!quote || !Array.from(quote).some(isHan)) continue;
    stars.push({ quote: shortQuote(quote), why: WHY_BY_MISSION[l.mission] });
  }
  let wish: FeedbackWish | undefined;
  for (const l of lines) {
    const word = repeatedWord(l.text);
    if (word) {
      wish = { sentence: l.text, tip: `“${word}”用了两次哦，换一个词试试？`, words: RICHER_WORDS[word] };
      break;
    }
  }
  return { source: "offline", stars, wish };
}

/** True when the child's rewrite is a real change to the sentence. */
export function isRewrite(before: string, after: string): boolean {
  const han = (t: string) => Array.from(t).filter(isHan).join("");
  return han(after).length >= 3 && han(after) !== han(before);
}

/** The card for a finished story: the AI's when it gave one, with the
 * offline card filling in any part it left out. */
export function buildFeedback(ai: FeedbackOut | undefined, lines: ChildSentence[]): StoryFeedback {
  const offline = offlineFeedback(lines);
  const fromAi = ai ? feedbackFromAi(ai, lines.map((l) => l.text)) : null;
  if (!fromAi) return offline;
  return {
    source: "ai",
    stars: fromAi.stars.length ? fromAi.stars : offline.stars,
    wish: fromAi.wish ?? offline.wish,
    ...(fromAi.practice ? { practice: fromAi.practice } : {}),
  };
}
