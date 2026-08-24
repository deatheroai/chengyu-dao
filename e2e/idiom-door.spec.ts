import { test, expect, type Page } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";
import { balloonLevels } from "../src/idiom-door/balloonLevelContent";

/**
 * Auto-runner puzzle (CATCH_MECHANIC_PLAN.md's 2026-08-23 revision):
 * the character runs forward on its own — no left/right control, no
 * separate grab button — and jumping is the one action, catching
 * whatever floating character it reaches automatically. Per your
 * feedback that walking backward to press GRAB felt clunky.
 *
 * Each level now opens with a full-screen intro card showing the
 * meaning (2026-08-23's follow-up feedback: give the child reading/
 * thinking time on a big screen before the run starts) — the scene
 * doesn't even start running until its Start button is pressed, so
 * every test needs to dismiss that intro before expecting any motion.
 *
 * Because motion is unconditional once running (always forward, at a
 * fixed runSpeed), most of what the previous walking-era suite had to
 * work around — predicting exact stop positions, backtracking,
 * deliberate grab timing — doesn't apply. These tests mostly just spam
 * JUMP on an interval and poll `#door-status` / `#player-position` for
 * the effect, which the pure-logic unit tests (orderedCatchProgress,
 * levelContent) already cover precisely — this suite's job is
 * confirming the pieces are wired together correctly, not re-proving
 * the logic.
 */
async function getPlayerX(page: Page): Promise<number> {
  const attr = await page.locator("#player-position").getAttribute("data-x");
  return Number(attr ?? "0");
}

async function status(page: Page) {
  return page.locator("#door-status").evaluate((el) => ({
    nextIndex: el.getAttribute("data-next-index"),
    complete: el.getAttribute("data-complete"),
  }));
}

// Once `nextIndex`/`complete` flips true, the character still has to
// physically *run* to the door before anything past that point (the
// next intro, or the session summary) appears — and since 2026-08-24's
// randomized 5-9 repeats per character (up from a flat 4), a level's
// track can run up to ~9400px long (levelContent.ts's
// MAX_REPEATS_PER_CHARACTER), which even at this mechanic's (also
// bumped, same feedback round) 320px/s runSpeed is still up to ~30s of
// running if the puzzle happens to complete right at the start of the
// track. This timeout covers that worst case with real headroom,
// rather than a fixed guess sized for the old, much shorter/slower
// tracks (which is exactly what broke here once tracks got longer).
const DOOR_REACH_TIMEOUT_MS = 70000;

/** Asserts the level-intro card is showing a given level's Mandarin
 * clue (hanzi + pinyin), with the English fallback still hidden. */
async function expectIntroShowing(page: Page, levelIndex: number): Promise<void> {
  const idiom = doorLevels[levelIndex].idiom;
  const intro = page.locator("#level-intro-card");
  await expect(intro).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect(intro.locator("[data-intro-meaning-zh]")).toHaveText(idiom.meaningZh.hanzi);
  await expect(intro.locator("[data-intro-meaning-pinyin]")).toHaveText(idiom.meaningZh.pinyin);
  await expect(intro.locator("[data-intro-meaning-en]")).toBeHidden();
}

/** Dismisses the level-intro screen (reading/thinking pause) so the
 * run actually starts. Every test needs this right after `page.goto()`,
 * and again after every level transition — each new level shows its
 * own intro. The one exception is the in-scene "reached the door
 * unsolved" restart, which deliberately does *not* re-show the intro. */
async function startPlaying(page: Page): Promise<void> {
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
  await page.click("#start-level-btn");
  await expect(page.locator("#level-intro-card")).not.toHaveClass(/visible/);
}

async function tapJump(page: Page): Promise<void> {
  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  await page.keyboard.up("Space");
}

/** Jumps on a steady interval until `predicate` is satisfied, or gives
 * up after `maxMs`. Jump timing doesn't need to be precise — every
 * correct character appears several times (see levelContent.ts's
 * REPEATS_PER_CHARACTER), scattered across a wide window rather than
 * lined up, so a steady, not-especially-aimed jump cadence reaches one
 * of them soon enough. */
async function spamJumpUntil(page: Page, predicate: () => Promise<boolean>, maxMs = 45000, intervalMs = 360): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await tapJump(page);
    await page.waitForTimeout(intervalMs - 80);
    if (await predicate()) return;
  }
  throw new Error("spamJumpUntil timed out");
}

/** Asserts the balloon-sentence stage (2026-08-25: a stage after each
 * idiom's door) is showing for a given level, naming that idiom in the
 * prompt and starting unresolved. */
