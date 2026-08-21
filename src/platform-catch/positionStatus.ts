/**
 * Mirrors the character's x position into a DOM attribute — same
 * purpose as domStatus.ts's revealed-count mirroring: an observable
 * hook into otherwise canvas-only state, for E2E tests. Needed here
 * specifically because Phase 2's movement is continuous (walk to any
 * x, at any speed) rather than the discrete tap/click steps every
 * earlier snippet's mechanic used — a test can't predict the exact
 * landing position of a multi-leg walk from nominal math alone (each
 * leg's own timing margin shifts where it actually lands), so it reads
 * the real position between legs instead.
 */
export function updatePlayerPosition(x: number): void {
  const el = document.getElementById("player-position");
  if (!el) return;
  el.setAttribute("data-x", String(Math.round(x)));
}
