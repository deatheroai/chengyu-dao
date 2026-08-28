import { test, expect, type Page, type Locator } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";
import { balloonLevels } from "../src/idiom-door/balloonLevelContent";
import { completeMatchStage } from "./helpers/idiomMatch";

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
 *
 * 2026-08-24: the session now opens with a one-time "join the two
 * halves" match warm-up *before* the first level's own intro (see
 * IdiomMatchScene / matchLevelContent.ts) — every test here calls
 * `completeMatchStage` (e2e/helpers/idiomMatch.ts) right after
 * `page.goto` to get past it quickly, since this suite's job is the
 * door/balloon stages; idiom-match.spec.ts tests the warm-up itself.
 */
async function getPlayerX(page: Page): Promise<number> {
  const attr = await page.locator("#player-position").getAttribute("data-x");
  return Number(attr ?? "0");
}

/** 2026-08-28: hanzi+pinyin throughout this game is now rendered as
 * ruby annotation (rubyText.ts) — pinyin lives in `<rt>` elements
 * *inside* the hanzi container, so a raw `.textContent`/`toHaveText`
 * check picks up interleaved pinyin syllables along with the hanzi,
 * not just the hanzi. This strips `<rt>` content from a clone (never
 * mutating the real page) to recover just the base hanzi text, so
 * assertions can still check "does this element show idiom X" without
 * having to spell out every character's pinyin inline. */
async function rubyBaseText(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("rt").forEach((rt) => rt.remove());
    return clone.textContent ?? "";
  });
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
 * clue (hanzi, each character ruby-annotated with its own pinyin —
 * see rubyText.ts), with the English fallback still hidden. */
async function expectIntroShowing(page: Page, levelIndex: number): Promise<void> {
  const idiom = doorLevels[levelIndex].idiom;
  const intro = page.locator("#level-intro-card");
  const zhEl = intro.locator("[data-intro-meaning-zh]");
  await expect(intro).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect.poll(() => rubyBaseText(zhEl)).toBe(idiom.meaningZh.hanzi);
  // At least one character actually got a pinyin annotation, not just
  // the bare hanzi — confirms renderRubyText ran, not only that the
  // (harder to get wrong) plain-text fallback would have looked right.
  await expect(zhEl.locator("rt").first()).not.toHaveText("");
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
 * idiom's door; redesigned 2026-08-26 to show the idiom's own example
 * sentence with the idiom blanked out, rather than naming the idiom
 * directly) is showing for a given level, and starting unresolved. */
