import type { IdiomContent } from "../idioms/types";

/**
 * SNIPPET_PLANS.md's Snippet 5 pacing model: a fixed, bounded set of
 * idioms per session (proposed 3), then a warm stop rather than an
 * open-ended stream. Deliberately not configurable per-session — the
 * whole point is a session that can't accidentally grow a 4th idiom.
 */
export const SESSION_LENGTH = 3;

export type SessionPhase = "reveal" | "meaning-check" | "complete";

export interface SessionState {
  idiomIds: string[];
  currentIndex: number;
  phase: SessionPhase;
  /** Ids of idioms whose meaning-check has resolved (correct or
   * revealed) — used for the end-of-session summary. */
  discoveredIds: string[];
}

/** Starts a new session with exactly SESSION_LENGTH idioms, chosen upfront. */
export function createSession(idiomIds: string[]): SessionState {
  if (idiomIds.length !== SESSION_LENGTH) {
    throw new Error(`createSession requires exactly ${SESSION_LENGTH} idiom ids, got ${idiomIds.length}`);
  }
  return { idiomIds, currentIndex: 0, phase: "reveal", discoveredIds: [] };
}

export function currentIdiomId(state: SessionState): string {
  return state.idiomIds[state.currentIndex];
}

/** Reveal finished for the current idiom -> its meaning-check phase. */
export function completeReveal(state: SessionState): SessionState {
  if (state.phase !== "reveal") return state;
  return { ...state, phase: "meaning-check" };
}

/**
 * Meaning-check resolved for the current idiom -> the next idiom's
 * reveal phase, or "complete" if this was the last idiom in the session.
 */
export function completeMeaningCheck(state: SessionState): SessionState {
  if (state.phase !== "meaning-check") return state;
  const discoveredIds = [...state.discoveredIds, currentIdiomId(state)];
  const isLast = state.currentIndex === state.idiomIds.length - 1;
  if (isLast) {
    return { ...state, discoveredIds, phase: "complete" };
  }
  return { ...state, discoveredIds, currentIndex: state.currentIndex + 1, phase: "reveal" };
}

/** Picks SESSION_LENGTH distinct idioms from `pool` for a new session. */
export function pickSessionIdioms(pool: IdiomContent[], rng: () => number = Math.random): IdiomContent[] {
  if (pool.length < SESSION_LENGTH) {
    throw new Error(`pickSessionIdioms needs at least ${SESSION_LENGTH} idioms in the pool, got ${pool.length}`);
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, SESSION_LENGTH);
}
