import { expect, type Page } from "@playwright/test";
import { GRID_WIDTH, GRID_HEIGHT, type Direction, type Position } from "../../src/science-snake/snakeGrid";
import { scienceQuestions } from "../../src/science-snake/scienceQuestions";

/**
 * Drives `science-snake.html` deterministically for e2e coverage
 * (BACKLOG.md's "E2E test suite" entry). Mirrors idiom-door's own
 * e2e/helpers/ split: the actual game logic is untouched real play (real
 * ticks, real spawner, real grading) — this only reads the test-only DOM
 * hooks (`snakeStatus.ts`'s #snake-status/#board-items, same
 * "canvas-internal state isn't otherwise observable, expose it as a
 * hidden data attribute" pattern idiom-door's own #player-position/
 * #balloon-target-positions already use) and clicks the same on-screen
 * D-pad a real child would tap.
 */

const DIRECTION_BUTTON_ID: Record<Direction, string> = {
  up: "dpad-up",
  down: "dpad-down",
  left: "dpad-left",
  right: "dpad-right",
};
const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function wrap(n: number, size: number): number {
  return ((n % size) + size) % size;
}

/**
 * The D-pad is wired on `pointerdown` (main.ts), not `click` — same as
 * idiom-door's own `#jump-btn` (see doorJump.ts's `pressJumpButton`).
 * `dispatchEvent` fires it directly rather than `page.click()`'s full
 * actionability-check simulation, which matters here specifically:
 * `page.click()` retries while any other element intercepts pointer
 * events at that position, and the question overlay (a `card-layer`
 * that sits above the D-pad in z-index whenever it's open) does exactly
 * that between direction presses — found the hard way as a real,
 * reproducible hang, not guessed.
 */
async function pressDirection(page: Page, direction: Direction): Promise<void> {
  await page.locator(`#${DIRECTION_BUTTON_ID[direction]}`).dispatchEvent("pointerdown");
}

interface SnakeStatus {
  head: Position;
  length: number;
}

async function readSnakeStatus(page: Page): Promise<SnakeStatus> {
  const el = page.locator("#snake-status");
  const [x, y, length] = await Promise.all([
    el.getAttribute("data-head-x"),
    el.getAttribute("data-head-y"),
    el.getAttribute("data-length"),
  ]);
  return { head: { x: Number(x), y: Number(y) }, length: Number(length) };
}

interface BoardItemStatus {
  x: number;
  y: number;
  type: "apple" | "poison-apple" | "science";
  questionId?: string;
}

async function readBoardItems(page: Page): Promise<BoardItemStatus[]> {
  return page.locator("#board-items > span").evaluateAll((spans) =>
    spans.map((span) => ({
      x: Number((span as HTMLElement).dataset.x),
      y: Number((span as HTMLElement).dataset.y),
      type: (span as HTMLElement).dataset.type as BoardItemStatus["type"],
      questionId: (span as HTMLElement).dataset.questionId,
    })),
  );
}

async function isQuestionOverlayVisible(page: Page): Promise<boolean> {
  return page.locator("#question-overlay").evaluate((el) => el.classList.contains("visible"));
}

async function isCardVisible(page: Page, id: string): Promise<boolean> {
  return page
    .locator(`#${id}`)
    .evaluate((el) => el.classList.contains("visible"))
    .catch(() => false);
}

/** Submits `text` as the current question's answer and waits for the ask form's Submit to register (hint appearing, or the overlay closing on a correct answer). */
async function submitAnswer(page: Page, text: string): Promise<void> {
  await page.fill("#question-input", text);
  await page.click("#question-submit-btn");
}

/**
 * Answers whatever question is currently showing correctly, using that
 * question's own real `modelAnswer` (matched off the displayed prompt
 * text — the 10 authored prompts are each a distinct scenario, not
 * interchangeable boilerplate) — a real, content-integrity-tested
 * correct answer, not a cheat string.
 */
