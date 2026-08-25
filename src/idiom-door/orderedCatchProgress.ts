export interface OrderedCatchState {
  nextIndex: number;
  isComplete: boolean;
}

export function initialOrderedCatchState(): OrderedCatchState {
  return { nextIndex: 0, isComplete: false };
}

export type GrabOutcome = "advanced" | "wrong" | "already-complete";

export interface GrabResult {
  state: OrderedCatchState;
  outcome: GrabOutcome;
}

/**
 * Pure ordered-grab transition for the idiom-door puzzle
 * (CATCH_MECHANIC_PLAN.md's meaning-first redesign): the meaning is
 * shown upfront and the child must grab the idiom's own 4 characters
 * *in the idiom's actual order* — grabbing the correct next character
 * advances; grabbing anything else (a decoy from another idiom, or one
 * of this idiom's own characters out of turn) does not, and is not
 * treated as a punishing failure — the caller decides how to phrase
 * that gently, this just reports what happened.
 *
 * `grabbedIndex` is the position (0-based) the grabbed tile represents
 * in the *current* idiom's character sequence, or `undefined` if the
 * tile belongs to a different idiom entirely (a decoy).
 */
export function attemptGrab(state: OrderedCatchState, grabbedIndex: number | undefined, total: number): GrabResult {
  if (state.isComplete) {
    return { state, outcome: "already-complete" };
  }
  if (grabbedIndex === state.nextIndex) {
    const nextIndex = state.nextIndex + 1;
    return { state: { nextIndex, isComplete: nextIndex >= total }, outcome: "advanced" };
  }
  return { state, outcome: "wrong" };
}
