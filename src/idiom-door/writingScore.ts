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

/**
 * 2026-09-09 ("there should be some feedback on the writing to explain
 * to child how well he wrote and eventually how many points he got"):
 * turns a 0-1 accuracy into child-facing feedback — a star rating (0-3)
 * plus a short encouraging label. Used both per-character (right after
 * each quiz resolves, writingStage.ts) and for the whole idiom (the
 * writing-summary card, main.ts) — same rating scale either way, since
 * both are ultimately "how accurately was this traced."
 *
 * Thresholds picked so a single stroke mistake or two (accuracy ≈0.85+,
 * see `MISTAKE_ACCURACY_PENALTY`) still reads as "great," not knocked
 * down to a middling rating over a near-perfect trace. Every tier still
 * gets an encouraging label, never a scolding one — "no fail state, no
 * punishing failure" ethos this project keeps everywhere else.
 */
export interface TraceRating {
  /** 0-3 — how many of `TRACE_RATING_MAX_STARS` to actually fill in. */
  stars: number;
  label: string;
}

export const TRACE_RATING_MAX_STARS = 3;

const GREAT_ACCURACY_THRESHOLD = 0.85;
const GOOD_ACCURACY_THRESHOLD = 0.5;
const OKAY_ACCURACY_THRESHOLD = 0.2;

export function traceRatingForAccuracy(accuracy: number): TraceRating {
  if (accuracy >= GREAT_ACCURACY_THRESHOLD) return { stars: 3, label: "Perfect writing!" };
  if (accuracy >= GOOD_ACCURACY_THRESHOLD) return { stars: 2, label: "Great job!" };
  if (accuracy >= OKAY_ACCURACY_THRESHOLD) return { stars: 1, label: "Nice try!" };
  return { stars: 0, label: "Keep practicing!" };
}

/**
 * After this many completed sessions (shared/sessionHistory.ts's
 * `completedSessionCount` — each one ends at the celebratory
 * session-summary card), the writing stage skips straight to the quiz
 * for each character instead of first playing its stroke-order demo
 * animation. Per your "the child may get impatient waiting if he
 * already knew the strokes" — a child who's sat through the same 51
 * characters' demos across 3 full sessions has plausibly already
 * learned the strokes; still no fail state either way, since skipping
 * the demo only skips the *animation*, not the outline hanzi-writer's
 * quiz mode already shows as a faint guide while tracing. Starting
 * number, tune after playtest — same as every other constant in this
 * project (see BACKLOG.md).
 */
export const SESSIONS_BEFORE_SKIPPING_STROKE_DEMO = 3;

/** Whether the writing stage should skip the stroke-order demo for a
 * device with this many completed sessions — see
 * `SESSIONS_BEFORE_SKIPPING_STROKE_DEMO` above. */
export function shouldSkipStrokeDemo(completedSessions: number): boolean {
  return completedSessions >= SESSIONS_BEFORE_SKIPPING_STROKE_DEMO;
}
