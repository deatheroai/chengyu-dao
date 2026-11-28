import { charPinyin } from "../story-builder/pinyin";
import { noteById } from "./notes";
import type { DictItem } from "./progress";
import { correctText, parseNote } from "./round";

/**
 * 默写: harder characters she fixed earlier (see writing.ts for which and
 * when), each shown in its sentence from 团团's note with a blank (pinyin
 * over the blank), to write from memory.
 */

export const DICTATION_MAX = 6;
/** The sentence around the blank is cut down to about this many characters. */
const CONTEXT = 26;

export interface DictPrompt {
  item: DictItem;
  char: string;
  /** The sentence before and after the blank (corrected). */
  before: string;
  after: string;
  /** Pinyin of the missing character, read in its sentence. */
  pinyin: string;
  /** A word using it, from its family. */
  word: string;
}

const isEnd = (c: string) => /[。！？]/.test(c);
const isPause = (c: string) => /[，；：。！？]/.test(c);

/** The sentence holding the character at `at`, cut at a pause if it's long. */
function sentenceAround(chars: string[], at: number): [number, number] {
  let a = at;
  let b = at;
  while (a > 0 && !isEnd(chars[a - 1])) a--;
  while (b < chars.length - 1 && !isEnd(chars[b])) b++;
  while (b + 1 < chars.length && /[”’」]/.test(chars[b + 1])) b++;
  if (b - a + 1 > CONTEXT) {
    let ca = at;
    let cb = at;
    while (ca > a && !isPause(chars[ca - 1])) ca--;
    while (cb < b && !isPause(chars[cb])) cb++;
    return [ca, cb];
  }
  // Skip an opening quote's speaker: “…” stays whole.
  while (a < at && /[“”]/.test(chars[a])) a++;
  return [a, b];
}

export function promptFor(item: DictItem): DictPrompt | null {
  const note = noteById(item.noteId);
  if (!note) return null;
  const p = parseNote(note);
  const m = p.mistakes[item.mistake];
  if (!m) return null;
  const text = correctText(p);
  const chars = Array.from(text);
  let [a, b] = sentenceAround(chars, m.cell);
  // The answer shouldn't be in sight (小弟弟在地上（）来爬去): narrow to
  // its clause, and hide any copy still left there.
  if (chars.slice(a, b + 1).filter((c) => c === m.right).length > 1) {
    while (a < m.cell && chars.slice(a, m.cell).some((c) => isPause(c))) a++;
    while (b > m.cell && chars.slice(m.cell + 1, b).some((c) => isPause(c))) b--;
  }
  const hide = (s: string[]) => s.map((c) => (c === m.right ? "＿" : c)).join("");
  const word = m.family.chars.find((c) => c.char === m.right)?.word ?? m.right;
  return {
    item,
    char: m.right,
    before: hide(chars.slice(a, m.cell)),
    // A cut-off sentence doesn't end on a comma.
    after: hide(chars.slice(m.cell + 1, b + 1)).replace(/[，；：]$/, ""),
    pinyin: charPinyin(text)[m.cell] ?? "",
    word,
  };
}
