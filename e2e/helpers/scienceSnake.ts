import { expect, type Page } from "@playwright/test";
import { GRID_WIDTH, GRID_HEIGHT, type Direction, type Position } from "../../src/science-snake/snakeGrid";
import { scienceQuestions } from "../../src/science-snake/scienceQuestions";
import { steerRoomTo, stopRoomSteering } from "./answerRoom";

/**
 * Drives `science-snake.html` deterministically for e2e coverage
 * (BACKLOG.md's "E2E test suite" entry). Mirrors idiom-door's own
 * e2e/helpers/ split: the actual game logic is untouched real play (real
 * ticks, real spawner, real grading) — this only reads the test-only DOM
 * hooks (`snakeStatus.ts`'s #snake-status/#board-items, same
 * "canvas-internal state isn't otherwise observable, expose it as a
 * hidden data attribute" pattern idiom-door's own #player-position/
 * #balloon-target-positions already use) and taps the same on-screen
 * joystick a real child would use. Steering runs *inside the page*
 * (installInPageSweepSteering, installInPageChaser), reacting to each
 * tick before the next — see those for why: steering from the test
 * process missed turns on busy CI runners. Taps are dispatched straight
 * at #joystick rather than via page.click(), whose actionability checks
 * hung while a card (above the joystick in z-index) intercepted pointer
 * events.
 */

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

/** Single round-trip per poll (win/lose cards, the golden card, the answer room, head position all at once) rather than several sequential ones. */
async function readSweepStatus(page: Page): Promise<{
  winVisible: boolean;
  loseMessage: string | null;
  goldenVisible: boolean;
  inRoom: boolean;
  head: Position;
  length: number;
}> {
  return page.evaluate(() => {
    const winVisible = document.getElementById("win-card")?.classList.contains("visible") ?? false;
    const loseVisible = document.getElementById("lose-card")?.classList.contains("visible") ?? false;
    const loseMessage = loseVisible ? (document.getElementById("lose-message")?.textContent ?? "") : null;
    const goldenVisible = document.getElementById("golden-card")?.classList.contains("visible") ?? false;
    const inRoom = document.getElementById("room-panel")?.dataset.mode === "room";
    const status = document.getElementById("snake-status");
    const head = { x: Number(status?.getAttribute("data-head-x")), y: Number(status?.getAttribute("data-head-y")) };
    return { winVisible, loseMessage, goldenVisible, inRoom, head, length: Number(status?.getAttribute("data-length")) };
  });
}

/** A golden apple was eaten: type the question's own real `modelAnswer` (matched off the displayed prompt) — a content-tested correct answer, not a cheat string. */
async function answerGoldenCorrectly(page: Page): Promise<void> {
  const promptText = await page.locator("#golden-question").textContent();
  const question = scienceQuestions.find((q) => q.prompt === promptText);
  if (!question) throw new Error(`no scienceQuestions entry matches prompt: ${promptText}`);
  await page.fill("#golden-input", question.modelAnswer);
  await page.click("#golden-submit-btn");
  await page.click("#golden-continue-btn");
}

/** The snake went through the ANSWER door: build the sentence (the right blue apple) and climb out, back to the board. */
async function buildAnswerInRoom(page: Page): Promise<void> {
  await steerRoomTo(page, "right");
  await expect(page.locator("#room-panel")).not.toHaveAttribute("data-mode", "room", { timeout: 180_000 });
  await stopRoomSteering(page);
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
 * A turn due while the board is paused — the golden apple's card open,
 * the snake in the answer room, or the 3-2-1 after either — is held
 * until the board moves again: the scene ignores direction changes while
 * paused (SnakeGameScene's requestDirection), and the head hasn't moved
 * in the meantime.
 */
async function installInPageSweepSteering(page: Page, cycle: Waypoint[]): Promise<void> {
  await page.evaluate(
    ({ cycle }) => {
      type Dir = "up" | "down" | "left" | "right";
      type Wp = { x: number; y: number; direction: Dir; approach: Dir };
      const status = document.getElementById("snake-status")!;
      const joystick = document.getElementById("joystick")!;
      const golden = document.getElementById("golden-card")!;
      const panel = document.getElementById("room-panel")!;
      const countdown = document.getElementById("countdown")!;
      const boardPaused = (): boolean =>
        golden.classList.contains("visible") || panel.dataset.mode === "room" || (countdown.textContent ?? "").trim() !== "";
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
        if (boardPaused()) return;
        const x = Number(status.getAttribute("data-head-x"));
        const y = Number(status.getAttribute("data-head-y"));
        if (!reachedOrPassed(x, y, queue[0])) return;
        press(queue[0].direction);
        queue.shift();
        if (queue.length === 0) queue = [...cycle];
      };

      new MutationObserver(check).observe(status, { attributes: true, attributeFilter: ["data-head-x", "data-head-y"] });
      new MutationObserver(check).observe(golden, { attributes: true, attributeFilter: ["class"] });
      new MutationObserver(check).observe(panel, { attributes: true, attributeFilter: ["data-mode"] });
      new MutationObserver(check).observe(countdown, { childList: true, characterData: true, subtree: true });
      check();
    },
    { cycle },
  );
}

/**
 * Steers along `buildFullBoardCycle`'s cycle (looping it as many times as
 * it takes — the steering itself runs in the page, see
 * installInPageSweepSteering), eating each question's phrases as it
 * crosses them, answering in the answer room or typing a golden answer
 * whenever it runs into the door or a golden apple, until the win card
 * appears. Fails straight away if the game is lost.
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
    const { winVisible, loseMessage, goldenVisible, inRoom, head, length } = await readSweepStatus(page);
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
    if (goldenVisible) {
      await answerGoldenCorrectly(page);
      continue;
    }
    if (inRoom) {
      await buildAnswerInRoom(page);
      continue;
    }
    await page.waitForTimeout(200);
  }
  throw new Error("sweepFullBoardUntilWin timed out");
}
