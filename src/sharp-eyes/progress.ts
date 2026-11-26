import { isTestMode } from "../story-builder/library";
import { NOTES } from "./notes";
import type { Stamp } from "./round";

/**
 * 火眼金睛 progress, kept in this browser only: the best stamp per note,
 * and the day of the last find (her first find each day gets an extra
 * big cheer). `?test` keeps a separate copy, as on the other pages.
 */
export interface Progress {
  stamps: Record<string, Stamp>;
  /** "YYYY-MM-DD" of the last mistake found. */
  lastFindDay?: string;
  /** Characters she has written before: after the first time, she
   * writes them alone straight away. */
  written?: string[];
  /** Notes where she wrote every fixed character with no wrong stroke. */
  pens?: string[];
  /** 默写 characters to write again: missed ones come first next time. */
  review?: DictItem[];
  /** Most 优 in one session, for the report card. */
  bestSession?: number;
}

/** One fixed character, by the note and mistake it came from. */
export interface DictItem {
  noteId: string;
  mistake: number;
}

const KEY = "chengyu-dao:sharp-eyes:progress:v1";
const key = () => (isTestMode() ? `${KEY}:test` : KEY);
const RANK: Record<Stamp, number> = { 加油: 0, 良: 1, 优: 2 };
const isStamp = (x: unknown): x is Stamp => x === "优" || x === "良" || x === "加油";

export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(key()) ?? "{}") as Partial<Progress>;
    const stamps: Record<string, Stamp> = {};
    if (raw && typeof raw.stamps === "object" && raw.stamps) {
      for (const [id, s] of Object.entries(raw.stamps)) if (isStamp(s) && NOTES.some((n) => n.id === id)) stamps[id] = s;
    }
    const out: Progress = { stamps };
    if (typeof raw?.lastFindDay === "string") out.lastFindDay = raw.lastFindDay;
    const strs = (x: unknown) => (Array.isArray(x) ? x.filter((c): c is string => typeof c === "string") : []);
    const written = strs(raw?.written).filter((c) => Array.from(c).length === 1);
    if (written.length) out.written = [...new Set(written)];
    const pens = strs(raw?.pens).filter((id) => NOTES.some((n) => n.id === id));
    if (pens.length) out.pens = [...new Set(pens)];
    const review = (Array.isArray(raw?.review) ? raw.review : []).filter(isDictItem);
    if (review.length) out.review = review;
    if (Number.isInteger(raw?.bestSession) && (raw.bestSession as number) > 0) out.bestSession = raw.bestSession;
    return out;
  } catch {
    return { stamps: {} };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(key(), JSON.stringify(p));
  } catch {
    /* storage full or blocked: progress just isn't kept */
  }
}

function isDictItem(x: unknown): x is DictItem {
  const d = x as DictItem;
  if (!d || typeof d.noteId !== "string" || !Number.isInteger(d.mistake) || d.mistake < 0) return false;
  const n = NOTES.find((n) => n.id === d.noteId);
  return !!n && d.mistake < n.oops.length;
}

/** Whether she has written `char` before. */
export const hasWritten = (p: Progress, char: string): boolean => (p.written ?? []).includes(char);

export const withWritten = (p: Progress, char: string): Progress =>
  hasWritten(p, char) ? p : { ...p, written: [...(p.written ?? []), char] };

/** Every fixed character in the note written with no wrong stroke: ✍️. */
export const withPen = (p: Progress, noteId: string): Progress =>
  (p.pens ?? []).includes(noteId) ? p : { ...p, pens: [...(p.pens ?? []), noteId] };

/** Keeps the better of the old and new stamp. */
export function withStamp(p: Progress, noteId: string, stamp: Stamp): Progress {
  const old = p.stamps[noteId];
  if (old && RANK[old] >= RANK[stamp]) return p;
  return { ...p, stamps: { ...p.stamps, [noteId]: stamp } };
}

export const today = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** True for her first find today; the progress then remembers today. */
export function firstFindToday(p: Progress, now = new Date()): { progress: Progress; first: boolean } {
  const d = today(now);
  return { progress: { ...p, lastFindDay: d }, first: p.lastFindDay !== d };
}

/** How many notes have a stamp. */
export const notesDone = (p: Progress): number => Object.keys(p.stamps).length;
