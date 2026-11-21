import { countHanzi, finishSentence, isUsableSentence, usesWord } from "../story-builder/expansion";
import type { SavedStory } from "../story-builder/library";
import { SENSE_IDS, getSense, type SenseId } from "../story-builder/senses";
import type { Seed } from "./seeds";

/**
 * 句子长大了: the rules of growing one sentence, one sense at a time.
 * No DOM here, so all of it is unit-tested.
 */

/** Senses added to one sentence before 读一读. More turns it into a word pile. */
export const SENSES_PER_SENTENCE = 3;

/** Above this many characters, 读一读 suggests splitting with a comma. */
export const LONG_SENTENCE = 35;

/** One sense the child added: the whole sentence after adding it. */
export interface Layer {
  sense: SenseId;
  text: string;
  /** The sense was really added (⭐). False when the child moved on anyway. */
  done: boolean;
}

/** Where a character of the sentence came from. "edit": the 改一改 step. */
export type Origin = SenseId | "plain" | "edit";

export interface Segment {
  text: string;
  origin: Origin;
}

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const PUNCT = /^[\s，,。！？!?、：:；;“”"‘’'…]+$/u;

/**
 * Longest common subsequence match between two character lists:
 * for each index of `b`, the index of `a` it keeps, or -1 if new.
 * Sentences are short (≤ 120 characters), so O(n·m) is fine.
 */
function matchChars(a: string[], b: string[]): number[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const kept = new Array<number>(m).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      kept[j] = i;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return kept;
}

/**
 * Each character of the final sentence with the step that added it.
 * `steps` are the sentence after each change, in order. A character
 * a step kept keeps its older origin, so additions in two places
 * (白白的小狗在草地上跑) both count for that step.
 */
export function charOrigins(plain: string, steps: { text: string; origin: Origin }[]): { char: string; origin: Origin }[] {
  let cur = Array.from(plain).map((char) => ({ char, origin: "plain" as Origin }));
  for (const step of steps) {
    const next = Array.from(step.text);
    const kept = matchChars(
      cur.map((c) => c.char),
      next,
    );
    cur = next.map((char, j) => ({ char, origin: kept[j] >= 0 ? cur[kept[j]].origin : step.origin }));
  }
  // Punctuation alone doesn't belong to a sense: a new full stop or
  // comma takes the colour of the character before it, or stays plain.
  return cur.map((c, i) =>
    c.origin !== "plain" && PUNCT.test(c.char) ? { ...c, origin: i > 0 ? cur[i - 1].origin : "plain" } : c,
  );
}

/** The final sentence cut into runs of the same origin, for colouring. */
export function segments(plain: string, steps: { text: string; origin: Origin }[]): Segment[] {
  const out: Segment[] = [];
  for (const { char, origin } of charOrigins(plain, steps)) {
    const last = out.at(-1);
    if (last && last.origin === origin) last.text += char;
    else out.push({ text: char, origin });
  }
  return out;
}

/** The sentence steps a grown sentence went through. */
export function layerSteps(layers: Layer[], final?: string): { text: string; origin: Origin }[] {
  const steps = layers.map((l) => ({ text: l.text, origin: l.sense as Origin }));
  const last = layers.at(-1)?.text;
  if (final !== undefined && final !== last) steps.push({ text: final, origin: "edit" });
  return steps;
}

/** The pieces `after` adds to `before`, in order (punctuation-only pieces dropped). */
export function addedRuns(before: string, after: string): string[] {
  const b = Array.from(after);
  const kept = matchChars(Array.from(before), b);
  const runs: string[] = [];
  let run = "";
  b.forEach((c, j) => {
    if (kept[j] < 0) run += c;
    else if (run) {
      runs.push(run);
      run = "";
    }
  });
  if (run) runs.push(run);
  return runs
    .map((r) => r.replace(/^[\s，,。！？!?、：:；;]+|[\s，,。！？!?、：:；;]+$/gu, ""))
    .filter((r) => r && !PUNCT.test(r));
}

/** How many new Chinese characters `after` adds to `before`. */
export function addedHanzi(before: string, after: string): number {
  return countHanzi(addedRuns(before, after).join(""));
}

export type Check =
  | { ok: true; /** A hint word the child used, to praise it. */ used?: string }
  | { ok: false; reason: "empty" | "unchanged" | "gap" };

/**
 * The offline check of one sense (no AI): the child must have added at
 * least one new character. Their own words count; nothing is judged
 * against the word list, which is only used to praise a word they took.
 */
export function offlineCheck(before: string, after: string, words: string[]): Check {
  const text = after.trim();
  if (text.includes("……")) return { ok: false, reason: "gap" };
  if (!isUsableSentence(text)) return { ok: false, reason: "empty" };
  if (addedHanzi(before, text) === 0) return { ok: false, reason: "unchanged" };
  const used = words.find((w) => usesWord(text, w) && !usesWord(before, w));
  return used ? { ok: true, used } : { ok: true };
}

/** What 团团 says when the offline check fails. */
export function checkNote(reason: "empty" | "unchanged" | "gap", sense: SenseId): string {
  if (reason === "gap") return "“……”的地方还空着，填上你想到的东西吧！";
  if (reason === "empty") return "句子不见了，再写一写吧！";
  return `先把${getSense(sense).label}的东西加进句子里吧！`;
}

/** Senses still open for this sentence. */
export function openSenses(layers: Layer[]): SenseId[] {
  return SENSE_IDS.filter((s) => !layers.some((l) => l.sense === s));
}

/** 团团's question for a sense: about the picture when there is one. */
export function questionFor(seed: Seed | undefined, sense: SenseId): string {
  return seed?.questions[sense] ?? getSense(sense).question;
}

/** Three 💡 words: 团团's (AI) ones first, then the picture's, then general ones. */
export function hintsFor(seed: Seed | undefined, sense: SenseId, ai: string[] = []): string[] {
  const all = [...ai, ...(seed?.words[sense] ?? []), ...getSense(sense).words];
  return [...new Set(all)].slice(0, 3);
}

/** A worked example on a different sentence, so the child sees how, without copying. */
export const EXAMPLES: Record<SenseId, { plain: string; rich: string }> = {
  see: { plain: "花开了。", rich: "红红的花开了。" },
  hear: { plain: "门开了。", rich: "门“吱呀”一声开了。" },
  smell: { plain: "饭做好了。", rich: "香喷喷的饭做好了。" },
  touch: { plain: "我摸了摸小兔。", rich: "我摸了摸小兔软软的毛。" },
  feel: { plain: "弟弟拿到了礼物。", rich: "弟弟拿到了礼物，开心得跳了起来。" },
  pattern: { plain: "天上有白云。", rich: "天上的白云像一团团棉花。" },
};

/** “从 4 个字长到 18 个字！” */
export function growthText(plain: string, final: string): string {
  return `从 ${countHanzi(plain)} 个字长到 ${countHanzi(final)} 个字！`;
}

export function isLong(text: string): boolean {
  return countHanzi(text) > LONG_SENTENCE;
}

/** Stars earned on a grown sentence. */
export const starCount = (layers: Layer[]) => layers.filter((l) => l.done).length;

/**
 * Short sentences the child wrote in 我的故事书, newest story first, to
 * grow again. A sentence's plain version (before its mission) is used
 * when there is one, so there's room to grow. Parent and 团团 lines are
 * never used.
 */
export function seedsFromLibrary(stories: SavedStory[], max = 6): Seed[] {
  const out: Seed[] = [];
  const seen = new Set<string>();
  for (const story of stories) {
    story.lines.forEach((line, i) => {
      if (line.by !== "child") return;
      const plain = finishSentence((line.plain ?? line.text).trim());
      const n = countHanzi(plain);
      if (n < 4 || n > 16 || plain.includes("……") || seen.has(plain)) return;
      if (!Array.from(plain).some(isHan)) return;
      seen.add(plain);
      out.push({ id: `story:${story.id}:${i}`, emoji: "📚", title: story.title, plain, questions: {}, words: {}, fromStory: true });
    });
  }
  return out.slice(0, max);
}
