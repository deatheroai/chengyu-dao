import type { BoardItem } from "./itemSpawner";
import type { SnakeState } from "./snakeGrid";

/**
 * Mirrors idiom-door's #player-position/#balloon-position DOM test-hook
 * pattern (see balloonPositionStatus.ts) — the live snake state isn't
 * otherwise observable to Playwright (it's drawn straight to a Phaser
 * canvas), so this exposes it as plain data attributes on a hidden
 * element. A real child never sees this; it exists purely so an e2e test
 * can steer deterministically (waiting for the head to reach a specific
 * cell, or picking a direction that won't double back into the snake's
 * own current body) instead of guessing at tick timing or geometry.
 */
export function updateSnakeStatus(snake: SnakeState): void {
  const el = document.getElementById("snake-status");
  if (!el) return;
  const head = snake.body[0];
  el.setAttribute("data-head-x", String(head.x));
  el.setAttribute("data-head-y", String(head.y));
  el.setAttribute("data-length", String(snake.body.length));
  el.setAttribute("data-direction", snake.direction);
  el.setAttribute("data-body", JSON.stringify(snake.body));
}

/**
 * Mirrors every currently-active board item's position/type — same
 * purpose and shape as balloonPositionStatus.ts's
 * syncBalloonTargetPositions (one <span data-x data-y data-type> per
 * item). Lets a test navigate straight to the nearest item of a given
 * type (e.g. "the nearest science item, to deliberately answer it
 * wrong") instead of a blind search.
 */
export function syncBoardItems(items: BoardItem[]): void {
  const container = document.getElementById("board-items");
  if (!container) return;
  container.replaceChildren();
  for (const item of items) {
    const span = document.createElement("span");
    span.dataset.x = String(item.position.x);
    span.dataset.y = String(item.position.y);
    span.dataset.type = item.type;
    if (item.questionId) span.dataset.questionId = item.questionId;
    container.append(span);
  }
}