export async function answerCurrentQuestionCorrectly(page: Page): Promise<void> {
  await expect(page.locator("#question-overlay")).toHaveClass(/visible/);
  const promptText = await page.locator("#question-prompt").textContent();
  const question = scienceQuestions.find((q) => q.prompt === promptText);
  if (!question) throw new Error(`no scienceQuestions entry matches prompt: ${promptText}`);
  await submitAnswer(page, question.modelAnswer);
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
}

/** A validly-formed sentence that satisfies no question's requiredKeywords — deliberately wrong, not malformed (must still clear the minWords/sentence-shape check to reach the keyword grading at all). */
const DELIBERATELY_WRONG_ANSWER = "I am not sure about this one and would rather just guess something here.";

/**
 * Answers wrong on both tries and steps all the way through the
 * word-chunk reveal before tapping Continue — the same real flow a
 * stuck child would go through, exercising the two-try/hint/reveal
 * machinery (answerGrading.ts/chunkWords.ts) for real rather than
 * jumping straight to the "indigestion" outcome.
 */
export async function answerCurrentQuestionWrongTwiceAndContinue(page: Page): Promise<void> {
  await expect(page.locator("#question-overlay")).toHaveClass(/visible/);
  await submitAnswer(page, DELIBERATELY_WRONG_ANSWER);
  await expect(page.locator("#question-hint")).not.toHaveClass(/hidden/);

  await submitAnswer(page, DELIBERATELY_WRONG_ANSWER);
  await expect(page.locator("#question-reveal")).not.toHaveClass(/hidden/);

  const nextBtn = page.locator("#question-reveal-next-btn");
  const continueBtn = page.locator("#question-reveal-continue-btn");
  // Step through every chunk — Continue only appears once nextBtn itself
  // hides (chunkWords.ts's isFullyRevealed), the actual point of this
  // mechanic per BACKLOG.md, not incidental UI.
  while (await nextBtn.isVisible()) {
    await expect(continueBtn).toHaveClass(/hidden/);
    await nextBtn.click();
  }
  await expect(continueBtn).not.toHaveClass(/hidden/);
  await continueBtn.click();
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
}

// ---------------------------------------------------------------------
// Full-board winning sweep: a fixed "boustrophedon with a reserved
// return corridor" Hamiltonian cycle — the classic technique for
// steering a Snake game to fill (almost) the whole board without ever
// colliding with its own body, since any two visits to the same cell on
// a true Hamiltonian cycle are always exactly width*height ticks apart,
// further than any body length below the win threshold could reach.
// Verified quantitatively before relying on it here, not just reasoned
// about: simulated against the real snakeGrid.ts/itemSpawner.ts logic
// across dozens of rng seeds with zero self-collisions, reaching
// WIN_LENGTH in 2-4 real minutes each time (poison apples' permanent 4x
// growth multiplier does almost all of the work — a handful of eaten
// items is enough once poisoned).
// ---------------------------------------------------------------------

interface Waypoint {
  x: number;
  y: number;
  direction: Direction;
}

/**
 * `prefix` gets the snake from its real starting position/direction
 * (main.ts's createInitialSnake — always the board's center, facing
 * right) to the cycle's own entry point (0,0) facing down. `cycle` is
 * one full lap (width*height moves) that returns to (0,0) facing down
 * again — looping it (repeat `cycle`, skip `prefix`) is always safe up
 * to a body length just under width*height.
 */
function buildFullBoardPlan(width: number, height: number): { prefix: Waypoint[]; cycle: Waypoint[] } {
  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  const prefix: Waypoint[] = [
    { x: startX, y: startY, direction: "up" },
    { x: startX, y: 0, direction: "left" },
    { x: 0, y: 0, direction: "down" },
  ];

  const cycle: Waypoint[] = [{ x: 0, y: height - 1, direction: "right" }];
  for (let col = 1; col <= width - 1; col++) {
    const isLast = col === width - 1;
    const goingUp = col % 2 === 1;
    if (goingUp) {
      if (isLast) {
        cycle.push({ x: col, y: height - 1, direction: "up" });
        cycle.push({ x: col, y: 0, direction: "left" });
      } else {
        cycle.push({ x: col, y: height - 1, direction: "up" });
        cycle.push({ x: col, y: 1, direction: "right" });
      }
    } else {
      cycle.push({ x: col, y: 1, direction: "down" });
      cycle.push({ x: col, y: height - 1, direction: "right" });
    }
  }
  cycle.push({ x: 0, y: 0, direction: "down" });
  return { prefix, cycle };
}

