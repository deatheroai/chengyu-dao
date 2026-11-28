import { strokeCount } from "../story-builder/strokeCounts";
import { noteById } from "./notes";
import type { DictItem, Progress } from "./progress";
import { parseNote } from "./round";

/**
 * When 火眼金睛 asks her to write. Writing on a screen is slow and
 * fiddly, and finding mistakes is the fun part, so:
 *  - only harder characters (MIN_STROKES or more) are ever written:
 *    场 or 在 are just picked;
 *  - each one is written at most WRITE_TIMES times, ever: once right
 *    after she first fixes it, once more in a 默写 later;
 *  - never twice within GAP_MS, so the second time is real recall.
 */
export const MIN_STROKES = 9;
export const WRITE_TIMES = 2;
export const GAP_MS = 3 * 60 * 1000;

export const isComplex = (char: string): boolean => strokeCount(char) >= MIN_STROKES;

export const timesWritten = (p: Progress, char: string): number => p.writes?.[char]?.n ?? 0;

/** Write it right after fixing it: a harder character she has never written. */
export const writeAfterFix = (p: Progress, char: string): boolean => isComplex(char) && timesWritten(p, char) === 0;

/** One try at writing `char` (after a fix or in 默写): `counted` when it went well enough to count. */
export function withWrite(p: Progress, char: string, now: number, counted = true): Progress {
  const old = p.writes?.[char] ?? { n: 0, at: 0 };
  return { ...p, writes: { ...p.writes, [char]: { n: old.n + (counted ? 1 : 0), at: now } } };
}

export const charOf = (item: DictItem): string | undefined => {
  const n = noteById(item.noteId);
  return n ? parseNote(n).mistakes[item.mistake]?.right : undefined;
};

/** After a fix: a harder character not yet written twice goes on the list for a later 默写. */
export function withToWrite(p: Progress, item: DictItem): Progress {
  const c = charOf(item);
  if (!c || !isComplex(c) || timesWritten(p, c) >= WRITE_TIMES) return p;
  if ((p.toWrite ?? []).some((i) => charOf(i) === c)) return p;
  return { ...p, toWrite: [...(p.toWrite ?? []), item].slice(-20) };
}

/** The ones ready for 默写 now: not written in the last GAP_MS. */
export function dueNow(p: Progress, now: number): DictItem[] {
  return (p.toWrite ?? []).filter((i) => {
    const c = charOf(i);
    if (!c) return false;
    const at = p.writes?.[c]?.at ?? 0;
    return timesWritten(p, c) < WRITE_TIMES && now - at >= GAP_MS;
  });
}

/** Ones still waiting (written too recently). */
export const waiting = (p: Progress, now: number): number => (p.toWrite ?? []).length - dueNow(p, now).length;

/** After a 默写: each try is recorded; written twice means done. */
export function afterDictation(p: Progress, results: readonly { item: DictItem; ok: boolean }[], now: number): Progress {
  let out = p;
  for (const r of results) {
    const c = charOf(r.item);
    if (c) out = withWrite(out, c, now, r.ok);
  }
  const toWrite = (out.toWrite ?? []).filter((i) => {
    const c = charOf(i);
    return c !== undefined && timesWritten(out, c) < WRITE_TIMES;
  });
  out = { ...out, toWrite };
  if (!toWrite.length) delete (out as Partial<Progress>).toWrite;
  return out;
}
