import { LEVELS, type Level } from "./families";
import { NOTES, type Note, type NoteKind } from "./notes";
import type { Progress } from "./progress";
import type { Stamp } from "./round";

/**
 * One 火眼金睛 session: 📝 ⚡ 📝 ⚡ 📒. A note where she's told how many
 * mistakes there are, a ⚡ 快手改 round (four one-sentence fixes against
 * a gentle clock), another note, another ⚡ round, then 团团's 作文
 * (count not told) and a 🏅 report card. She can stop after any note.
 * Her very first session opens with the starter note. ⚡ was her
 * favourite part (2026-11-28), hence two rounds.
 *
 * Levels: she plays at the lowest level where she hasn't yet got 优 on
 * 60% of its notes; reaching that opens the next level.
 */

export const UNLOCK_SHARE = 0.6;
export const QUICK_COUNT = 4;
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
 * Up to `n` notes of a kind at a level, best to practise first: ones
 * she missed something in (加油 or 良) come back first, then ones never
 * played, then the rest; skipping `exclude`.
 */
export function pickNotes(p: Progress, level: Level, kind: NoteKind, n: number, exclude: readonly string[] = []): Note[] {
  const pool = levelNotes(level).filter((x) => x.kind === kind && !x.starter && !exclude.includes(x.id));
  const rank = (x: Note) => (!p.stamps[x.id] ? 1 : p.stamps[x.id] !== "优" ? 0 : 2);
  return [...pool].sort((a, b) => rank(a) - rank(b)).slice(0, n);
}

export function planSession(p: Progress, level: Level = currentLevel(p)): Stage[] {
  const starter = NOTES.find((n) => n.starter);
  const firstTime = starter !== undefined && !p.stamps[starter.id];
  const finds = [...(firstTime ? [starter] : []), ...pickNotes(p, level, "find", firstTime ? 1 : 2)];
  const quick = pickNotes(p, level, "quick", QUICK_COUNT * 2);
  const rounds = [quick.slice(0, QUICK_COUNT), quick.slice(QUICK_COUNT)].filter((r) => r.length >= 2);
  const stages: Stage[] = [];
  finds.forEach((n, i) => {
    stages.push({ kind: "find", notes: [n] });
    if (rounds[i]) stages.push({ kind: "quick", notes: rounds[i] });
  });
  const essay = pickNotes(p, level, "essay", 1);
  if (essay.length) stages.push({ kind: "essay", notes: essay });
  return stages;
}

/** Her fastest 快手改 sentence at this level, in seconds. */
export const fastest = (p: Progress, level: Level): number | undefined => p.fastest?.[level];

/** Seconds to one decimal, as shown. */
export const roundSeconds = (seconds: number): number => Math.round(seconds * 10) / 10;

/** Records a fixed sentence's time; `record` when it beats her fastest at this level. */
export function withTime(p: Progress, level: Level, seconds: number): { progress: Progress; record: boolean } {
  const t = roundSeconds(seconds);
  const best = fastest(p, level);
  if (best !== undefined && t >= best) return { progress: p, record: false };
  return { progress: { ...p, fastest: { ...p.fastest, [level]: t } }, record: best !== undefined };
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
  /** 快手改 only: a new fastest time (seconds). */
  record?: number;
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
