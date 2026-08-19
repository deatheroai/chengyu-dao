export interface CatchState {
  correctCatches: number;
  revealedCount: number;
  isComplete: boolean;
}

export function initialCatchState(): CatchState {
  return { correctCatches: 0, revealedCount: 0, isComplete: false };
}

/**
 * Pure catch-progress transition (CATCH_MECHANIC_PLAN.md Phase 0):
 * catching ANY correct icon reveals the next character in sequence,
 * regardless of which specific icon it was — no requirement to match a
 * specific icon to a specific character, same "any input counts, no
 * hidden order to guess" ethos as Snippet 2's reveal mechanic. Catching
 * a decoy is a pure no-op for progress (still gets its own gentle visual
 * feedback in the scene, just doesn't advance anything) — there is no
 * fail state, matching every prior snippet.
 */
export function applyCatch(state: CatchState, kind: "correct" | "decoy", totalCharacters: number): CatchState {
  if (kind === "decoy") return state;

  const correctCatches = state.correctCatches + 1;
  const revealedCount = Math.min(totalCharacters, correctCatches);
  return { correctCatches, revealedCount, isComplete: revealedCount >= totalCharacters };
}
