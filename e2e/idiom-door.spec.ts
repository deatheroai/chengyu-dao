import { test, expect, type Page } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";

/**
 * Meaning-first ordered-character puzzle (CATCH_MECHANIC_PLAN.md's
 * 2026-08-22 redesign): the idiom's meaning is shown upfront, the child
 * must grab its 4 characters in order, and a door opens to the next
 * idiom once solved. Builds on the same movement/jump/grab/camera-scroll
 * foundation as platform-catch — see that spec's header comment for the
 * timing lessons (holdKey's real down/up gap, polling real position via
 * `#player-position` instead of predicting it) that apply here too.
 *
 * Positions come straight from `levelContent.ts` (imported directly)
 * rather than duplicated as constants, so this suite can't drift out of
 * sync with the actual content the way a hand-copied constant could.
 */
function worldWidth(page: Page): number {
  const vp = page.viewportSize();
  if (!vp) throw new Error("viewport not set");
  return vp.width * 2; // mirrors IdiomDoorScene's WORLD_WIDTH_MULTIPLIER
}

async function getPlayerX(page: Page): Promise<number> {
  const attr = await page.locator("#player-position").getAttribute("data-x");
  return Number(attr ?? "0");
}

/**
 * Shared by both the keyboard and on-screen-button movement helpers.
 * Moves in short bursts rather than one long continuous hold — a
 * multi-second continuous key hold occasionally never resumed moving
 * partway through under this sandbox's software-rendered Chromium (the
 * same class of input flakiness documented elsewhere in this project,
 * e.g. the tap-drop entries in DECISIONS.md), found via a throwaway
 * repro script logging the character's real position frame by frame.
 * Each burst's own down/up pair either works or doesn't, and a stalled
 * one just gets retried on the next burst instead of stalling the
 * whole walk.
 *
 * `reached` is *directional* (>= for rightward, <= for leftward) rather
 * than an absolute-distance check — an earlier version of the touch-
 * controls test used `Math.abs(x - target) < 20` with a direction
 * picked once up front, which a large burst could jump straight over
 * without ever satisfying, then kept pushing the same (now wrong)
 * direction for the rest of the timeout.
 *
 * Burst size is deliberately small (not just "short enough to avoid the
 * stall"): the catch radius itself scales with world width (narrower on
 * mobile), and a burst's worst-case overshoot must stay smaller than
 * the *narrowest* radius across every project this suite runs under, or
 * "reached the target" and "close enough to grab" stop meaning the same
 * thing. Found by reproducing the exact mobile-only failure directly —
 * a 600ms/~108px burst reliably landed ~40px past a tile, just outside
 * its ~37px mobile-world catch radius, while comfortably inside
 * desktop's larger one (which is why only mobile failed).
 */
async function walkUsing(page: Page, targetX: number, press: () => Promise<void>, release: () => Promise<void>, rightward: boolean, maxMs = 20000): Promise<void> {
  const reached = (x: number) => (rightward ? x >= targetX : x <= targetX);
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    if (reached(await getPlayerX(page))) return;
    await press();
    await page.waitForTimeout(150);
    await release();
    await page.waitForTimeout(15);
  }
}

async function walkTo(page: Page, targetX: number, maxMs = 20000): Promise<void> {
  const rightward = targetX >= (await getPlayerX(page));
  const key = rightward ? "ArrowRight" : "ArrowLeft";
  await walkUsing(page, targetX, () => page.keyboard.down(key), () => page.keyboard.up(key), rightward, maxMs);
}

