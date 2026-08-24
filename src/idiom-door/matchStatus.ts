/**
 * Mirrors the match stage's pairing progress into a DOM live region —
 * same purpose/shape as doorStatus.ts and balloonStatus.ts, but for
 * "how many of the idioms have had both halves joined" rather than an
 * ordered sequence or a single catch.
 */
export type MatchOutcomeStatus = "matched" | "wrong";

export function updateMatchStatus(matchedPairs: number, totalPairs: number, isComplete: boolean, outcome?: MatchOutcomeStatus): void {
  const el = document.getElementById("match-status");
  if (!el) return;

  el.setAttribute("data-matched-pairs", String(matchedPairs));
  el.setAttribute("data-total-pairs", String(totalPairs));
  el.setAttribute("data-complete", String(isComplete));
  // Explicitly cleared when absent, not left over from a previous
  // render — same stale-attribute lesson as doorStatus.ts/
  // balloonStatus.ts (see DECISIONS.md's 2026-08-23 entry).
  if (outcome) el.setAttribute("data-outcome", outcome);
  else el.removeAttribute("data-outcome");

  if (isComplete) {
    el.textContent = "You joined them all! 🎉";
  } else if (outcome === "matched") {
    el.textContent = `Yes! ${matchedPairs} of ${totalPairs} joined`;
  } else if (outcome === "wrong") {
    el.textContent = "Not quite — try another pair!";
  } else {
    el.textContent = `${matchedPairs} of ${totalPairs} joined`;
  }
}
