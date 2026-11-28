import { createRng, seedFromString } from "../idiom-door/seededRandom";
import { familyOf, type Family } from "./families";
import type { Note } from "./notes";

/**
 * One note being marked. The child taps characters she thinks are
 * wrong (a wrong tap uses a drop of red ink), then picks the right
 * character from its family and writes it. Running out of ink is never
 * game over: 团团 shows what's left and the note gets a lower stamp.
 */

export const INK = 3;

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const isBreak = (c: string) => /[，。！？；：、“”]/.test(c);

export interface Cell {
  /** What is shown: what 团团 wrote. */
  char: string;
  /** Index into `mistakes` when this character is wrong. */
  mistake?: number;
}

export interface Mistake {
  cell: number;
  wrong: string;
  right: string;
  family: Family;
  oops: string;
}

export interface ParsedNote {
  note: Note;
  cells: Cell[];
  mistakes: Mistake[];
}

const MARK = /\{([^|{}]*)\|([^|{}]*)\}/g;

/** Splits a note's text into cells and its mistakes. Throws on bad
 * markup, so broken content fails its test instead of the game. */
export function parseNote(note: Note): ParsedNote {
  const cells: Cell[] = [];
  const mistakes: Mistake[] = [];
  let last = 0;
  const push = (s: string) => {
    for (const char of Array.from(s)) {
      if (char === "{" || char === "}" || char === "|") throw new Error(`${note.id}: stray "${char}"`);
      cells.push({ char });
    }
  };
  for (const m of note.text.matchAll(MARK)) {
    push(note.text.slice(last, m.index));
    const [, wrong, right] = m;
    const family =
      familyOf(wrong, right) ?? note.families?.find((f) => f.chars.some((c) => c.char === wrong) && f.chars.some((c) => c.char === right));
    if (Array.from(wrong).length !== 1 || Array.from(right).length !== 1 || wrong === right || !family) {
      throw new Error(`${note.id}: bad mistake {${wrong}|${right}}`);
    }
    const i = mistakes.length;
    if (note.oops[i] === undefined) throw new Error(`${note.id}: no oops for mistake ${i + 1}`);
    mistakes.push({ cell: cells.length, wrong, right, family, oops: note.oops[i] });
    cells.push({ char: wrong, mistake: i });
    last = (m.index ?? 0) + m[0].length;
  }
  push(note.text.slice(last));
  if (note.oops.length !== mistakes.length) throw new Error(`${note.id}: ${note.oops.length} oops for ${mistakes.length} mistakes`);
  return { note, cells, mistakes };
}

/** The note as 团团 wrote it (with the mistakes). */
export const writtenText = (p: ParsedNote): string => p.cells.map((c) => c.char).join("");

/** The note with every mistake fixed. */
export const correctText = (p: ParsedNote): string =>
  p.cells.map((c) => (c.mistake === undefined ? c.char : p.mistakes[c.mistake].right)).join("");

/** Whether a cell can be tapped (characters only, not punctuation). */
export const tappable = (p: ParsedNote, cell: number): boolean => isHan(p.cells[cell]?.char ?? "");

export interface RoundState {
  ink: number;
  /** Mistakes found (by index), in the order found. */
  found: number[];
  /** Mistakes fixed: the right character picked. */
  fixed: number[];
  /** Cells tapped that weren't wrong. */
  wrongTaps: number[];
  /** Fix picks that weren't right, for the stamp. */
  wrongPicks: number;
  /** Hints used for the mistake 团团 is helping with, and in total. */
  hintStep: number;
  hints: number;
  /** "ink": ran out of ink. "done": 改好了 tapped (essay). */
  ended?: "ink" | "done";
  /** The starter note: wrong taps cost no ink. */
  freeInk: boolean;
}

export function newRound(p: ParsedNote): RoundState {
  return { ink: INK, found: [], fixed: [], wrongTaps: [], wrongPicks: 0, hintStep: 0, hints: 0, freeInk: p.note.starter === true };
}

export type TapResult =
  /** A mistake found: show the oops, then the fix choices. */
  | { kind: "found"; mistake: number }
  /** Tapped something already found, already tapped, punctuation, or the round is over. */
  | { kind: "nothing" }
  /** Not a mistake: one drop of ink (unless free). `out` when that was the last drop. */
  | { kind: "wrong"; out: boolean };