async function holdKey(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function grab(page: Page): Promise<void> {
  await holdKey(page, "z", 60);
}

async function status(page: Page) {
  return page.locator("#door-status").evaluate((el) => ({
    nextIndex: el.getAttribute("data-next-index"),
    complete: el.getAttribute("data-complete"),
    outcome: el.getAttribute("data-outcome"),
  }));
}

/** Walks to and grabs a tile, jumping first if it's on a platform. */
async function collectTile(page: Page, width: number, xFrac: number, needsJump: boolean): Promise<void> {
  await walkTo(page, xFrac * width);
  await page.waitForTimeout(150);
  if (needsJump) {
    await holdKey(page, "Space", 60);
    await page.waitForTimeout(900);
  }
  await grab(page);
  await page.waitForTimeout(200);
}

/** Solves an entire level in the levelContent-defined correct order. */
async function solveLevel(page: Page, width: number, levelIndex: number): Promise<void> {
  const tiles = doorLevels[levelIndex].tiles
    .filter((t) => t.correctIndex !== undefined)
    .sort((a, b) => a.correctIndex! - b.correctIndex!);
  for (const tile of tiles) {
    await collectTile(page, width, tile.xFrac, tile.surface !== "ground");
  }
}

test("loads with the meaning shown and nothing found yet", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false", outcome: null });
});

test("grabbing a correct-idiom character out of order doesn't advance, and the tile stays available for later", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/idiom-door.html");
  const width = worldWidth(page);
  const level = doorLevels[0];
  const secondTile = level.tiles.find((t) => t.correctIndex === 1)!;

  await collectTile(page, width, secondTile.xFrac, secondTile.surface !== "ground");
  let s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false", outcome: "wrong" });

  // Solve the level in the correct order anyway — the tile grabbed out
  // of turn above must still be there when its actual turn comes.
  await solveLevel(page, width, 0);
  s = await status(page);
  expect(s.complete).toBe("true");
});

test("grabbing a decoy from another idiom doesn't advance", async ({ page }) => {
  await page.goto("/idiom-door.html");
  const width = worldWidth(page);
  const decoy = doorLevels[0].tiles.find((t) => t.correctIndex === undefined)!;

  await collectTile(page, width, decoy.xFrac, decoy.surface !== "ground");
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false", outcome: "wrong" });
});

test("solving a level in order reveals a door; walking to it advances to the next idiom's meaning", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/idiom-door.html");
  const width = worldWidth(page);

  await solveLevel(page, width, 0);
  expect((await status(page)).complete).toBe("true");

  // Door sits at DOOR_XFRAC (0.98) of the world.
  await walkTo(page, 0.98 * width);
  await page.waitForTimeout(500);

  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[1].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false", outcome: null });
});

test("solving all 3 levels shows the session summary, and Play again resets to level 1", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto("/idiom-door.html");
  const width = worldWidth(page);
  const summary = page.locator("#session-summary-card");
  await expect(summary).not.toBeVisible();

  for (let i = 0; i < doorLevels.length; i++) {
    await solveLevel(page, width, i);
    await walkTo(page, 0.98 * width);
    await page.waitForTimeout(500);
  }

  await expect(summary).toBeVisible();
  const hanziList = doorLevels.map((l) => l.idiom.hanzi).join(" · ");
  await expect(summary.locator("[data-summary-list]")).toHaveText(hanziList);

  await page.click("#play-again-btn");
  await expect(summary).not.toBeVisible();
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
});

test("on-screen touch controls (move + jump + grab) can solve a level", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/idiom-door.html");
  const width = worldWidth(page);
  const tiles = doorLevels[0].tiles
    .filter((t) => t.correctIndex !== undefined)
    .sort((a, b) => a.correctIndex! - b.correctIndex!);

  for (const tile of tiles) {
    const targetX = tile.xFrac * width;
    const rightward = targetX >= (await getPlayerX(page));
    const btn = page.locator(rightward ? "#move-right-btn" : "#move-left-btn");
    await walkUsing(page, targetX, () => btn.dispatchEvent("pointerdown"), () => btn.dispatchEvent("pointerup"), rightward);
    await page.waitForTimeout(150);

    if (tile.surface !== "ground") {
      await page.locator("#jump-btn").dispatchEvent("pointerdown");
      await page.waitForTimeout(900);
    }
    await page.locator("#grab-btn").dispatchEvent("pointerdown");
    await page.waitForTimeout(200);
  }

  expect((await status(page)).complete).toBe("true");
});
