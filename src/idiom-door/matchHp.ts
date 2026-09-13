/**
 * The match-milestone finale's own HP — a running score across all 3
 * sub-rounds of one milestone (BACKLOG.md's 2026-09-08 "milestone-only
 * matching" entry: "each milestone's final HP is recorded... so a
 * finished milestone can show it against past ones"). Same "running
 * score, no gate" shape as balloonHp.ts — a wrong pair never blocks the
 * child from eventually joining every idiom's two halves, it just costs
 * points — but like doorHp.ts, the *starting* HP for a sub-round isn't
 * always the full amount: only the milestone's very first sub-round
 * starts fresh, the second and third carry over whatever HP the
 * previous sub-round ended with (main.ts threads that final number
 * through each `IdiomMatchScene` restart), so this takes a starting
 * value rather than assuming one fixed constant the way balloonHp.ts
 * does.
 */
export interface MatchHpState {
  hp: number;
}

/** Starting pool for a fresh milestone (its first sub-round only) —
 * bigger than the per-stage HP pools elsewhere (balloon: 100, writing:
 * ~100) since this covers all 15 pairs across all 3 sub-rounds, not
 * just one idiom or one stage. Starting number, tune after playtest —
 * same as every other constant in this project (see BACKLOG.md). */
export const STARTING_MATCH_HP = 500;

/** Cost of one wrong pair attempt (matchProgress.ts's "wrong" outcome).
 * Starting number, tune after playtest — same as every other constant
 * in this project (see BACKLOG.md). */
export const WRONG_PAIR_HP_PENALTY = 20;

/** Floors at 0 (and floors a caller-supplied carry-over value too, same
 * defensive clamp doorHp.ts's `initialDoorHpState` applies) rather than
 * ever going negative — no fail state, just a floor. */
export function initialMatchHpState(startingHp: number = STARTING_MATCH_HP): MatchHpState {
  return { hp: Math.max(0, startingHp) };
}

export function applyWrongPairPenalty(state: MatchHpState): MatchHpState {
  return { hp: Math.max(0, state.hp - WRONG_PAIR_HP_PENALTY) };
}
