import type { Page } from "@playwright/test";
import { GRID_WIDTH, GRID_HEIGHT } from "../../src/science-snake/snakeGrid";
import { scienceQuestionsById } from "../../src/science-snake/scienceQuestions";

/**
 * Real-time navigation for science-snake.html's e2e coverage — same "read
 * the real canvas-internal state via a test-only DOM mirror, then steer
 * for real, re-aiming every tick" approach idiom-door's own
 * e2e/helpers/doorJump.ts and fullSession.ts already use, not a blind
 * search pattern or a precomputed path (item spawn positions come from a
 * seeded RNG a test can't predict — see src/science-snake/gameStatus.ts
 * for what's mirrored and why).
 */

const POLL_MS = 60;

export type SnakeDirection = "up" | "down" | "left" | "right";
export type SnakeItemType = "apple" | "poison-apple" | "science";

export interface SnakeItem {
  x: number;
  y: number;
  type: SnakeItemType;
  questionId?: string;
}

export interface SnakeState {
  head: { x: number; y: number };
  direction: SnakeDirection;
  /** Every occupied body cell, head included (`body[0]`) — same shape `snakeGrid.ts`'s own `SnakeState.body` uses. */
  body: { x: number; y: number }[];
  items: SnakeItem[];
  ended: boolean;
  outcome: "" | "win" | "self-collision" | "suffocation";
  /** Whether the question overlay is open right now, and for which question — read in the very same snapshot as `items` (see steerToItem's own doc comment for why that atomicity matters). */
  openQuestionId: string | null;
}

/**
 * One atomic read of every test-only hook this file needs. Deliberately
 * a single `page.evaluate` rather than several separate ones: real game
 * ticks keep advancing between any two separate round-trips to the
 * browser (its own timers don't pause for Playwright), so reading
 * `items` and "is the overlay open" as two separate calls can catch the
 * item list from *before* a tick that already opened the overlay,
 * making an item look "still there" a poll after it was actually
 * eaten — exactly the race that let a target's own question get
 * auto-answered as if it were someone else's incidental pickup.
 */
export async function readSnakeState(page: Page): Promise<SnakeState> {
  return page.evaluate(() => {
    const headEl = document.getElementById("snake-head-position");
    const statusEl = document.getElementById("snake-run-status");
    const overlayEl = document.getElementById("question-overlay");
    const activeQuestionEl = document.getElementById("snake-active-question");
    const bodyEl = document.getElementById("snake-body-cells");
    let body: { x: number; y: number }[] = [];
    try {
      body = JSON.parse(bodyEl?.textContent || "[]");
    } catch {
      body = [];
    }
    const items = Array.from(document.querySelectorAll("#snake-item-positions span")).map((span) => {
      const el = span as HTMLElement;
      return {
        x: Number(el.dataset.x),
        y: Number(el.dataset.y),
        type: el.dataset.type as SnakeItemType,
        questionId: el.dataset.questionId,
      };
    });
    const overlayOpen = overlayEl?.classList.contains("visible") ?? false;
    return {
      head: { x: Number(headEl?.getAttribute("data-x")), y: Number(headEl?.getAttribute("data-y")) },
      direction: (headEl?.getAttribute("data-direction") as SnakeDirection) || "right",
      body,
      items,
      ended: statusEl?.getAttribute("data-ended") === "true",
      outcome: (statusEl?.getAttribute("data-outcome") as SnakeState["outcome"]) || "",
      openQuestionId: overlayOpen ? activeQuestionEl?.getAttribute("data-question-id") ?? null : null,
    };
  });
}

const KEY_FOR_DIRECTION: Record<SnakeDirection, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

