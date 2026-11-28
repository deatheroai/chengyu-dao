import type { Fix } from "../story-builder/corrections";
import type { SavedStory } from "../story-builder/library";
import type { Family, Level } from "./families";
import type { Note } from "./notes";
import type { Progress } from "./progress";

/**
 * Her own slips: words 团团 corrected in her story-builder sentences
 * (芭莎 → 巴刹), turned into ⚡ 快手改 sentences. Her own sentence comes
 * back with the old mistake put in, and 团团 says he learned it from
 * her. Each changed character becomes a mistake to find; the choice is
 * between what she wrote and the right character.
 */

const MAX_CHARS = 22;
const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const isPause = (c: string) => /[，。！？；：、]/.test(c);

export interface OwnSlip {
  id: string;
  /** The part of her (corrected) sentence holding the word. */
  sentence: string;
  fix: Fix;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** The clause around `at…at+len` in `chars`, if the whole sentence is long. */
function around(chars: string[], at: number, len: number): string {
  if (chars.length <= MAX_CHARS) return chars.join("");
  let a = at;
  let b = at + len - 1;
  while (a > 0 && !isPause(chars[a - 1])) a--;
  while (b < chars.length - 1 && !isPause(chars[b])) b++;
  return chars.slice(a, b + 1).join("");
}

/** Every slip in her saved stories, newest story first, one per sentence and word. */
export function slipsFromLibrary(stories: readonly SavedStory[]): OwnSlip[] {
  const out: OwnSlip[] = [];
  const seen = new Set<string>();
  for (const story of stories) {
    for (const line of story.lines) {
      if (line.by !== "child") continue;
      for (const fix of line.fixes ?? []) {
        const w = Array.from(fix.wrong);
        const r = Array.from(fix.right);
        if (w.length !== r.length || !r.every(isHan) || !w.some((c, i) => c !== r[i] && isHan(c))) continue;
        const chars = Array.from(line.text);
        const at = line.text.indexOf(fix.right);
        if (at < 0) continue;
        const sentence = around(chars, Array.from(line.text.slice(0, at)).length, r.length);
        if (Array.from(sentence).length > 40) continue;
        const id = `own-${hash(`${fix.right}|${fix.wrong}|${sentence}`)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, sentence, fix });
      }
    }
  }
  return out;
}

/** The slip as a ⚡ note: her sentence with her old characters marked as mistakes. */
export function slipNote(slip: OwnSlip, level: Level): Note {
  const w = Array.from(slip.fix.wrong);
  const r = Array.from(slip.fix.right);
  const at = slip.sentence.indexOf(slip.fix.right);
  const before = slip.sentence.slice(0, at);
  const after = slip.sentence.slice(at + slip.fix.right.length);
  const families: Family[] = [];
  const oops: string[] = [];
  const word = r
    .map((c, i) => {
      if (c === w[i] || !isHan(w[i])) return c;
      families.push({
        id: `own:${w[i]}${c}`,
        level,
        kind: "sound",
        clue: slip.fix.why || `你以前把「${slip.fix.right}」写成了「${slip.fix.wrong}」。`,
        chars: [
          { char: c, meaning: slip.fix.why, word: slip.fix.right },
          { char: w[i], meaning: "", word: slip.fix.wrong },
        ],
      });
      oops.push(`你以前也写过“${slip.fix.wrong}”！${slip.fix.why}`);
      return `{${w[i]}|${c}}`;
    })
    .join("");
  return { id: slip.id, level, kind: "quick", emoji: "📒", title: "你写过的句子", text: before + word + after, oops, families };
}

/** The slip to show next: one not shown before, else the one shown longest ago. */
export function nextSlip(p: Progress, slips: readonly OwnSlip[]): OwnSlip | undefined {
  const seen = p.ownSeen ?? [];
  return slips.find((s) => !seen.includes(s.id)) ?? [...slips].sort((a, b) => seen.indexOf(a.id) - seen.indexOf(b.id))[0];
}

export function withOwnSeen(p: Progress, id: string): Progress {
  return { ...p, ownSeen: [...(p.ownSeen ?? []).filter((x) => x !== id), id].slice(-50) };
}
