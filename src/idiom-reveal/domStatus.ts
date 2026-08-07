/**
 * Mirrors reveal progress into a DOM live region — doubles as a small
 * on-screen status chip and a screen-reader announcement, and gives E2E
 * tests an observable hook into what's otherwise canvas-only state.
 */
export function updateRevealStatus(
  revealedCount: number,
  total: number,
  isComplete: boolean,
  justRevealedChar?: string,
): void {
  const el = document.getElementById("reveal-status");
  if (!el) return;

  el.setAttribute("data-revealed-count", String(revealedCount));
  el.setAttribute("data-total", String(total));
  el.setAttribute("data-complete", String(isComplete));

  if (isComplete) {
    el.textContent = "All characters revealed!";
  } else if (justRevealedChar) {
    el.textContent = `${justRevealedChar} revealed! (${revealedCount} of ${total})`;
  } else {
    el.textContent = `${revealedCount} of ${total} revealed`;
  }
}
