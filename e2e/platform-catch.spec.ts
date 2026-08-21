import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 2 spike (CATCH_MECHANIC_PLAN.md) — movement + jump replaces
 * Phase 0's drag-a-basket. Catching is a deliberate GRAB action near an
 * item (2026-08-22 revision, after your "accidentally bump into a lot
 * of things" feedback on the first cut) rather than automatic on
 * contact, and the world is wider than the viewport with the camera
 * scrolling to follow the character (addressing "too crowded").
 *
 * A few things found building this coverage, none a product bug:
 * 1. Playwright's `keyboard.press()` fires keydown+keyup in the same
 *    tick with no animation frame in between, so Phaser's `JustDown()`
 *    (which jumping/grabbing rely on) never sees it — same "can't tap
 *    faster than a real frame" class of timing as the tap tests
 *    elsewhere in this suite. Jumps and grabs here always go through
 *    `holdKey`, which leaves a real gap between down and up.
 * 2. Item positions are fractions of the *world* width (viewport width
 *    × WORLD_WIDTH_MULTIPLIER, mirroring PlatformCatchScene), not the
 *    viewport itself, now that the camera scrolls.
 * 3. Predicting a walk's landing position from nominal timing math
 *    compounds error across legs (each leg's own margin shifts where it
 *    actually lands). `walkTo` polls the real position instead, via the
 *    `#player-position` test hook (continuous movement has no discrete
 *    state to poll otherwise) and stops the instant the target is
 *    reached.
 */
const WORLD_WIDTH_MULTIPLIER = 2;
// Mirrors placedItems.ts's xFrac layout.
const XFRAC = { phone: 0.2, book: 0.32, tv: 0.42, pencil: 0.5, clock: 0.78, star: 0.93 };

function worldWidth(page: Page): number {
  const vp = page.viewportSize();
  if (!vp) throw new Error("viewport not set");
  return vp.width * WORLD_WIDTH_MULTIPLIER;
}

async function getPlayerX(page: Page): Promise<number> {
  const attr = await page.locator("#player-position").getAttribute("data-x");
  return Number(attr ?? "0");
}

async function walkTo(page: Page, targetX: number, maxMs = 10000): Promise<void> {
  const key = targetX >= (await getPlayerX(page)) ? "ArrowRight" : "ArrowLeft";
  await page.keyboard.down(key);
  const deadline = Date.now() + maxMs;
  const reached = (x: number) => (key === "ArrowRight" ? x >= targetX : x <= targetX);
  while (Date.now() < deadline) {
    await page.waitForTimeout(80);
    if (reached(await getPlayerX(page))) break;
  }
  await page.keyboard.up(key);
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
  return page.locator("#catch-status").evaluate((el) => ({
    revealedCount: el.getAttribute("data-revealed-count"),
    complete: el.getAttribute("data-complete"),
    justCaught: el.getAttribute("data-just-caught"),
  }));
}

test("loads with nothing caught yet — no premature catch from the starting position", async ({ page }) => {
  await page.goto("/platform-catch.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();
  const s = await status(page);
  expect(s).toEqual({ revealedCount: "0", complete: "false", justCaught: null });
});

test("walking past several items without grabbing catches nothing", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = worldWidth(page);
  // Sweeps straight past "phone", "book", and "tv" without ever pressing
  // GRAB — the exact scenario you described as "accidentally bumping
  // into things." Nothing should register.
  await walkTo(page, (XFRAC.pencil - 0.02) * width);
  await page.waitForTimeout(200);
  const s = await status(page);
  expect(s).toEqual({ revealedCount: "0", complete: "false", justCaught: null });
});

test("grabbing near a correct item catches it; grabbing near a decoy doesn't advance progress", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = worldWidth(page);

  await walkTo(page, XFRAC.book * width);
  await page.waitForTimeout(150);
  await grab(page);
  await page.waitForTimeout(200);
  const afterBook = await status(page);
  expect(afterBook.justCaught).toBe("correct");
  expect(afterBook.revealedCount).toBe("1");

  await walkTo(page, XFRAC.phone * width);
  await page.waitForTimeout(150);
  await grab(page);
  await page.waitForTimeout(200);
  const afterPhone = await status(page);
  expect(afterPhone.justCaught).toBe("decoy");
  expect(afterPhone.revealedCount).toBe("1"); // unchanged
});

test("grabbing does nothing when no item is in reach", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = worldWidth(page);
  // Between the spawn point and "phone" — comfortably clear of every
  // item's catch radius in either direction (unlike the gaps between
  // adjacent items, which are sized for visual breathing room, not
  // guaranteed clearance from a fixed reach radius).
  await walkTo(page, 0.1 * width);
  await page.waitForTimeout(150);
  await grab(page);
  await page.waitForTimeout(200);
  const s = await status(page);
  expect(s).toEqual({ revealedCount: "0", complete: "false", justCaught: null });
});

test("jumping onto a platform reaches an elevated item that walking underneath doesn't", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = worldWidth(page);
  await walkTo(page, XFRAC.pencil * width);
  await page.waitForTimeout(150);

  // Grabbing from the ground, underneath the platform, should reach
  // nothing — "pencil" sits well above CATCH_RADIUS_Y from here.
  await grab(page);
  await page.waitForTimeout(200);
  const beforeJump = await status(page);
  expect(beforeJump.revealedCount).toBe("0");

  await holdKey(page, "Space", 60);
  await page.waitForTimeout(900); // land on the platform
  await grab(page);
  await page.waitForTimeout(200);
  const afterJump = await status(page);
  expect(Number(afterJump.revealedCount)).toBeGreaterThan(Number(beforeJump.revealedCount));
});

test("catching all four completes with the idiom card, and Play again resets", async ({ page }) => {
  test.setTimeout(30000);
  await page.goto("/platform-catch.html");
  const width = worldWidth(page);
  const card = page.locator("#catch-complete-card");
  await expect(card).not.toBeVisible();

  await walkTo(page, XFRAC.book * width);
  await page.waitForTimeout(150);
  await grab(page);
  await page.waitForTimeout(200);

  await walkTo(page, XFRAC.pencil * width);
  await page.waitForTimeout(150);
  await holdKey(page, "Space", 60);
  await page.waitForTimeout(900);
  await grab(page);
  await page.waitForTimeout(200);

  await walkTo(page, XFRAC.clock * width);
  await page.waitForTimeout(150);
  await holdKey(page, "Space", 60);
  await page.waitForTimeout(900);
  await grab(page);
  await page.waitForTimeout(200);

  await walkTo(page, XFRAC.star * width);
  await page.waitForTimeout(150);
  await grab(page);
  await page.waitForTimeout(200);

  const s = await status(page);
  expect(s.complete).toBe("true");
  await expect(card).toBeVisible();
  await expect(card.locator("[data-hanzi]")).toHaveText("一心一意");

  await page.click("#play-again-btn");
  await expect(card).not.toBeVisible();
  const reset = await status(page);
  expect(reset.revealedCount).toBe("0");
  expect(reset.complete).toBe("false");
});

test("on-screen touch controls (move + grab) work the same as the keyboard", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = worldWidth(page);
  const rightBtn = page.locator("#move-right-btn");
  const targetX = XFRAC.book * width;

  await rightBtn.dispatchEvent("pointerdown");
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(80);
    if ((await getPlayerX(page)) >= targetX) break;
  }
  await rightBtn.dispatchEvent("pointerup");
  await page.waitForTimeout(150);

  await page.locator("#grab-btn").dispatchEvent("pointerdown");
  await page.waitForTimeout(200);

  const s = await status(page);
  expect(s.justCaught).toBe("correct");
});
