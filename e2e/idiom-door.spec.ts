import { test, expect, type Page } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";

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

test("shows a full-screen intro with the meaning before the level starts, and nothing moves until Start is pressed", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();

  const intro = page.locator("#level-intro-card");
  await expect(intro).toHaveClass(/visible/);
  await expect(intro.locator("[data-intro-meaning]")).toHaveText(`"${doorLevels[0].idiom.meaning}"`);

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

test("solving a level opens the door and running into it shows the next level's intro; Start begins it", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/idiom-door.html");
  await startPlaying(page);

  await spamJumpUntil(page, async () => (await status(page)).complete === "true");

  const intro = page.locator("#level-intro-card");
  await expect(intro).toHaveClass(/visible/, { timeout: 30000 });
  await expect(intro.locator("[data-intro-meaning]")).toHaveText(`"${doorLevels[1].idiom.meaning}"`);

  await startPlaying(page);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[1].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("solving all 3 levels shows the session summary, and Play again shows the first level's intro again", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto("/idiom-door.html");
  const summary = page.locator("#session-summary-card");
  await expect(summary).not.toBeVisible();
  await startPlaying(page);

  for (let i = 0; i < doorLevels.length; i++) {
    const isLast = i === doorLevels.length - 1;
    if (isLast) {
      await spamJumpUntil(page, async () => (await summary.isVisible()) || (await status(page)).complete === "true");
    } else {
      await spamJumpUntil(page, async () => (await status(page)).complete === "true");
      const intro = page.locator("#level-intro-card");
      await expect(intro).toHaveClass(/visible/, { timeout: 30000 });
      await expect(intro.locator("[data-intro-meaning]")).toHaveText(`"${doorLevels[i + 1].idiom.meaning}"`);
      await startPlaying(page);
    }
  }

  await expect(summary).toBeVisible({ timeout: 15000 });
  const hanziList = doorLevels.map((l) => l.idiom.hanzi).join(" · ");
  await expect(summary.locator("[data-summary-list]")).toHaveText(hanziList);

  await page.click("#play-again-btn");
  await expect(summary).not.toBeVisible();
  const intro = page.locator("#level-intro-card");
  await expect(intro).toHaveClass(/visible/);
  await expect(intro.locator("[data-intro-meaning]")).toHaveText(`"${doorLevels[0].idiom.meaning}"`);

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
