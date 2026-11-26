import { LEVELS, type Level } from "./families";
import { NOTES, type Note, type NoteKind } from "./notes";
import type { Progress } from "./progress";
import type { Stamp } from "./round";

/**
 * One 火眼金睛 session: two notes where she's told how many mistakes
 * there are, a ⚡ 快手改 round (three one-sentence fixes against a
 * gentle clock), then 团团's 作文 (count not told), a 🏅 report card,
 * and 默写. She can stop after any note. Her very first session opens
 * with the starter note.
 *
 * Levels: she plays at the lowest level where she hasn't yet got 优 on
 * 60% of its notes; reaching that opens the next level.
 */

export const UNLOCK_SHARE = 0.6;
export const QUICK_COUNT = 3;
/** Seconds per 快手改 sentence for ⚡. Running over is fine, just no ⚡. */
export const QUICK_SECONDS: Record<Level, number> = { 3: 20, 4: 20, 5: 25 };

export interface Stage {
  kind: NoteKind;
  notes: Note[];
}

const levelNotes = (level: Level): Note[] => NOTES.filter((n) => n.level === level);

/** How far she is on a level: 优 so far and how many open the next one. */
export function levelProgress(p: Progress, level: Level): { best: number; needed: number; total: number } {
  const notes = levelNotes(level);
  return {
    best: notes.filter((n) => p.stamps[n.id] === "优").length,
    needed: Math.ceil(notes.length * UNLOCK_SHARE),
    total: notes.length,
  };
}

/** The level she plays at now. */
export function currentLevel(p: Progress): Level {
  for (const level of LEVELS.slice(0, -1)) {
    const { best, needed } = levelProgress(p, level);
    if (best < needed) return level;
  }
  return LEVELS[LEVELS.length - 1];
}

/** More 优 needed to open the next level, or 0 at the top level. */
export function toNextLevel(p: Progress, level: Level): number {
  if (level === LEVELS[LEVELS.length - 1]) return 0;
  const { best, needed } = levelProgress(p, level);
  return Math.max(0, needed - best);
}

/**
 * Up to `n` notes of a kind at a level, best to practise first: never
 * played, then not yet 优, then the rest; skipping `exclude`.
 */
export function pickNotes(p: Progress, level: Level, kind: NoteKind, n: number, exclude: readonly string[] = []): Note[] {
  const pool = levelNotes(level).filter((x) => x.kind === kind && !x.starter && !exclude.includes(x.id));
  const rank = (x: Note) => (!p.stamps[x.id] ? 0 : p.stamps[x.id] !== "优" ? 1 : 2);
  return [...pool].sort((a, b) => rank(a) - rank(b)).slice(0, n);
}

export function planSession(p: Progress, level: Level = currentLevel(p)): Stage[] {
  const starter = NOTES.find((n) => n.starter);
  const firstTime = starter !== undefined && !p.stamps[starter.id];
  const finds = pickNotes(p, level, "find", firstTime ? 1 : 2);
  const stages: Stage[] = [];
  if (firstTime) stages.push({ kind: "find", notes: [starter] });
  for (const n of finds) stages.push({ kind: "find", notes: [n] });
  const quick = pickNotes(p, level, "quick", QUICK_COUNT);
  if (quick.length) stages.push({ kind: "quick", notes: quick });
  const essay = pickNotes(p, level, "essay", 1);
  if (essay.length) stages.push({ kind: "essay", notes: essay });
  return stages;
}

/** A 快手改 sentence is ⚡ when fixed within its time. */
export const isFast = (level: Level, seconds: number): boolean => seconds <= QUICK_SECONDS[level];

/** What happened in one stage, for the report card. */
export interface StageResult {
  kind: NoteKind;
  /** One stamp per note (three for 快手改). */
  stamps: Stamp[];
  /** 快手改 only: how many were ⚡. */
  fast?: number;
  /** ✍️ 金笔 earned. */
  pen?: boolean;
}

export interface Report {
  best: number;
  total: number;
  fast: number;
  pens: number;
  /** Compared with her best session before this one. */
  beatBest: boolean;
  line: string;
}

export function report(results: readonly StageResult[], bestBefore: number): Report {
  const stamps = results.flatMap((r) => r.stamps);
  const best = stamps.filter((s) => s === "优").length;
  const fast = results.reduce((n, r) => n + (r.fast ?? 0), 0);
  const pens = results.filter((r) => r.pen).length;
  const beatBest = best > bestBefore;
  let line: string;
  if (stamps.length && best === stamps.length) line = "全部都是“优”！团团的老师说：这是谁帮你改的？太厉害了！";
  else if (beatBest && bestBefore > 0) line = `这次有 ${best} 个“优”，比你以前最好的还多！`;
  else if (best > 0) line = `这次有 ${best} 个“优”！团团的字越来越少错了，都是你的功劳！`;
  else line = "团团今天写错的字可真多……幸好有你帮他！下次一定更好。";
  return { best, total: stamps.length, fast, pens, beatBest, line };
}

/** Label for the next stage on the end card's button. */
export function nextStageLabel(stage: Stage | undefined): string {
  if (!stage) return "看成绩单 🏅";
  if (stage.kind === "quick") return "下一关：⚡ 快手改";
  if (stage.kind === "essay") return "最后一关：团团的作文 📒";
  return "再来一张 📝";
}
