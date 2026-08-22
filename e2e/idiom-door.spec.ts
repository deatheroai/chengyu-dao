import { test, expect, type Page } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";

/**
 * Auto-runner puzzle (CATCH_MECHANIC_PLAN.md's 2026-08-23 revision):
 * the character runs forward on its own — no left/right control, no
 * separate grab button — and jumping is the one action, catching
 * whatever floating character it reaches automatically. Per your
 * feedback that walking backward to press GRAB felt clunky.
 *
 * Because motion is now unconditional (always forward, at a fixed
 * runSpeed), most of what the previous walking-era suite had to work
 * around — predicting exact stop positions, backtracking, deliberate
 * grab timing — no longer applies. These tests mostly just spam JUMP
 * on an interval and poll `#door-status` / `#player-position` for the
 * effect, which the pure-logic unit tests (orderedCatchProgress,
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

async function tapJump(page: Page): Promise<void> {
  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  await page.keyboard.up("Space");
}

/** Jumps on a steady interval until `predicate` is satisfied, or gives
 * up after `maxMs`. Jump timing doesn't need to be precise — every
 * correct character appears several times in a row (see
 * levelContent.ts's REPEATS_PER_CHARACTER), so a steady, not-especially
 * -aimed jump cadence reaches one of them soon enough. */
async function spamJumpUntil(page: Page, predicate: () => Promise<boolean>, maxMs = 45000, intervalMs = 360): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await tapJump(page);
    await page.waitForTimeout(intervalMs - 80);
    if (await predicate()) return;
  }
  throw new Error("spamJumpUntil timed out");
}

test("loads with the meaning shown, nothing found yet, and the character already running", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });

  const x1 = await getPlayerX(page);
  await page.waitForTimeout(500);
  const x2 = await getPlayerX(page);
  expect(x2).toBeGreaterThan(x1); // running forward on its own, no input needed
});

test("running without ever jumping never catches anything", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.waitForTimeout(4000); // several floating characters would have been run past by now
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("jumping repeatedly eventually catches the correct next character", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await spamJumpUntil(page, async () => (await status(page)).nextIndex !== "0");
});

test("reaching the door without completing the level gently restarts it from the start", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/idiom-door.html");
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
});

test("solving a level opens the door and running into it advances to the next idiom's meaning", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/idiom-door.html");

  await spamJumpUntil(page, async () => (await status(page)).complete === "true");
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[1].idiom.meaning}"`, { timeout: 30000 });
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("solving all 3 levels shows the session summary, and Play again resets to level 1", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto("/idiom-door.html");
  const summary = page.locator("#session-summary-card");
  await expect(summary).not.toBeVisible();

  for (let i = 0; i < doorLevels.length; i++) {
    const isLast = i === doorLevels.length - 1;
    if (isLast) {
      await spamJumpUntil(page, async () => (await summary.isVisible()) || (await status(page)).complete === "true");
    } else {
      await spamJumpUntil(page, async () => (await status(page)).complete === "true");
      await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[i + 1].idiom.meaning}"`, { timeout: 30000 });
    }
  }

  await expect(summary).toBeVisible({ timeout: 15000 });
  const hanziList = doorLevels.map((l) => l.idiom.hanzi).join(" · ");
  await expect(summary.locator("[data-summary-list]")).toHaveText(hanziList);

  await page.click("#play-again-btn");
  await expect(summary).not.toBeVisible();
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("the on-screen JUMP button works the same as the keyboard", async ({ page }) => {
  await page.goto("/idiom-door.html");
  const btn = page.locator("#jump-btn");

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    await btn.dispatchEvent("pointerdown");
    await page.waitForTimeout(280);
    if ((await status(page)).nextIndex !== "0") break;
  }
  expect((await status(page)).nextIndex).not.toBe("0");
});
