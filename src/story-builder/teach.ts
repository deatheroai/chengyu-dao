import { fixedChars } from "./corrections";
import type { StoryFeedback } from "./feedback";
import { isTestMode, type StoryLine } from "./library";
import { strokeCount } from "./strokeCounts";

/**
 * 教团团写字: after a story, 团团 asks the child to teach him a few
 * characters from their own sentences, so the child never has to pick
 * from a wall of every character they typed. This module chooses those
 * characters and remembers which ones 团团 has already learned.
 */

/** How many characters 团团 asks about after one story. */
export const TEACH_COUNT = 3;

/**
 * Very common characters a P2–P4 child already writes all the time.
 * They're only used when a story has nothing more interesting.
 */
export const EVERYDAY_CHARS = new Set(
  Array.from(
    "的一是不了人我在有他她它这那中大小上下来去个们到说你和也就要会出天好里子没看只把都很吗呢吧啊着过对地得多还家起为可能自己后什么时想开又再从让给被跟用做一二三四五六七八九十口日月水火山木土手目耳头心长生多少白",
  ),
);

const isHan = (c: string) => /\p{Script=Han}/u.test(c);

export interface TeachPick {
  char: string;
  /** The child's sentence it came from, to show it in context. */
  sentence: string;
}

/** Points for how hard a character is to write: few strokes (人, 大)
 * count against it, many strokes (糖, 鹰) for it. */
export function strokeScore(char: string): number {
  const n = strokeCount(char);
  if (n <= 4) return -3;
  if (n <= 6) return -1;
  if (n <= 8) return 1;
  return 3;
}

/**
 * Up to `count` characters for 团团 to learn, best first: characters the
 * child wrote wrong and fixed (错别字) come first, then ones the AI
 * suggested, ones in words the 好词卡 starred, and ones the child added
 * while doing a mission (or in the 好词卡 rewrite). Characters with many
 * strokes beat simple ones. Very common characters and ones 团团 already
 * learned go last, so they only appear when there's nothing else. Ties
 * keep story order, and picks avoid neighbouring characters so they come
 * from different words (except fixed ones: 巴 and 刹 are both the point).
 */
export function pickCharsToTeach(
  lines: StoryLine[],
  feedback?: StoryFeedback,
  learned: ReadonlySet<string> = new Set(),
  count = TEACH_COUNT,
): TeachPick[] {
  const child = lines.filter((l) => l.by === "child");
  const starred = new Set((feedback?.stars ?? []).flatMap((s) => Array.from(s.quote)));
  const rewritten = new Set(Array.from(feedback?.wish?.rewritten ?? ""));
  const suggested = new Set(feedback?.practice ?? []);
  const fixed = new Set(child.flatMap((l) => (l.fixes ?? []).flatMap(fixedChars)));

  const seen = new Map<string, { pick: TeachPick; score: number; order: number; prev: string; next: string; fixed: boolean; known: boolean }>();
  for (const line of child) {
    const before = new Set(Array.from(line.plain ?? line.text));
    const text = Array.from(line.text);
    for (const [i, c] of text.entries()) {
      if (!isHan(c) || seen.has(c)) continue;
      const wasFixed = fixed.has(c);
      let score = strokeScore(c);
      if (wasFixed) score += 20;
      if (suggested.has(c)) score += 4;
      if (starred.has(c)) score += 3;
      if (!before.has(c) || rewritten.has(c)) score += 2;
      const everyday = EVERYDAY_CHARS.has(c) && !wasFixed;
      const known = everyday || (learned.has(c) && !wasFixed);
      if (everyday) score -= 10;
      if (learned.has(c) && !wasFixed) score -= 5;
      seen.set(c, {
        pick: { char: c, sentence: line.text },
        score,
        order: seen.size,
        prev: text[i - 1] ?? "",
        next: text[i + 1] ?? "",
        fixed: wasFixed,
        known,
      });
    }
  }
  const ranked = [...seen.values()].sort((a, b) => b.score - a.score || a.order - b.order);
  // Spread the picks over different words: first skip characters right
  // next to one already picked (哗 then 啦 in 哗啦啦) and everyday or
  // already-learned ones, then fill up in rank order.
  const chosen: typeof ranked = [];
  for (const x of ranked) {
    if (chosen.length >= count) break;
    const besidePick = chosen.some((p) => p.pick.char === x.prev || p.pick.char === x.next);
    if (!x.known && (x.fixed || !besidePick)) chosen.push(x);
  }
  for (const x of ranked) {
    if (chosen.length >= count) break;
    if (!chosen.includes(x)) chosen.push(x);
  }
  return chosen.sort((a, b) => ranked.indexOf(a) - ranked.indexOf(b)).map((x) => x.pick);
}

// ---------- characters 团团 has learned (this device only) ----------

const KEY = "chengyu-dao:story-builder:taught:v1";
const taughtKey = () => (isTestMode() ? `${KEY}:test` : KEY);

/** Characters the child has taught 团团 so far. */
export function loadTaught(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(taughtKey());
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string" && isHan(c)) : [];
  } catch {
    return [];
  }
}

/** Records that 团团 learned `char`; returns the full list. */
export function saveTaught(char: string): string[] {
  const list = loadTaught();
  if (!list.includes(char)) list.push(char);
  try {
    globalThis.localStorage?.setItem(taughtKey(), JSON.stringify(list));
  } catch {
    /* storage blocked: 团团 still learns it on screen */
  }
  return list;
}