const OPPOSITE_DIRECTION: Record<SnakeDirection, SnakeDirection> = { up: "down", down: "up", left: "right", right: "left" };
const PERPENDICULAR_DIRECTIONS: Record<SnakeDirection, [SnakeDirection, SnakeDirection]> = {
  up: ["left", "right"],
  down: ["left", "right"],
  left: ["up", "down"],
  right: ["up", "down"],
};
const DIRECTION_DELTA: Record<SnakeDirection, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Shortest distance/direction along one wrapping axis (Pac-Man-style edges, same wrap `snakeGrid.ts`'s `wrapPosition` implements). */
function wrappedStep(from: number, to: number, size: number): { forward: boolean; distance: number } {
  const forwardDistance = ((to - from) % size + size) % size;
  return forwardDistance <= size - forwardDistance ? { forward: true, distance: forwardDistance } : { forward: false, distance: size - forwardDistance };
}

function wrap(n: number, size: number): number {
  return ((n % size) + size) % size;
}

/**
 * Picks a direction that both makes progress toward `target` and won't
 * turn the snake into its own body next step — a real self-collision
 * (`snakeGrid.ts`'s own `step`) is exactly as fatal to this test's
 * playthrough as to a real one, so navigation has to actively steer
 * around the snake's own trailing cells, not just aim at the shortest
 * distance and hope. Ranks all four directions (the two that reduce
 * distance first, then the two perpendiculars, then the dead-end reverse
 * — which the real game ignores as a no-op anyway, per
 * `changeDirection`) and takes the first one whose next cell isn't
 * currently part of `body`.
 */
function desiredDirection(head: { x: number; y: number }, target: { x: number; y: number }, current: SnakeDirection, body: { x: number; y: number }[]): SnakeDirection {
  const dx = wrappedStep(head.x, target.x, GRID_WIDTH);
  const dy = wrappedStep(head.y, target.y, GRID_HEIGHT);
  const xDir: SnakeDirection | null = dx.distance > 0 ? (dx.forward ? "right" : "left") : null;
  const yDir: SnakeDirection | null = dy.distance > 0 ? (dy.forward ? "down" : "up") : null;
  const progressFirst = dx.distance >= dy.distance ? [xDir, yDir] : [yDir, xDir];

  const ranked: SnakeDirection[] = [];
  const seen = new Set<SnakeDirection>();
  for (const d of [...progressFirst, ...PERPENDICULAR_DIRECTIONS[current], OPPOSITE_DIRECTION[current]]) {
    if (d && !seen.has(d)) {
      seen.add(d);
      ranked.push(d);
    }
  }

  const bodySet = new Set(body.map((cell) => `${cell.x},${cell.y}`));
  for (const candidate of ranked) {
    const delta = DIRECTION_DELTA[candidate];
    const next = { x: wrap(head.x + delta.x, GRID_WIDTH), y: wrap(head.y + delta.y, GRID_HEIGHT) };
    if (!bodySet.has(`${next.x},${next.y}`)) return candidate;
  }
  // Every direction collides (shouldn't happen on this project's actual
  // board sizes/growth targets) — fall back to the best-progress choice
  // rather than refusing to move at all.
  return ranked[0];
}

/**
 * Answers whichever question is currently open with its own real,
 * already-vetted `modelAnswer` (scienceQuestions.test.ts asserts every
 * one of these grades correct against its own requiredKeywords) — used
 * only to get an *incidentally* eaten science item (touched en route to
 * some other target, the same "touch-and-go" reality idiom-door's own
 * chain-catch bug class documents) out of the way so navigation toward
 * the real target can resume, never to answer the item a test is
 * deliberately steering toward — callers check that first.
 */
async function resolveOpenQuestionCorrectly(page: Page, questionId: string | null): Promise<void> {
  const question = questionId ? scienceQuestionsById[questionId] : undefined;
  await page.fill("#question-input", question?.modelAnswer ?? "This is a real complete sentence and it should be more than long enough.");
  await page.click("#question-submit-btn");
}

/**
 * Steers the snake to the nearest board item matching `predicate`,
 * re-reading the live mirrored state and re-aiming every real tick
 * (never a precomputed path) until that exact item is gone from the
 * board — eaten, the only way an item disappears mid-run — or the run
 * ends first. Throws rather than hanging forever on a broken assumption,
 * same shape as fullSession.ts's own flyUntilResolved.
 *
 * Any *other* item eaten incidentally along the way (the game consumes
 * whatever's on the cell the head lands on, regardless of what the
 * caller is aiming for) is handled transparently: an apple/poison-apple
 * just adds growth for free, and an incidental science item's question
 * overlay is answered correctly (`resolveOpenQuestionCorrectly`) so the
 * game un-pauses and navigation can continue — callers that want manual
 * control over answering the *target* item's own question (deliberately
 * wrong tries, the reveal flow) get it untouched, since reaching the
 * target returns immediately, before any overlay handling.
 */
export async function steerToItem(page: Page, predicate: (item: SnakeItem) => boolean, maxMs = 30000): Promise<SnakeItem> {
  const deadline = Date.now() + maxMs;
  let lastSentDirection: SnakeDirection | null = null;
  let target: SnakeItem | null = null;

  while (Date.now() < deadline) {
    const state = await readSnakeState(page);
    if (state.ended) throw new Error(`run ended (${state.outcome}) before reaching the target item`);

    if (target) {
      const stillThere = state.items.some((item) => item.x === target!.x && item.y === target!.y && item.type === target!.type);
      if (!stillThere) return target;
    } else {
      target = state.items.find(predicate) ?? null;
    }

    // Reached from the very same snapshot `stillThere` was just checked
    // against, so this can only be a *different* item's question (an
    // incidental pickup) than the one just confirmed still on the board.
    if (state.openQuestionId !== null) {
      await resolveOpenQuestionCorrectly(page, state.openQuestionId);
      await page.waitForTimeout(POLL_MS);
      continue;
    }

    if (target) {
      const direction = desiredDirection(state.head, target, state.direction, state.body);
      if (direction !== lastSentDirection) {
        await page.keyboard.press(KEY_FOR_DIRECTION[direction]);
        lastSentDirection = direction;
      }
    }
    await page.waitForTimeout(POLL_MS);
  }
  throw new Error("steerToItem timed out");
}

/**
 * Repeatedly steers to whatever item matches `predicate` until the run
 * itself ends — used by tests that want a real playthrough all the way
 * to a win/lose card, where "the run ended" is the success condition
 * rather than steerToItem's own thrown error for it (that error exists
 * to catch a run ending unexpectedly *mid-navigation* to an item the
 * caller still needed, which is exactly what's happening here on
 * purpose on the very last item).
 */
export async function playUntilEnded(page: Page, predicate: (item: SnakeItem) => boolean, maxMs = 60000): Promise<SnakeState> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const state = await readSnakeState(page);
    if (state.ended) return state;
    try {
      await steerToItem(page, predicate, Math.max(1000, deadline - Date.now()));
    } catch {
      const stateAfter = await readSnakeState(page);
      if (stateAfter.ended) return stateAfter;
      throw new Error("playUntilEnded: steerToItem failed without the run actually ending");
    }
  }
  throw new Error("playUntilEnded timed out");
}