async function expectBalloonStageShowing(page: Page, levelIndex: number): Promise<void> {
  const { maskedSentence, idiom } = balloonLevels[levelIndex];
  const prompt = page.locator("#balloon-prompt");
  await expect(page.locator("#balloon-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect.poll(() => rubyBaseText(prompt)).toBe(maskedSentence.hanzi);
  // The blanked sentence never hands the child the answer directly.
  await expect.poll(() => rubyBaseText(prompt)).not.toContain(idiom.hanzi);
  await expect(page.locator("#balloon-status")).toHaveAttribute("data-resolved", "false");
}

/**
 * Balloon positions depend on rendered text measurement and this
 * stage's own scrolling camera, not just content, so — unlike the door
 * puzzle's tiles — a test can't fly toward a known *screen* position
 * from content alone. 2026-08-26: rather than guessing a blind search
 * pattern (tried a fixed zigzag, then screen-corner waypoints, then
 * directional holds — none reliably covered an arbitrarily-sized/
 * shaped grid within a sane timeout), this steers directly to the
 * correct balloon's real position, continuously re-read from the
 * `#balloon-target-positions`/`#balloon-camera-scroll` test-only hooks
 * (balloonPositionStatus.ts) and converted from world to screen space
 * — same "expose the exact position, drag deterministically" approach
 * idiom-match.spec.ts's dragMatchTile already uses for match tiles, just
 * re-read every beat here since a balloon keeps drifting *and* the
 * camera keeps re-centering, unlike a match tile's fixed position.
 *
 * 2026-08-28: clamped to just inside the canvas's own bounds. Once the
 * game started drawing its door/balloon session from a rotating
 * selection of idioms (sessionIdioms.ts) rather than the same fixed 3
 * every time, some layouts put the correct balloon far enough from the
 * avatar's starting position that the naive world→screen conversion
 * lands off-canvas (negative, or past the canvas's own width/height) on
 * the first cycle or two, before the camera has scrolled to follow. A
 * real finger/mouse can't click outside the screen either — it would
 * just drag to the nearest edge in that direction, and the *next*
 * cycle's re-read (as the avatar/camera catch up) converges from there,
 * same as this now does. Confirmed via a reproduction against a session
 * that reliably hit this (jing-di-zhi-wa / ban-tu-er-fei /
 * yan-er-you-xin, 2026-08-28): unclamped, the aim point stayed stuck
 * off-canvas cycle after cycle and never resolved within the timeout;
 * clamped, it converged in ~2.5s.
 */
async function correctBalloonScreenPosition(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
): Promise<{ x: number; y: number }> {
  const target = page.locator('#balloon-target-positions span[data-correct="true"]');
  const wx = Number(await target.getAttribute("data-x"));
  const wy = Number(await target.getAttribute("data-y"));
  const scrollX = Number(await page.locator("#balloon-camera-scroll").getAttribute("data-x"));
  const scrollY = Number(await page.locator("#balloon-camera-scroll").getAttribute("data-y"));
  const rawX = box.x + (wx - scrollX);
  const rawY = box.y + (wy - scrollY);
  return {
    x: Math.min(Math.max(rawX, box.x + 1), box.x + box.width - 1),
    y: Math.min(Math.max(rawY, box.y + 1), box.y + box.height - 1),
  };
}

// Generous relative to how fast this actually resolves in practice
// (well under a second of real dragging once aimed) — the slack is for
// CPU contention under parallel test load, not aiming uncertainty: this
// steers directly to the correct balloon's live position every beat
// (see correctBalloonScreenPosition above), so a longer timeout here
// costs nothing when things go normally and only matters as headroom
// when they don't. Presses and releases once per cycle (rather than one
// continuous hold micro-adjusted every beat) — a fresh, decisive
// press-move-hold-release, same shape as the already-reliable "dragging
// the pointer" test elsewhere in this file — proved more robust than a
// single long-held drag with many intermediate moves.
async function flyUntilResolved(page: Page, maxMs = 45000): Promise<void> {
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  const isResolved = async (): Promise<boolean> => (await page.locator("#balloon-status").getAttribute("data-resolved")) === "true";

  const CYCLE_MS = 2000;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const pos = await correctBalloonScreenPosition(page, box);
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    let resolved = false;
    try {
      const cycleDeadline = Math.min(deadline, Date.now() + CYCLE_MS);
      while (Date.now() < cycleDeadline) {
        await page.waitForTimeout(150);
        if (await isResolved()) {
          resolved = true;
          break;
        }
      }
    } finally {
      await page.mouse.up();
    }
    if (resolved) return;
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
  await expect.poll(() => rubyBaseText(card.locator("[data-success-hanzi]"))).toBe(idiom.hanzi);
  await expect.poll(() => rubyBaseText(card.locator("[data-success-meaning-zh]"))).toBe(idiom.meaningZh.hanzi);
  await expect.poll(() => rubyBaseText(card.locator("[data-success-sentence]"))).toBe(idiom.exampleSentence.hanzi);
  // Each hanzi line actually got ruby-annotated, not just left plain.
  await expect(card.locator("[data-success-hanzi] rt").first()).not.toHaveText("");
}

/** Dismisses the success card so the session actually advances — the
 * card gates that the same way level-intro-card's Start button gates
 * a level beginning (2026-08-28: tap to continue, not a timer). */
async function continueFromBalloonSuccess(page: Page): Promise<void> {
  await page.click("#balloon-continue-btn");
  await expect(page.locator("#balloon-success-card")).not.toHaveClass(/visible/);
}

/**
 * 2026-08-27 regression: the dev-only #dev-controls block (bottom-right)
 * used to visually and functionally overlap #jump-btn (bottom-*center*,
 * but wide enough that its own right edge reaches well into the right
 * side of a typical mobile viewport) — a real child could accidentally
 * tap "Seed history"/"Clear history" instead of jumping, per your
 * report. Confirmed via bounding boxes, not just visually, since a
 * small pixel overlap is easy to miss in a screenshot.
 */
test("the dev-only controls never overlap the jump button", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);

  const jumpBox = await page.locator("#jump-btn").boundingBox();
  const devBox = await page.locator("#dev-controls").boundingBox();
  if (!jumpBox || !devBox) throw new Error("missing bounding box");

  const overlapsHorizontally = jumpBox.x < devBox.x + devBox.width && devBox.x < jumpBox.x + jumpBox.width;
  const overlapsVertically = jumpBox.y < devBox.y + devBox.height && devBox.y < jumpBox.y + jumpBox.height;
  expect(overlapsHorizontally && overlapsVertically).toBe(false);
});

test("shows a full-screen intro with the meaning before the level starts, and nothing moves until Start is pressed", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
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
  await completeMatchStage(page);
  const intro = page.locator("#level-intro-card");
  const englishEl = intro.locator("[data-intro-meaning-en]");
  await expect(englishEl).toBeHidden();

  await page.click("#reveal-english-btn");
  await expect(englishEl).toBeVisible();
  await expect(englishEl).toHaveText(`"${doorLevels[0].idiom.meaning}"`);
});

test("running without ever jumping never catches anything", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await page.waitForTimeout(4000); // several floating characters would have been run past by now
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("jumping repeatedly eventually catches the correct next character", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await spamJumpUntil(page, async () => (await status(page)).nextIndex !== "0");
});

test("reaching the door without completing the level gently restarts it from the start, without re-showing the intro", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
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
  await completeMatchStage(page);
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

test("the balloon stage shows the sentence with the idiom blanked out, and flying around eventually resolves it", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
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
  await completeMatchStage(page);
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
  await completeMatchStage(page);
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

  // 2026-08-26: finishing that first real session earlier in this test
  // (before "Play again" restarted a fresh in-page run) should be enough
  // on its own to trigger a resurface callback on a genuinely fresh page
  // load - no dev control needed here, this exercises the real
  // record/read path end to end. See idiom-door-resurface.spec.ts for
  // the dev-control-based coverage of the resurface flow itself; this
  // reuses the full completion already paid for above rather than
  // repeating it in its own (expensive) test.
  await page.goto("/idiom-door.html");
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);
  await expect(page.locator("[data-resurface-hanzi]")).not.toBeEmpty();
});

test("the on-screen JUMP button works the same as the keyboard", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
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
