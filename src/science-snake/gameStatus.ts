import type { Position, Direction } from "./snakeGrid";
import type { BoardItemType } from "./itemSpawner";

/**
 * Mirrors otherwise canvas-only board state into plain DOM — same
 * "expose it as a data attribute, hidden from the child" pattern
 * `shared/positionStatus.ts` and `idiom-door/balloonPositionStatus.ts`
 * already use. Needed here for the same reason those exist: item spawn
 * positions come from a seeded RNG (`seededRandom.ts`) a test can't
 * predict, and the snake's own heading/position change every tick — an
 * e2e test steers for real (`e2e/helpers/snakeNav.ts`) by reading this,
 * not by guessing a blind search pattern. `science-snake.html` hides
 * every element this writes to (`style="display: none"`), same as its
 * idiom-door counterparts.
 */

export function updateSnakeHeadState(head: Position, direction: Direction): void {
  const el = document.getElementById("snake-head-position");
  if (!el) return;
  el.setAttribute("data-x", String(head.x));
  el.setAttribute("data-y", String(head.y));
  el.setAttribute("data-direction", direction);
}

/**
 * The whole body, not just the head — a test steering toward an item
 * needs this to pick a direction that won't turn the snake into its own
 * tail, the same real self-collision rule `snakeGrid.ts`'s `step`
 * enforces. A plain JSON blob (rather than one `<span>` per segment,
 * `syncSnakeItemPositions`'s own shape) since the body is read as one
 * whole list every poll, never diffed segment-by-segment.
 */
export function updateSnakeBodyState(body: Position[]): void {
  const el = document.getElementById("snake-body-cells");
  if (!el) return;
  el.textContent = JSON.stringify(body);
}

export interface SnakeItemPosition {
  x: number;
  y: number;
  type: BoardItemType;
  questionId?: string;
}

/** One `<span data-type data-question-id data-x data-y>` per board item — same shape as balloonPositionStatus.ts's `syncBalloonTargetPositions`. */
export function syncSnakeItemPositions(items: SnakeItemPosition[]): void {
  const container = document.getElementById("snake-item-positions");
  if (!container) return;
  container.replaceChildren();
  for (const item of items) {
    const span = document.createElement("span");
    span.dataset.type = item.type;
    if (item.questionId) span.dataset.questionId = item.questionId;
    span.dataset.x = String(item.x);
    span.dataset.y = String(item.y);
    container.append(span);
  }
}

/**
 * Which question (if any) the overlay currently has open — a test can't
 * otherwise tell *which* science item its own navigation happened to eat
 * (deliberately, or incidentally while heading toward something else,
 * the same "touch-and-go" reality idiom-door's own chain-catch bug class
 * lives in) without this, since the overlay itself only shows the
 * question's rendered prompt/icon, not its stable id.
 */
export function updateActiveQuestion(questionId: string | null): void {
  const el = document.getElementById("snake-active-question");
  if (!el) return;
  if (questionId) el.setAttribute("data-question-id", questionId);
  else el.removeAttribute("data-question-id");
}

export type SnakeRunOutcome = "" | "win" | "self-collision" | "suffocation";

export function updateSnakeRunStatus(ended: boolean, outcome: SnakeRunOutcome): void {
  const el = document.getElementById("snake-run-status");
  if (!el) return;
  el.setAttribute("data-ended", String(ended));
  el.setAttribute("data-outcome", outcome);
}
