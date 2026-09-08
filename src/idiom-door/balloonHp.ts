/**
 * A small, self-contained HP counter for the balloon-catch stage — per
 * your "can we include some hp deduction if the wrong balloon is
 * selected" (2026-09-08). Deliberately scoped to just this stage for
 * now, not yet the full cross-stage reward economy `BACKLOG.md`'s
 * writing/tracing-stage entries describe (earning HP from tracing,
 * spending it in the door stage) — that needs the writing stage to
 * exist first. This is the same shape those entries will eventually
 * feed into; wiring it up cross-stage is follow-up work, not a rewrite.
 *
 * No fail state, same ethos as every other mechanic in this project:
 * HP floors at 0 rather than going negative, and nothing here ever
 * blocks the child from catching the *correct* balloon — a wrong catch
 * only removes that one decoy (see BalloonSentenceScene's `popped`
 * flag), so running out of HP is just a running score, never a
 * dead end.
 */
export interface BalloonHpState {
  hp: number;
}

export const STARTING_BALLOON_HP = 100;
export const WRONG_CATCH_HP_PENALTY = 20;

export function initialBalloonHpState(): BalloonHpState {
  return { hp: STARTING_BALLOON_HP };
}

export function applyWrongCatchPenalty(state: BalloonHpState): BalloonHpState {
  return { hp: Math.max(0, state.hp - WRONG_CATCH_HP_PENALTY) };
}