export function tap(p: ParsedNote, s: RoundState, cell: number): { state: RoundState; result: TapResult } {
  const nothing = { state: s, result: { kind: "nothing" } as TapResult };
  if (s.ended || !tappable(p, cell)) return nothing;
  const m = p.cells[cell].mistake;
  if (m !== undefined) {
    if (s.found.includes(m)) return nothing;
    return { state: { ...s, found: [...s.found, m], hintStep: 0 }, result: { kind: "found", mistake: m } };
  }
  if (s.wrongTaps.includes(cell)) return nothing;
  const ink = s.freeInk ? s.ink : s.ink - 1;
  const out = ink <= 0;
  return {
    state: { ...s, ink, wrongTaps: [...s.wrongTaps, cell], ended: out ? "ink" : undefined },
    result: { kind: "wrong", out },
  };
}

/** The characters to pick from for a mistake: the right one, the wrong
 * one, and others of its family, at most `max`, in a fixed shuffled
 * order (so the right one isn't always first). */
export function choices(p: ParsedNote, mistake: number, max = 4): string[] {
  const m = p.mistakes[mistake];
  const others = m.family.chars.map((c) => c.char).filter((c) => c !== m.right && c !== m.wrong);
  const picked = [m.right, m.wrong, ...others].slice(0, Math.max(2, max));
  const rng = createRng(seedFromString(`${p.note.id}:${mistake}`));
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

/** Picking a character to fix a found mistake. A wrong pick costs no
 * ink; 团团 just says what that character means. */
export function pick(p: ParsedNote, s: RoundState, mistake: number, char: string): { state: RoundState; right: boolean } {
  if (!s.found.includes(mistake) || s.fixed.includes(mistake)) return { state: s, right: false };
  if (char === p.mistakes[mistake].right) return { state: { ...s, fixed: [...s.fixed, mistake] }, right: true };
  return { state: { ...s, wrongPicks: s.wrongPicks + 1 }, right: false };
}

/** Mistakes not found yet. */
export const left = (p: ParsedNote, s: RoundState): number[] =>
  p.mistakes.map((_, i) => i).filter((i) => !s.found.includes(i));

/** Every mistake found and fixed. */
export const allFixed = (p: ParsedNote, s: RoundState): boolean => s.fixed.length === p.mistakes.length;

/** The note is over: out of ink, 改好了 tapped, or (except in an essay,
 * where she isn't told how many there are) everything fixed. */
export const isOver = (p: ParsedNote, s: RoundState): boolean =>
  s.ended !== undefined || (p.note.kind !== "essay" && allFixed(p, s));

/** 改好了 (essays): ends the note; anything not found is missed. */
export const finish = (s: RoundState): RoundState => (s.ended ? s : { ...s, ended: "done" });

export interface Hint {
  mistake: number;
  /** 1: the part of the sentence; 2: a few characters; 3: the character, with the family's clue. */
  step: 1 | 2 | 3;
  /** Cells to highlight. */
  cells: number[];
  clue?: string;
}

/** The part of the note (between punctuation) that holds a cell. */
function clauseOf(p: ParsedNote, cell: number): number[] {
  let a = cell;
  let b = cell;
  while (a > 0 && !isBreak(p.cells[a - 1].char)) a--;
  while (b < p.cells.length - 1 && !isBreak(p.cells[b + 1].char)) b++;
  return Array.from({ length: b - a + 1 }, (_, i) => a + i).filter((i) => tappable(p, i));
}

/** 🔍 提示: never costs ink. Each tap narrows down the next mistake not
 * found yet: which part of the sentence, then which few characters,
 * then the character itself with the family's clue. */
export function hint(p: ParsedNote, s: RoundState): { state: RoundState; hint: Hint } | null {
  const next = left(p, s)[0];
  if (next === undefined || s.ended) return null;
  const step = Math.min(3, s.hintStep + 1) as 1 | 2 | 3;
  const m = p.mistakes[next];
  let cells: number[];
  if (step === 1) cells = clauseOf(p, m.cell);
  else if (step === 2) {
    const clause = clauseOf(p, m.cell);
    const at = clause.indexOf(m.cell);
    const from = Math.max(0, Math.min(at - 1, clause.length - 3));
    cells = clause.slice(from, from + 3);
  } else cells = [m.cell];
  return {
    state: { ...s, hintStep: step, hints: s.hints + 1 },
    hint: { mistake: next, step, cells, clue: step === 3 ? m.family.clue : undefined },
  };
}

export type Stamp = "优" | "良" | "加油";

/** 优: everything found with at most one wrong tap. 良: everything
 * found. 加油: something missed. Hints never lower the stamp. */
export function stamp(p: ParsedNote, s: RoundState): Stamp {
  if (left(p, s).length > 0) return "加油";
  return s.wrongTaps.length <= 1 ? "优" : "良";
}
