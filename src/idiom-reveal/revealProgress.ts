export interface RevealState {
  revealedCount: number;
  isComplete: boolean;
}

export const DEFAULT_TAPS_PER_CHARACTER = 2;

/**
 * Pure reveal-progress calculation for the "organic poke-around" mechanic
 * (SNIPPET_PLANS.md Snippet 2, Option C): any tap within the explorable
 * region counts — there are no discrete "correct" targets to find. Every
 * `tapsPerCharacter` taps reveals the next character in sequence. There is
 * no fail state; excess taps beyond completion are simply idempotent.
 */
export function computeReveal(tapCount: number, totalCharacters: number, tapsPerCharacter: number): RevealState {
  if (tapsPerCharacter <= 0) {
    throw new Error("tapsPerCharacter must be positive");
  }
  if (totalCharacters <= 0) {
    return { revealedCount: 0, isComplete: true };
  }

  const revealedCount = Math.min(totalCharacters, Math.floor(tapCount / tapsPerCharacter));
  return { revealedCount, isComplete: revealedCount >= totalCharacters };
}
