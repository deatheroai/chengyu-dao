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
 * #balloon-target-positions already use) and taps the same on-screen
 * joystick a real child would use.
 */

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
 * Steers with the on-screen joystick (joystickControl.ts) the way a tap
 * on one side of the disc would: a pointerdown 35% of the disc's width
 * out from its centre toward `direction` (well outside the dead zone),
 * then a pointerup so the next press starts fresh.
 *
 * `dispatchEvent` fires it directly rather than `page.click()`'s full
 * actionability-check simulation, which matters here specifically:
 * `page.click()` retries while any other element intercepts pointer
 * events at that position, and the question overlay (a `card-layer`
 * that sits above the joystick in z-index whenever it's open) does
 * exactly that between direction presses — found the hard way as a
 * real, reproducible hang, not guessed. The disc's box is read once and
 * cached, since it doesn't move during a run.
 */
let joystickBox: { x: number; y: number; width: number; height: number } | null = null;
let joystickBoxPage: Page | null = null;

async function pressDirection(page: Page, direction: Direction): Promise<void> {
  const joystick = page.locator("#joystick");
  if (!joystickBox || joystickBoxPage !== page) {
    joystickBox = await joystick.boundingBox();
    joystickBoxPage = page;
  }
  if (!joystickBox) throw new Error("#joystick isn't on the page");
  const offset = joystickBox.width * 0.35;
  const clientX = joystickBox.x + joystickBox.width / 2 + DELTA[direction].x * offset;
  const clientY = joystickBox.y + joystickBox.height / 2 + DELTA[direction].y * offset;
  await joystick.dispatchEvent("pointerdown", { pointerId: 1, clientX, clientY, bubbles: true });
  await joystick.dispatchEvent("pointerup", { pointerId: 1, clientX, clientY, bubbles: true });
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
  // Deliberately not asserting the overlay closes here — same reasoning
  // as answerCurrentQuestionWrongTwiceAndContinue below: resuming can
  // immediately land the head on a *different* already-active science
  // item, reopening the overlay for a fresh question before this ever
  // observes a "closed" moment. Found live on a real CI run (the win
  // sweep passes through many items in a row), not guessed. The caller's
  // own next isQuestionOverlayVisible check handles either case.
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
  // Deliberately not asserting the overlay closes here: resuming can
  // immediately land the head on a *different* already-active science
  // item (a real, valid game event on a crowded board, not a bug),
  // reopening the overlay for a fresh question before this ever observes
  // a "closed" moment — found live in the suffocation drive below, which
  // calls this dozens of times as the board fills up. Whichever happens,
  // the caller's own next isQuestionOverlayVisible check handles it.
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
  /** The direction the snake is travelling in *while approaching* this waypoint (i.e. the previous waypoint's own `direction`) — see the in-page `reachedOrPassed` below for why this matters. */
  approach: Direction;
}

function waypoint(x: number, y: number, direction: Direction, approach: Direction): Waypoint {
  return { x, y, direction, approach };
}

/**
 * The route's opening (built in the page by installInPageSweepSteering)
 * gets the snake from wherever its head is when steering starts (still on its starting row, moving right — see
 * sweepFullBoardUntilWin) to the cycle's own entry point (0,0) facing
 * down: up its current column to row 0, then left. Built from the live
 * head rather than the known start cell, because the very first turn can
 * only take effect once the scene is actually running — sending it at the
 * start cell raced the scene starting up, and a lost first turn left the
 * sweep waiting for a column the snake would never turn up (seen as four
 * parallel runs stuck at length 3 for minutes). `cycle` is one full lap
 * (width*height moves) that returns to (0,0) facing down again — looping
 * it is always safe up to a body length just under width*height.
 */
function buildFullBoardCycle(width: number, height: number): Waypoint[] {
  const cycle: Waypoint[] = [waypoint(0, height - 1, "right", "down")];
  for (let col = 1; col <= width - 1; col++) {
    const isLast = col === width - 1;
    const goingUp = col % 2 === 1;
    const prevDirection = cycle[cycle.length - 1].direction;
    if (goingUp) {
      if (isLast) {
        cycle.push(waypoint(col, height - 1, "up", prevDirection));
        cycle.push(waypoint(col, 0, "left", "up"));
      } else {
        cycle.push(waypoint(col, height - 1, "up", prevDirection));
        cycle.push(waypoint(col, 1, "right", "up"));
      }
    } else {
      cycle.push(waypoint(col, 1, "down", prevDirection));
      cycle.push(waypoint(col, height - 1, "right", "down"));
    }
  }
  cycle.push(waypoint(0, 0, "down", cycle[cycle.length - 1].direction));
  return cycle;
}

/** Single round-trip per poll (win-card, overlay, head position all at once) rather than several sequential ones — cuts real per-poll latency enough to reliably catch each waypoint's one-tick dwell window. */
async function readSweepStatus(
  page: Page,
): Promise<{ winVisible: boolean; loseMessage: string | null; overlayVisible: boolean; head: Position; length: number }> {
  return page.evaluate(() => {
    const winVisible = document.getElementById("win-card")?.classList.contains("visible") ?? false;
    const loseVisible = document.getElementById("lose-card")?.classList.contains("visible") ?? false;
    const loseMessage = loseVisible ? (document.getElementById("lose-message")?.textContent ?? "") : null;
    const overlayVisible = document.getElementById("question-overlay")?.classList.contains("visible") ?? false;
    const status = document.getElementById("snake-status");
    const head = { x: Number(status?.getAttribute("data-head-x")), y: Number(status?.getAttribute("data-head-y")) };
    return { winVisible, loseMessage, overlayVisible, head, length: Number(status?.getAttribute("data-length")) };
  });
}

/**
 * Installs the sweep's steering *inside the page*: a MutationObserver on
 * #snake-status (which the scene rewrites once per tick) checks each new
 * head position against the next waypoint and taps the joystick straight
 * away, before the next tick. Steering from the test process instead —
 * poll the head, then send a press — needs two round trips per turn, and
 * the plan has turns just one tick (180ms) apart at every column change.
 * On a busy CI runner those round trips ran long, a turn was missed, the
 * snake left the cycle and later ran into itself (CI logs: length frozen
 * at 160 / 238 for the rest of a 90-minute budget, on this branch and on
 * main's own docs-only PR #64). Reacting in the page can't miss a tick.
 *
 * A turn due while the question overlay is open is held until it closes:
 * the scene ignores direction changes while paused (SnakeGameScene's
 * requestDirection), and the head hasn't moved in the meantime.
 */
async function installInPageSweepSteering(page: Page, cycle: Waypoint[]): Promise<void> {
  await page.evaluate(
    ({ cycle }) => {
      type Dir = "up" | "down" | "left" | "right";
      type Wp = { x: number; y: number; direction: Dir; approach: Dir };
      const status = document.getElementById("snake-status")!;
      const joystick = document.getElementById("joystick")!;
      const overlay = document.getElementById("question-overlay")!;
      const offset: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      // The opening, from the live head in this same synchronous step, so
      // the snake can't have moved on since it was read (see the doc on
      // buildFullBoardCycle for why it isn't the fixed start cell).
      const hx = Number(status.getAttribute("data-head-x"));
      const hy = Number(status.getAttribute("data-head-y"));
      const prefix: Wp[] = [
        { x: hx, y: hy, direction: "up", approach: "right" },
        { x: hx, y: 0, direction: "left", approach: "up" },
        { x: 0, y: 0, direction: "down", approach: "left" },
      ];
      let queue: Wp[] = [...prefix, ...cycle];

      // Whether the head has reached *or already passed* `wp`, given it's
      // been travelling in `wp.approach` to get there. Exact equality was
      // once missed on a slow poll; with a check every tick it shouldn't
      // be, but "passed" costs nothing on an already-safe straight run.
      const reachedOrPassed = (x: number, y: number, wp: Wp): boolean => {
        switch (wp.approach) {
          case "up":
            return x === wp.x && y <= wp.y;
          case "down":
            return x === wp.x && y >= wp.y;
          case "left":
            return y === wp.y && x <= wp.x;
          case "right":
            return y === wp.y && x >= wp.x;
        }
      };

      // Same tap the test process's pressDirection sends: 35% of the
      // disc's width out from its centre toward the direction.
      const press = (direction: Dir): void => {
        const rect = joystick.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2 + offset[direction][0] * rect.width * 0.35;
        const clientY = rect.top + rect.height / 2 + offset[direction][1] * rect.height * 0.35;
        const init = { pointerId: 1, clientX, clientY, bubbles: true, cancelable: true };
        joystick.dispatchEvent(new PointerEvent("pointerdown", init));
        joystick.dispatchEvent(new PointerEvent("pointerup", init));
      };

      const check = (): void => {
        if (overlay.classList.contains("visible")) return;
        const x = Number(status.getAttribute("data-head-x"));
        const y = Number(status.getAttribute("data-head-y"));
        if (!reachedOrPassed(x, y, queue[0])) return;
        press(queue[0].direction);
        queue.shift();
        if (queue.length === 0) queue = [...cycle];
      };

      new MutationObserver(check).observe(status, { attributes: true, attributeFilter: ["data-head-x", "data-head-y"] });
      new MutationObserver(check).observe(overlay, { attributes: true, attributeFilter: ["class"] });
      check();
    },
    { cycle },
  );
}

/**
 * Steers along `buildFullBoardCycle`'s cycle (looping it as many times as
 * it takes — the steering itself runs in the page, see
 * installInPageSweepSteering), answering every science item correctly,
 * until the win card appears. Fails straight away if the game is lost.
 */
export async function sweepFullBoardUntilWin(page: Page, maxMs = 10 * 60 * 1000): Promise<void> {
  // Wait for the snake's first real move, so the scene is running and the
  // route's first turn can't be dropped (see buildFullBoardCycle's doc).
  const start = await readSweepStatus(page);
  await expect.poll(async () => (await readSweepStatus(page)).head.x, { timeout: 10000 }).not.toBe(start.head.x);
  await installInPageSweepSteering(page, buildFullBoardCycle(GRID_WIDTH, GRID_HEIGHT));

  const deadline = Date.now() + maxMs;
  // Real CI runs of this test have taken anywhere from ~5 to 90+ minutes
  // (RNG-driven poison-apple luck) — logging progress periodically means
  // a slow run's own CI output shows real growth (or the lack of it)
  // instead of a single opaque timeout at the very end.
  let lastLogAt = 0;
  while (Date.now() < deadline) {
    const { winVisible, loseMessage, overlayVisible, head, length } = await readSweepStatus(page);
    if (Date.now() - lastLogAt > 60000) {
      lastLogAt = Date.now();
      console.log(`[sweepFullBoardUntilWin] length=${length} elapsedMs=${Date.now() - (deadline - maxMs)}`);
    }
    if (winVisible) return;
    // A lost game never shows the win card, so without this the sweep
    // just kept polling a frozen board until its full 90-minute budget
    // ran out — CI's only clue was the logged length never changing.
    if (loseMessage !== null) {
      throw new Error(`sweepFullBoardUntilWin: the game was lost at length ${length}, head (${head.x},${head.y}): "${loseMessage}"`);
    }
    if (overlayVisible) {
      await answerCurrentQuestionCorrectly(page);
      continue;
    }
    await page.waitForTimeout(200);
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

/** Thrown by chaseNearestScienceItem when the game already ended mid-chase — carries the real lose-card message so a caller expecting suffocation specifically can tell that apart from a genuine bug (e.g. a self-collision). */
export class GameEndedError extends Error {
  constructor(public reason: string) {
    super(`game already ended (${reason})`);
  }
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
    // Bail out fast on a self-collision instead of dispatching pointless
    // direction presses to a dead snake until this function's own
    // timeout — found live as a real multi-minute hang, not guessed.
    if (await isCardVisible(page, "lose-card")) {
      const reason = (await page.locator("#lose-message").textContent()) ?? "";
      throw new GameEndedError(reason);
    }
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

/**
 * Repeats chaseNearestScienceItem + answering wrong twice until the game
 * ends. Doesn't itself check *which* lose reason that was — a
 * GameEndedError (the game ending mid-chase, the common case) or the
 * lose-card simply being up already both just mean "done, go look" —
 * the caller's own assertion (e.g. waitForLoseReason) is what actually
 * confirms it was suffocation specifically, not some other bug like a
 * self-collision, and fails loudly with a clear message if it wasn't.
 */
export async function driveToSuffocation(page: Page, maxMs = 10 * 60 * 1000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isCardVisible(page, "lose-card")) return;
    try {
      await chaseNearestScienceItem(page, maxMs);
    } catch (e) {
      if (e instanceof GameEndedError) return;
      throw e;
    }
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