/**
 * Steers along `buildFullBoardPlan`'s cycle (looping it as many times as
 * it takes), answering every science item correctly, until the win card
 * appears. Polls the live head position frequently relative to
 * `TICK_MS` (180ms) so it reliably catches each waypoint during that
 * cell's one-tick dwell before the snake moves past it.
 */
export async function sweepFullBoardUntilWin(page: Page, maxMs = 10 * 60 * 1000): Promise<void> {
  const { prefix, cycle } = buildFullBoardPlan(GRID_WIDTH, GRID_HEIGHT);
  let queue: Waypoint[] = [...prefix, ...cycle];

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isCardVisible(page, "win-card")) return;
    if (await isQuestionOverlayVisible(page)) {
      await answerCurrentQuestionCorrectly(page);
      continue;
    }
    const { head } = await readSnakeStatus(page);
    const next = queue[0];
    if (head.x === next.x && head.y === next.y) {
      await pressDirection(page, next.direction);
      queue.shift();
      if (queue.length === 0) queue = [...cycle];
    }
    await page.waitForTimeout(30);
  }
  throw new Error("sweepFullBoardUntilWin timed out");
}

// ---------------------------------------------------------------------
// Suffocation drive: chases straight at whichever science item is
// currently nearest and deliberately answers it wrong, piling up
// indigestion items until the board crosses SUFFOCATION_THRESHOLD_RATIO.
// A direct chase (not the safe full-board cycle above) is what makes
// this fast enough to run in a test — wrong answers give 0 growth, so
// the body barely grows at all — but a raw "move toward target" picker
// turned out to have two real collision risks, found empirically by
// simulating this exact strategy against the real game logic before
// trusting it in a slow, expensive Playwright run:
// 1. changeDirection silently ignores a direct 180-degree reversal
//    request, desyncing a naive picker's model of the snake's own
//    direction from reality.
// 2. Even reversal-aware, a short body can coil around and box the head
//    into a dead-end a couple of moves later (all 4 neighbors
//    self-occupied) — fixed with a capped flood-fill "how much open
//    space does this leave me" check, the standard "don't corner
//    yourself" heuristic real Snake bots use.
// Verified against the real snakeGrid.ts/itemSpawner.ts/suffocation.ts
// logic across 400 rng seeds: 0 self-collisions, suffocation reached
// within 50 simulated seconds every time.
// ---------------------------------------------------------------------

function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function freeSpaceFrom(start: Position, blocked: Set<string>, limit: number): number {
  const startKey = `${start.x},${start.y}`;
  if (blocked.has(startKey)) return 0;
  const visited = new Set<string>([startKey]);
  const queue: Position[] = [start];
  let count = 0;
  while (queue.length > 0 && count < limit) {
    const p = queue.shift()!;
    count++;
    for (const d of ALL_DIRECTIONS) {
      const n = { x: wrap(p.x + DELTA[d].x, GRID_WIDTH), y: wrap(p.y + DELTA[d].y, GRID_HEIGHT) };
      const key = `${n.x},${n.y}`;
      if (visited.has(key) || blocked.has(key)) continue;
      visited.add(key);
      queue.push(n);
    }
  }
  return count;
}

