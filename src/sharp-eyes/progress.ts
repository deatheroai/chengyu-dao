import { isTestMode } from "../story-builder/library";
import { LEVELS, type Level } from "./families";
import { NOTES, type Note, type NoteKind } from "./notes";
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
    const day = typeof raw?.lastFindDay === "string" ? raw.lastFindDay : undefined;
    return day ? { stamps, lastFindDay: day } : { stamps };
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

/** Notes of a kind in play order: by level, then as written. */
const inOrder = (kind: NoteKind): Note[] => LEVELS.flatMap((l) => NOTES.filter((n) => n.level === l && n.kind === kind));

/**
 * The note to offer next: the starter until it's done, then the first
 * note without a stamp, then (when all have one) the first one not yet
 * 优, then the first note again.
 */
export function nextNote(p: Progress, kind: NoteKind = "find"): Note {
  const notes = inOrder(kind);
  const starter = notes.find((n) => n.starter);
  if (starter && !p.stamps[starter.id]) return starter;
  return notes.find((n) => !p.stamps[n.id]) ?? notes.find((n) => p.stamps[n.id] !== "优") ?? notes[0];
}

/** How many notes have a stamp. */
export const notesDone = (p: Progress): number => Object.keys(p.stamps).length;

/** The highest level she has reached, by the next note's level. */
export const currentLevel = (p: Progress): Level => nextNote(p).level;
