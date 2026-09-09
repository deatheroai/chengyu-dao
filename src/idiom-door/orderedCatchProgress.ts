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
 * `grabbedChar` is the glyph the grabbed tile actually shows, or
 * `undefined` for a tile with no glyph at all. Matched against
 * `expectedChars[nextIndex]` by *value*, not by which position the
 * tile was originally built to represent — 2026-09-09: this is what
 * lets a repeated-character idiom (一心一意, 有始有终, 相亲相爱) work at
 * all. Those idioms need the *same* glyph to satisfy two different
 * positions in the sequence (e.g. 一心一意's 0 and 2 are both 一); a
 * tile tagged for the "wrong" occurrence of that glyph still has the
 * right glyph, and the child grabbing it grabbed exactly what was
 * asked for. Order between *distinct* characters is still enforced —
 * only occurrences of the same repeated glyph are interchangeable.
 */
export function attemptGrab(state: OrderedCatchState, grabbedChar: string | undefined, expectedChars: string[]): GrabResult {
  if (state.isComplete) {
    return { state, outcome: "already-complete" };
  }
  if (grabbedChar !== undefined && grabbedChar === expectedChars[state.nextIndex]) {
    const nextIndex = state.nextIndex + 1;
    return { state: { nextIndex, isComplete: nextIndex >= expectedChars.length }, outcome: "advanced" };
  }
  return { state, outcome: "wrong" };
}
