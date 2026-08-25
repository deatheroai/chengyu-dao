/**
 * Mirrors catch progress into a DOM live region — same purpose as
 * idiom-reveal/domStatus.ts: a small on-screen status chip, a
 * screen-reader announcement, and an observable hook for E2E tests into
 * otherwise canvas-only state.
 */
export function updateCatchStatus(revealedCount: number, total: number, isComplete: boolean, justCaught?: "correct" | "decoy"): void {
  const el = document.getElementById("catch-status");
  if (!el) return;

  el.setAttribute("data-revealed-count", String(revealedCount));
  el.setAttribute("data-total", String(total));
  el.setAttribute("data-complete", String(isComplete));
  if (justCaught) el.setAttribute("data-just-caught", justCaught);

  if (isComplete) {
    el.textContent = "You caught its meaning! 🎉";
  } else if (justCaught === "decoy") {
    el.textContent = `Not quite — try another one! (${revealedCount} of ${total})`;
  } else if (justCaught === "correct") {
    el.textContent = `Caught one! (${revealedCount} of ${total})`;
  } else {
    el.textContent = `${revealedCount} of ${total} caught`;
  }
}