/** See this file's own "Suffocation drive" doc comment above for why this needs to be both reversal-aware and confinement-aware, not just a plain "move toward target" picker. */
function directionToward(head: Position, target: Position, currentDirection: Direction, body: Position[]): Direction {
  const desiredX: Direction | null = head.x === target.x ? null : target.x > head.x ? "right" : "left";
  const desiredY: Direction | null = head.y === target.y ? null : target.y > head.y ? "down" : "up";
  const ordered = [desiredX, desiredY, ...ALL_DIRECTIONS].filter((d): d is Direction => d !== null);
  const bodySet = new Set(body.map((p) => `${p.x},${p.y}`));
  const safetyMargin = body.length + 5;

  let bestCandidate: Direction | null = null;
  let bestFreeSpace = -1;
  const seen = new Set<Direction>();
  for (const candidate of ordered) {
    if (seen.has(candidate) || candidate === OPPOSITE[currentDirection]) continue;
    seen.add(candidate);
    const next = { x: wrap(head.x + DELTA[candidate].x, GRID_WIDTH), y: wrap(head.y + DELTA[candidate].y, GRID_HEIGHT) };
    const nextKey = `${next.x},${next.y}`;
    if (bodySet.has(nextKey)) continue;
    // The tail is about to vacate its current cell (unless growing), so
    // don't count it as "blocked" for this lookahead — same nuance
    // step() itself accounts for.
    const blockedForFloodFill = new Set(bodySet);
    const tail = body[body.length - 1];
    blockedForFloodFill.delete(`${tail.x},${tail.y}`);
    const freeSpace = freeSpaceFrom(next, blockedForFloodFill, safetyMargin);
    if (freeSpace >= safetyMargin) return candidate;
    if (freeSpace > bestFreeSpace) {
      bestFreeSpace = freeSpace;
      bestCandidate = candidate;
    }
  }
  return bestCandidate ?? currentDirection;
}

async function readFullSnakeStatus(page: Page): Promise<{ head: Position; direction: Direction; body: Position[] }> {
  // Only the head/length are exposed via #snake-status; approximate the
  // rest of the body from #board-items being absent there isn't
  // possible, so the confinement check below reads the same hook the
  // production render() writes every tick, extended with a body list
  // for this driver's own use — see #snake-status's `data-body`.
  const el = page.locator("#snake-status");
  const [x, y, direction, bodyJson] = await Promise.all([
    el.getAttribute("data-head-x"),
    el.getAttribute("data-head-y"),
    el.getAttribute("data-direction"),
    el.getAttribute("data-body"),
  ]);
  return {
    head: { x: Number(x), y: Number(y) },
    direction: direction as Direction,
    body: JSON.parse(bodyJson ?? "[]"),
  };
}

/**
 * Steers straight at whichever active science item is currently
 * nearest, until the question overlay opens for it (or a different one
 * crossed along the way — either is fine, this doesn't care which
 * specific item it ends up eating). Returns once the overlay is visible;
 * answering it is the caller's own choice.
 */
export async function chaseNearestScienceItem(page: Page, maxMs = 60000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isQuestionOverlayVisible(page)) return;
    const items = await readBoardItems(page);
    const scienceItems = items.filter((i) => i.type === "science");
    if (scienceItems.length === 0) {
      await page.waitForTimeout(100);
      continue;
    }
    const { head, direction, body } = await readFullSnakeStatus(page);
    let nearest = scienceItems[0];
    let bestDist = manhattan(head, nearest);
    for (const candidate of scienceItems.slice(1)) {
      const d = manhattan(head, candidate);
      if (d < bestDist) {
        nearest = candidate;
        bestDist = d;
      }
    }
    const dir = directionToward(head, nearest, direction, body);
    await pressDirection(page, dir);
    await page.waitForTimeout(30);
  }
  throw new Error("chaseNearestScienceItem timed out");
}

/** Repeats chaseNearestScienceItem + answering wrong twice until the board suffocates. */
export async function driveToSuffocation(page: Page, maxMs = 10 * 60 * 1000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isCardVisible(page, "lose-card")) return;
    await chaseNearestScienceItem(page, maxMs);
    if (await isCardVisible(page, "lose-card")) return;
    await answerCurrentQuestionWrongTwiceAndContinue(page);
  }
  throw new Error("driveToSuffocation timed out");
}

export async function waitForLoseReason(page: Page, reason: string): Promise<void> {
  await expect(page.locator("#lose-card")).toHaveClass(/visible/);
  const text = await page.locator("#lose-message").textContent();
  expect(text).toContain(reason);
}
