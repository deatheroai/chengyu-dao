import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 0 spike (CATCH_MECHANIC_PLAN.md). Unlike idiom-reveal's fixed
 * tap-count E2E tests, catch timing depends on where falling icons
 * happen to be, so these tests drag the basket back and forth across
 * the catch strip and poll for the effect they're after, similar in
 * spirit to idiom-reveal's own "tap and wait a beat" timing allowance —
 * just over a wider, less predictable window since icons drift
 * continuously rather than responding to a direct tap.
 */
async function sweepUntil(page: Page, isDone: () => Promise<boolean>, timeoutMs: number): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport not set");
  const y = viewport.height - 40;
  const steps = 20;
  const deadline = Date.now() + timeoutMs;

  await page.mouse.move(viewport.width * 0.08, y);
  await page.mouse.down();

  let i = 0;
  let dir = 1;
  while (Date.now() < deadline) {
    const frac = 0.08 + (i / steps) * 0.84;
    await page.mouse.move(frac * viewport.width, y);
    await page.waitForTimeout(120);
    if (await isDone()) {
      await page.mouse.up();
      return;
    }
    i += dir;
    if (i >= steps || i <= 0) dir *= -1;
  }
  await page.mouse.up();
  throw new Error("sweepUntil timed out waiting for condition");
}

test("catching a correct icon reveals a character", async ({ page }) => {
  await page.goto("/catch-meaning.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();

  const status = page.locator("#catch-status");
  await expect(status).toHaveAttribute("data-revealed-count", "0");
  await expect(status).toHaveAttribute("data-complete", "false");

  await sweepUntil(page, async () => (await status.getAttribute("data-revealed-count")) !== "0", 20000);
  test.info().annotations.push({ type: "note", description: "at least one correct icon was caught" });
});

test("catching a decoy icon doesn't advance progress", async ({ page }) => {
  await page.goto("/catch-meaning.html");
  const status = page.locator("#catch-status");

  let revealedAtDecoy: string | null = null;
  await sweepUntil(
    page,
    async () => {
      if ((await status.getAttribute("data-just-caught")) === "decoy") {
        revealedAtDecoy = await status.getAttribute("data-revealed-count");
        return true;
      }
      return false;
    },
    20000,
  );

  // The count read the instant a decoy was caught should still read the
  // same value immediately after — this specific catch didn't move it.
  await expect(status).toHaveAttribute("data-revealed-count", revealedAtDecoy!);
});

test("has no fail state: nothing is ever lost, items keep recycling", async ({ page }) => {
  await page.goto("/catch-meaning.html");
  const status = page.locator("#catch-status");

  // Give the scene a few seconds of unattended drifting — items should
  // loop back to the top rather than erroring or vanishing for good.
  await page.waitForTimeout(3000);
  await expect(status).toHaveAttribute("data-complete", "false");
  await expect(page.locator("#game-container canvas")).toBeVisible();
});

test("catching all four characters shows the completion card, and Play again resets", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/catch-meaning.html");
  const status = page.locator("#catch-status");
  const card = page.locator("#catch-complete-card");
  await expect(card).not.toBeVisible();

  await sweepUntil(page, async () => (await status.getAttribute("data-complete")) === "true", 75000);

  await expect(card).toBeVisible();
  await expect(card.locator("[data-hanzi]")).toHaveText("一心一意");
  await expect(status).toHaveText("You caught its meaning! 🎉");

  await page.click("#play-again-btn");
  await expect(card).not.toBeVisible();
  await expect(status).toHaveAttribute("data-revealed-count", "0");
  await expect(status).toHaveAttribute("data-complete", "false");
});
