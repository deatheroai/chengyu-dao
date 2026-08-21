import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 2 spike (CATCH_MECHANIC_PLAN.md) — movement + jump replaces
 * Phase 0's drag-a-basket. Unlike that timing-dependent drift/sweep,
 * this mechanic is driven entirely by the child's own movement, so
 * catches happen at points the test can walk to on purpose.
 *
 * Two real things found building this coverage, neither a product bug:
 * 1. Playwright's `keyboard.press()` fires keydown+keyup in the same
 *    tick with no animation frame in between, so Phaser's `JustDown()`
 *    (which jumping relies on) never sees it — same "can't tap faster
 *    than a real frame" class of timing as the tap tests elsewhere in
 *    this suite. Jumps here always go through `holdKey`, which leaves a
 *    real gap between down and up, matching an actual press.
 * 2. A first attempt computed hold durations from nominal target
 *    fractions chained leg-to-leg (walk-to-pencil, then pencil-to-clock,
 *    etc.) — but each leg's own timing margin shifts where it actually
 *    lands, and that error compounds across legs until a later target is
 *    over/undershot. `walkTo` below polls the real position (via a
 *    dedicated `#player-position` test hook — Phase 2's movement is
 *    continuous, unlike every earlier snippet's discrete tap/click
 *    steps, so there's no revealed-count-style state to poll instead)
 *    and stops the instant the target is reached, so nothing compounds
 *    and nothing depends on assuming a particular frame rate.
 */
async function getPlayerX(page: Page): Promise<number> {
  const attr = await page.locator("#player-position").getAttribute("data-x");
  return Number(attr ?? "0");
}

async function walkTo(page: Page, targetX: number, maxMs = 8000): Promise<void> {
  await page.keyboard.down("ArrowRight");
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(80);
    if ((await getPlayerX(page)) >= targetX) break;
  }
  await page.keyboard.up("ArrowRight");
}

async function holdKey(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

function viewportWidth(page: Page): number {
  const vp = page.viewportSize();
  if (!vp) throw new Error("viewport not set");
  return vp.width;
}

async function status(page: Page) {
  return page.locator("#catch-status").evaluate((el) => ({
    revealedCount: el.getAttribute("data-revealed-count"),
    complete: el.getAttribute("data-complete"),
    justCaught: el.getAttribute("data-just-caught"),
  }));
}

// Mirrors placedItems.ts's xFrac layout.
const XFRAC = { phone: 0.2, book: 0.32, pencil: 0.5, clock: 0.78, star: 0.93 };

test("loads with nothing caught yet — no premature catch from the starting position", async ({ page }) => {
  await page.goto("/platform-catch.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();
  const s = await status(page);
  expect(s).toEqual({ revealedCount: "0", complete: "false", justCaught: null });
});

test("walking right catches ground-level items without jumping", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = viewportWidth(page);
  await walkTo(page, (XFRAC.book + 0.03) * width);
  await page.waitForTimeout(200);
  const s = await status(page);
  expect(Number(s.revealedCount)).toBeGreaterThan(0);
});

test("catching a decoy doesn't advance revealed count", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = viewportWidth(page);
  // "phone" (decoy) is the first ground item reachable from spawn.
  await walkTo(page, (XFRAC.phone + 0.02) * width);
  await page.waitForTimeout(200);
  const s = await status(page);
  expect(s.justCaught).toBe("decoy");
  expect(s.revealedCount).toBe("0");
});

test("jumping onto a platform reaches an elevated item that walking underneath doesn't", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = viewportWidth(page);
  await walkTo(page, XFRAC.pencil * width);
  await page.waitForTimeout(150);
  const beforeJump = await status(page);

  await holdKey(page, "Space", 60);
  await page.waitForTimeout(900);
  const afterJump = await status(page);

  expect(Number(afterJump.revealedCount)).toBeGreaterThan(Number(beforeJump.revealedCount));
});

test("catching all four completes with the idiom card, and Play again resets", async ({ page }) => {
  test.setTimeout(30000);
  await page.goto("/platform-catch.html");
  const width = viewportWidth(page);
  const card = page.locator("#catch-complete-card");
  await expect(card).not.toBeVisible();

  // Ground -> jump onto platform A ("pencil") -> jump onto platform B
  // ("clock") -> ground to "star". Fixed, deterministic positions, not
  // a timing race like Phase 0's falling items.
  await walkTo(page, XFRAC.pencil * width);
  await page.waitForTimeout(150);
  await holdKey(page, "Space", 60);
  await page.waitForTimeout(900);

  await walkTo(page, XFRAC.clock * width);
  await page.waitForTimeout(150);
  await holdKey(page, "Space", 60);
  await page.waitForTimeout(900);

  await walkTo(page, (XFRAC.star + 0.03) * width);
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

test("on-screen touch controls move and jump the character, same as the keyboard", async ({ page }) => {
  await page.goto("/platform-catch.html");
  const width = viewportWidth(page);
  const rightBtn = page.locator("#move-right-btn");
  const targetX = (XFRAC.phone + 0.02) * width;

  await rightBtn.dispatchEvent("pointerdown");
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(80);
    if ((await getPlayerX(page)) >= targetX) break;
  }
  await rightBtn.dispatchEvent("pointerup");
  await page.waitForTimeout(200);

  const s = await status(page);
  // Should have made real progress toward/through the first ground item
  // without ever touching a keyboard key.
  expect(s.justCaught).not.toBeNull();
});
