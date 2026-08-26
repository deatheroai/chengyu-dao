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

/** 2026-08-26: mirrors the camera's current scroll offset — same
 * "canvas-internal state, expose it as a test hook" reasoning as
 * updateBalloonPosition above. Needed alongside each balloon's own
 * world position (see BalloonTargetPosition below) for a test to
 * compute where a balloon actually sits on *screen* right now, since
 * this stage's camera scrolls to follow the avatar (unlike the door
 * puzzle's simpler single-axis scroll, or the match stage's fixed one). */
export function updateBalloonCameraScroll(scrollX: number, scrollY: number): void {
  const el = document.getElementById("balloon-camera-scroll");
  if (!el) return;
  el.setAttribute("data-x", String(Math.round(scrollX)));
  el.setAttribute("data-y", String(Math.round(scrollY)));
}

export interface BalloonTargetPosition {
  id: string;
  isCorrect: boolean;
  x: number;
  y: number;
}

/** Mirrors every balloon's current world position (including its own
 * wind-drift wander) and whether it's the correct one — same purpose
 * and shape as IdiomMatchScene's `#match-tile-positions` hook (one
 * `<span data-tile-id data-x data-y>` per tile), just for balloons
 * instead of match tiles, plus `data-correct` since (unlike a match
 * tile) not every balloon here is a valid target. A real child has no
 * such hook — the child-facing puzzle is unchanged (find it by reading
 * the sentence and flying around); this only makes the *test* able to
 * steer deterministically instead of guessing a search pattern that
 * might not reach every corner of an arbitrarily-sized grid in time. */
export function syncBalloonTargetPositions(balloons: BalloonTargetPosition[]): void {
  const container = document.getElementById("balloon-target-positions");
  if (!container) return;
  container.replaceChildren();
  for (const balloon of balloons) {
    const span = document.createElement("span");
    span.dataset.balloonId = balloon.id;
    span.dataset.correct = String(balloon.isCorrect);
    span.dataset.x = String(Math.round(balloon.x));
    span.dataset.y = String(Math.round(balloon.y));
    container.append(span);
  }
}
