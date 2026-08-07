import { test, expect } from "@playwright/test";

const REGION_CENTER = { xFrac: 0.5, yFrac: 0.42 };

async function tapRegion(page: import("@playwright/test").Page, jitter = 0.06) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport not set");
  const x = (REGION_CENTER.xFrac + (Math.random() - 0.5) * jitter) * viewport.width;
  const y = (REGION_CENTER.yFrac + (Math.random() - 0.5) * jitter) * viewport.height;
  await page.mouse.click(x, y);
  // A real fingertip can't physically tap faster than this anyway; without
  // some gap, Playwright can fire clicks faster than a browser frame tick
  // under this sandbox's software-rendered Chromium, which is a test
  // artifact (event coalescing under main-thread load), not a real product
  // constraint worth chasing. 120ms gives headroom even when the full
  // suite runs in parallel and the sandbox is under heavier contention.
  await page.waitForTimeout(120);
}

test("tapping the region progressively reveals all 4 characters, then completes", async ({ page }) => {
  await page.goto("/idiom-reveal.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();

  const status = page.locator("#reveal-status");
  await expect(status).toHaveAttribute("data-revealed-count", "0");
  await expect(status).toHaveAttribute("data-complete", "false");

  // Default is 2 taps per character, 4 characters -> 8 taps to complete.
  for (let i = 0; i < 8; i++) {
    await tapRegion(page);
  }

  await expect(status).toHaveAttribute("data-revealed-count", "4");
  await expect(status).toHaveAttribute("data-complete", "true");
  await expect(status).toHaveText("All characters revealed!");
});

test("reveal count increases roughly every two taps, not all at once", async ({ page }) => {
  await page.goto("/idiom-reveal.html");
  const status = page.locator("#reveal-status");

  await tapRegion(page);
  await expect(status).toHaveAttribute("data-revealed-count", "0");

  await tapRegion(page);
  await expect(status).toHaveAttribute("data-revealed-count", "1");
});

test("has no fail state: continued tapping after completion stays complete", async ({ page }) => {
  await page.goto("/idiom-reveal.html");
  const status = page.locator("#reveal-status");

  for (let i = 0; i < 8; i++) {
    await tapRegion(page);
  }
  await expect(status).toHaveAttribute("data-complete", "true");

  // A few more taps shouldn't throw, error, or change the completed state.
  for (let i = 0; i < 3; i++) {
    await tapRegion(page);
  }
  await expect(status).toHaveAttribute("data-complete", "true");
  await expect(status).toHaveAttribute("data-revealed-count", "4");
});

test("'Try another idiom' resets progress to zero", async ({ page }) => {
  await page.goto("/idiom-reveal.html");
  const status = page.locator("#reveal-status");

  await tapRegion(page);
  await tapRegion(page);
  await expect(status).toHaveAttribute("data-revealed-count", "1");

  await page.click("#next-idiom-btn");
  await expect(status).toHaveAttribute("data-revealed-count", "0");
  await expect(status).toHaveAttribute("data-complete", "false");
});