async function expectBalloonStageShowing(page: Page, levelIndex: number): Promise<void> {
  const idiom = balloonLevels[levelIndex].idiom;
  await expect(page.locator("#balloon-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect(page.locator("#balloon-prompt")).toContainText(idiom.hanzi);
  await expect(page.locator("#balloon-status")).toHaveAttribute("data-resolved", "false");
}

/** Balloon positions depend on rendered text measurement (word-wrapped
 * sentence bounding boxes), not just content, so — unlike the door
 * puzzle's tiles — a test can't fly straight to a known x/y. Instead
 * this sweeps a small zigzag pattern repeatedly, which reliably crosses
 * every balloon in the (compact, roughly-square) grid within a few
 * loops, same "don't need pixel-precise aim, just keep trying" spirit
 * as spamJumpUntil. */
async function flyUntilResolved(page: Page, maxMs = 60000): Promise<void> {
  const moves: Array<"ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"> = [
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowLeft",
    "ArrowUp",
    "ArrowUp",
    "ArrowRight",
    "ArrowRight",
  ];
  const deadline = Date.now() + maxMs;
  let i = 0;
  while (Date.now() < deadline) {
    const key = moves[i % moves.length];
    i++;
    await page.keyboard.down(key);
    await page.waitForTimeout(220);
    await page.keyboard.up(key);
    if ((await page.locator("#balloon-status").getAttribute("data-resolved")) === "true") return;
  }
  throw new Error("flyUntilResolved timed out");
}

/** Asserts the 2026-08-28 success card (congratulations + meaning/
 * example recap, shown after a correct balloon catch, before advancing)
 * is showing the right idiom's content. */
async function expectBalloonSuccessCardShowing(page: Page, levelIndex: number): Promise<void> {
  const idiom = balloonLevels[levelIndex].idiom;
  const card = page.locator("#balloon-success-card");
  await expect(card).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect(card.locator("[data-success-hanzi]")).toHaveText(idiom.hanzi);
  await expect(card.locator("[data-success-pinyin]")).toHaveText(idiom.pinyin);
  await expect(card.locator("[data-success-meaning-zh]")).toHaveText(idiom.meaningZh.hanzi);
  await expect(card.locator("[data-success-sentence]")).toHaveText(idiom.exampleSentence.hanzi);
}

/** Dismisses the success card so the session actually advances — the
 * card gates that the same way level-intro-card's Start button gates
 * a level beginning (2026-08-28: tap to continue, not a timer). */
async function continueFromBalloonSuccess(page: Page): Promise<void> {
  await page.click("#balloon-continue-btn");
  await expect(page.locator("#balloon-success-card")).not.toHaveClass(/visible/);
}

test("shows a full-screen intro with the meaning before the level starts, and nothing moves until Start is pressed", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();

  await expectIntroShowing(page, 0);

  const x1 = await getPlayerX(page);
  await page.waitForTimeout(500);
  const x2 = await getPlayerX(page);
  expect(x2).toBe(x1); // frozen behind the intro card, no auto-run yet

  await startPlaying(page);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });

  const x3 = await getPlayerX(page);
  await page.waitForTimeout(500);
  const x4 = await getPlayerX(page);
  expect(x4).toBeGreaterThan(x3); // now running forward on its own, no input needed
});

test("the intro's English explanation stays hidden until the 🤔 icon is tapped", async ({ page }) => {
  await page.goto("/idiom-door.html");
  const intro = page.locator("#level-intro-card");
  const englishEl = intro.locator("[data-intro-meaning-en]");
  await expect(englishEl).toBeHidden();

  await page.click("#reveal-english-btn");
  await expect(englishEl).toBeVisible();
  await expect(englishEl).toHaveText(`"${doorLevels[0].idiom.meaning}"`);
});

test("running without ever jumping never catches anything", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await startPlaying(page);
  await page.waitForTimeout(4000); // several floating characters would have been run past by now
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("jumping repeatedly eventually catches the correct next character", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await startPlaying(page);
  await spamJumpUntil(page, async () => (await status(page)).nextIndex !== "0");
});

test("reaching the door without completing the level gently restarts it from the start, without re-showing the intro", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/idiom-door.html");
  await startPlaying(page);
  const level = doorLevels[0];

  // Never jump — the character will run the whole (unsolved) track and
  // hit the closed door. Detect the reset by a sudden drop in x, rather
  // than polling for x to cross some threshold near the door: the
  // door's own trigger window is narrower than one polling interval's
  // worth of travel, so a poll can straddle it every single lap without
  // ever sampling a value inside it — which looked identical to an
  // infinite loop before this fix (x approached the door, reset, and
  // repeated identically forever, since motion is fully deterministic).
  let prevX = await getPlayerX(page);
  let resetDetected = false;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(200);
    const x = await getPlayerX(page);
    if (x < prevX - 100) {
      resetDetected = true;
      break;
    }
    prevX = x;
  }
  expect(resetDetected).toBe(true);
  await page.waitForTimeout(400);

  const restartedX = await getPlayerX(page);
  expect(restartedX).toBeLessThan(level.length * 0.1); // back near the start
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" }); // progress reset too
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${level.idiom.meaning}"`); // same level, not advanced
  await expect(page.locator("#level-intro-card")).not.toHaveClass(/visible/); // same-level restart, no intro re-shown
});

