/**
 * Pure scoring for the writing/tracing stage (BACKLOG.md's 2026-09-08
 * entries): turns HanziWriter's own per-character quiz result (just a
 * mistake count — see writingStage.ts's `onComplete`) into an accuracy
 * fraction, and that idiom's overall trace accuracy into the door
 * stage's starting HP. Deliberately separated from writingStage.ts (the
 * HanziWriter-driving glue) the same way every other mechanic in this
 * project keeps its scoring pure and its rendering/wiring thin — see
 * orderedCatchProgress.ts/doorHp.ts for the sibling pattern this joins.
 *
 * "Trace accuracy (no baseline freebie) becomes that idiom's door-stage
 * HP" per your feedback — a character traced with zero mistakes scores
 * 1 (full marks), and each mistake made on it costs a fixed slice of
 * that character's own score, floored at 0 rather than going negative
 * (same "floor at 0, no fail state" ethos as balloonHp.ts). There is no
 * minimum/freebie HP floor at the *idiom* level either: a badly-traced
 * idiom can legitimately start the door stage at 0 HP — doorHp.ts's own
 * "jumping stops working at 0" and IdiomDoorScene's retrace-on-unsolved
 * routing are what keep that a gentle "try again," not a dead end.
 */
export interface CharacterTraceResult {
  char: string;
  /** HanziWriter quiz's own per-character mistake count (summed across
   * every stroke, including stroke re-attempts) — see
   * `HanziWriter.quiz`'s `onComplete` summary in writingStage.ts. */
  totalMistakes: number;
}

/** Starting door-stage HP for an idiom traced with zero mistakes on
 * every character — same starting point balloonHp.ts's own 100 uses,
 * per BACKLOG.md's "~100 HP for a perfect trace" starting number. */
export const PERFECT_TRACE_STARTING_HP = 100;

/** How much of one character's own 0-1 accuracy a single mistake on it
 * costs — tuned so a character needs ~7 mistakes (well past
 * `WritingQuizOptions.showHintAfterMisses`'s hint-after-3 nudge, see
 * writingStage.ts) to bottom out at 0, rather than a couple of
 * fat-fingered strokes wiping out the whole character's score. Starting
 * number, tune after playtest — same as every other constant in this
 * project (see BACKLOG.md). */
export const MISTAKE_ACCURACY_PENALTY = 0.15;

/** One character's own trace accuracy, 0 (hopeless) to 1 (perfect) —
 * floored at 0 rather than going negative for a character with many
 * mistakes, same floor every other HP-adjacent module in this project
 * uses. */
export function characterTraceAccuracy(totalMistakes: number): number {
  return Math.max(0, 1 - totalMistakes * MISTAKE_ACCURACY_PENALTY);
}

/** An idiom's overall trace accuracy — the plain average of each of its
 * characters' own accuracy, so no single character can single-handedly
 * zero out the whole idiom (nor can one perfect character alone carry
 * a idiom past a genuinely poor showing on the others). Empty input
 * (shouldn't happen for a real 4-character idiom, but avoids a NaN
 * rather than assuming) scores 0 — same "no baseline freebie" as a
 * character scored on zero attempts.
 */
export function idiomTraceAccuracy(results: CharacterTraceResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + characterTraceAccuracy(r.totalMistakes), 0);
  return total / results.length;
}

/** The door stage's starting HP for this idiom, per your "decent
 * writing should enable the child to pass the door stage but if badly
 * written the child should have to restart" — a straight scale of
 * `PERFECT_TRACE_STARTING_HP` by the idiom's own trace accuracy, no
 * baseline freebie added on top. Rounded to a whole HP, same as every
 * other on-screen HP number in this project (balloonHpStatus.ts shows
 * balloonHp.ts's own already-integer hp directly). */
export function startingDoorHp(results: CharacterTraceResult[]): number {
  return Math.round(PERFECT_TRACE_STARTING_HP * idiomTraceAccuracy(results));
}
