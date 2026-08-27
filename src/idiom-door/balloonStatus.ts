/**
 * Mirrors the balloon stage's catch progress into a DOM live region —
 * same purpose as doorStatus.ts, but this stage's state is much
 * simpler (one thing to find, not an ordered sequence), so its own
 * small module rather than stretching doorStatus.ts to cover both.
 */
export type BalloonOutcome = "correct" | "wrong";

export function updateBalloonStatus(resolved: boolean, outcome?: BalloonOutcome): void {
  const el = document.getElementById("balloon-status");
  if (!el) return;

  el.setAttribute("data-resolved", String(resolved));
  // Explicitly cleared when absent, not left over from a previous
  // render — same stale-attribute lesson as doorStatus.ts (see
  // DECISIONS.md's 2026-08-23 entry): a fresh balloon stage's first
  // render (no outcome yet) would otherwise keep showing the *previous*
  // stage's last outcome.
  if (outcome) el.setAttribute("data-outcome", outcome);
  else el.removeAttribute("data-outcome");

  if (resolved) {
    el.textContent = "That's the one! Great reading. 🎈";
  } else if (outcome === "wrong") {
    el.textContent = "Not quite — try another balloon!";
  } else {
    el.textContent = "Fly around and catch the balloon with the idiom that fits!";
  }
}
