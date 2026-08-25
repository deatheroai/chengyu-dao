/**
 * Mirrors platform-catch/positionStatus.ts's DOM test-hook pattern for
 * the balloon stage's free-drift avatar — canvas-internal state isn't
 * otherwise observable to Playwright, so this exposes it as a plain
 * data attribute (hidden from the child, not part of the real UI).
 */
export function updateBalloonPosition(x: number, y: number): void {
  const el = document.getElementById("balloon-position");
  if (!el) return;
  el.setAttribute("data-x", String(Math.round(x)));
  el.setAttribute("data-y", String(Math.round(y)));
}
