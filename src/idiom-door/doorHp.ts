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
 * the usual sense of this project though — 2026-09-09: reaching 0 HP
 * now retraces this same idiom (a fresh chance at a fresh HP pool)
 * *immediately*, rather than leaving the character auto-running with no
 * ability to jump all the way to the door (per your "it should
 * immediately restart instead of continuing without ability to jump" —
 * that dead run could take a long time on a long track, for no benefit
 * to the child). `isHpLow` below is the earlier warning that gives the
 * child a heads-up before that happens, not just a surprise cutoff.
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

/**
 * 2026-09-09 ("give the player some warning when hp is running low or
 * insufficient to jump thru the door phase"): below this many HP, a
 * *single* wrong catch (`JUMP_HP_COST` + `WRONG_CATCH_HP_PENALTY` = 15)
 * would leave 5 or less — one more jump, any jump, and jumping stops
 * working. Deliberately not tied to how many characters are actually
 * still outstanding (that would need reasoning about how many more
 * jumps a child might realistically need, which this project has no
 * way to predict) — this is simpler and always true regardless: "you
 * are close enough to 0 that your very next jump matters," the same
 * threshold whether one character or all four are still left to catch.
 * `doorHpStatus.ts` uses this to flag the on-screen HP counter before
 * the child actually hits 0 and gets sent back to retrace, so that
 * immediate restart (see this file's own top doc comment) never comes
 * as a total surprise. Starting number, tune after playtest — same as
 * every other constant in this project (see BACKLOG.md).
 */
export const LOW_HP_THRESHOLD = 20;

/** Whether the HP counter should show its "running low" warning state —
 * `false` at 0 HP too (that's not "low," it's empty — doorHp.ts's own
 * gate/immediate-restart handles that case on its own, distinctly). */
export function isHpLow(state: DoorHpState): boolean {
  return state.hp > 0 && state.hp <= LOW_HP_THRESHOLD;
}