test("solving a level opens the door into the balloon stage, and resolving that shows the next level's intro; Start begins it", async ({ page }) => {
  test.setTimeout(210000);
  await page.goto("/idiom-door.html");
  await startPlaying(page);

  await spamJumpUntil(page, async () => (await status(page)).complete === "true");

  await expectBalloonStageShowing(page, 0);
  await flyUntilResolved(page);

  await expectBalloonSuccessCardShowing(page, 0);
  await continueFromBalloonSuccess(page);

  await expectIntroShowing(page, 1);

  await startPlaying(page);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[1].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("the balloon stage shows the idiom-specific prompt, and flying around eventually resolves it", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/idiom-door.html");
  await startPlaying(page);
  await spamJumpUntil(page, async () => (await status(page)).complete === "true");

  await expectBalloonStageShowing(page, 0);
  await flyUntilResolved(page);

  await expect(page.locator("#balloon-status")).toHaveAttribute("data-resolved", "true");
  await expect(page.locator("#balloon-status")).toHaveText("That's the one! Great reading. 🎈");
});

test("dragging the pointer steers the avatar toward it (2026-08-26: replaced the on-screen d-pad)", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/idiom-door.html");
  await startPlaying(page);
  await spamJumpUntil(page, async () => (await status(page)).complete === "true");
  await expectBalloonStageShowing(page, 0);

  const x1 = Number(await page.locator("#balloon-position").getAttribute("data-x"));
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");

  // Press down roughly where the avatar starts (center), then drag
  // toward the right edge — the avatar should steer toward wherever the
  // pointer currently is, same physics as a held keyboard direction.
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 20, startY, { steps: 5 });
  await page.waitForTimeout(700);
  await page.mouse.up();

  const x2 = Number(await page.locator("#balloon-position").getAttribute("data-x"));
  expect(x2).toBeGreaterThan(x1);
});

test("solving all 3 levels shows the session summary, and Play again shows the first level's intro again", async ({ page }) => {
  test.setTimeout(600000);
  await page.goto("/idiom-door.html");
  const summary = page.locator("#session-summary-card");
  await expect(summary).not.toBeVisible();
  await startPlaying(page);
  await expect(page.locator("[data-progress-fraction]")).toHaveText("1/3");

  for (let i = 0; i < doorLevels.length; i++) {
    await spamJumpUntil(page, async () => (await status(page)).complete === "true");
    await expectBalloonStageShowing(page, i);
    await flyUntilResolved(page);

    await expectBalloonSuccessCardShowing(page, i);
    await continueFromBalloonSuccess(page);

    const isLast = i === doorLevels.length - 1;
    if (isLast) {
      await expect(summary).toBeVisible({ timeout: DOOR_REACH_TIMEOUT_MS });
      // 2026-08-27: the "1/3, 2/3, ..." session-progress badge — every
      // dot done, none current, once the whole session is complete.
      await expect(page.locator("[data-progress-fraction]")).toHaveText("3/3");
      await expect(page.locator(".progress-dot.done")).toHaveCount(doorLevels.length);
      await expect(page.locator(".progress-dot.current")).toHaveCount(0);
    } else {
      await expectIntroShowing(page, i + 1);
      await expect(page.locator("[data-progress-fraction]")).toHaveText(`${i + 2}/${doorLevels.length}`);
      await startPlaying(page);
    }
  }

  const hanziList = doorLevels.map((l) => l.idiom.hanzi).join(" · ");
  await expect(summary.locator("[data-summary-list]")).toHaveText(hanziList);

  await page.click("#play-again-btn");
  await expect(summary).not.toBeVisible();
  await expectIntroShowing(page, 0);
  await expect(page.locator("[data-progress-fraction]")).toHaveText("1/3");

  await startPlaying(page);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("the on-screen JUMP button works the same as the keyboard", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await startPlaying(page);
  const btn = page.locator("#jump-btn");

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    await btn.dispatchEvent("pointerdown");
    await page.waitForTimeout(280);
    if ((await status(page)).nextIndex !== "0") break;
  }
  expect((await status(page)).nextIndex).not.toBe("0");
});
