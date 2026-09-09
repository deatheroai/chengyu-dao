/**
 * The door stage's own HP — earned from the writing/tracing stage
 * (writingScore.ts's `startingDoorHp`), spent while running the door
 * puzzle, per BACKLOG.md's 2026-09-08 "HP: earned from tracing, spent
 * in the door stage, a real gate" entry. This is the "same shape"
 * balloonHp.ts's own doc comment already promised the balloon stage's
 * HP would eventually feed into — a small, self-contained pure-state
 * module, not a rewrite of that one.
 *
 * Unlike balloonHp.ts (a running score with no effect on play), this
 * one is a *real* gate: `canJump` goes false at 0 HP, so
 * IdiomDoorScene stops letting jump input through — per your "decent
 * writing should enable the child to pass the door stage but if badly
 * written the child should have to restart." Still no *fail* state in
 * the usual sense of this project though — the character keeps
 * auto-running (just can't catch anything once jumping stops working),
 * reaches the door unsolved, and IdiomDoorScene routes that back to
 * retracing this same idiom (a fresh chance at a fresh HP pool) rather
 * than a dead end.
 */
export interface DoorHpState {
  hp: number;
}

/** Flat cost of every *executed* jump (a jump that actually leaves the
 * ground — see IdiomDoorScene's grounded-and-jumping check), regardless
 * of what it catches, or misses. Starting number, tune after playtest —
 * same as every other constant in this project (see BACKLOG.md). */
export const JUMP_HP_COST = 5;

/** Additional cost — on top of `JUMP_HP_COST`, not instead of it — for
 * a jump that lands on the *wrong* character (orderedCatchProgress.ts's
 * "wrong" outcome). Per BACKLOG.md's "a jump that lands on the wrong
 * character costs an additional, larger amount on top." */
export const WRONG_CATCH_HP_PENALTY = 10;

export function initialDoorHpState(startingHp: number): DoorHpState {
  return { hp: Math.max(0, startingHp) };
}

/** Whether a jump should actually be allowed to execute right now — the
 * real gate this module adds. IdiomDoorScene checks this before letting
 * a jump-pressed frame reach `stepRun`'s own grounded-and-jumping check,
 * so at 0 HP the jump input is simply swallowed, not queued for later. */
export function canJump(state: DoorHpState): boolean {
  return state.hp > 0;
}

/** Floors at 0 rather than going negative — same "no fail state, just a
 * floor" ethos balloonHp.ts's own floor already established. */
export function spendJumpHp(state: DoorHpState): DoorHpState {
  return { hp: Math.max(0, state.hp - JUMP_HP_COST) };
}

export function spendWrongCatchHp(state: DoorHpState): DoorHpState {
  return { hp: Math.max(0, state.hp - WRONG_CATCH_HP_PENALTY) };
}
