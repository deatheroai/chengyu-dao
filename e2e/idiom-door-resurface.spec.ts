import { test, expect } from "@playwright/test";

// Each Playwright test gets its own isolated browser context by default,
// so localStorage (and therefore session history) starts empty per test
// without any explicit clearing. Ported from the retired session.html
// prototype's session-resurface.spec.ts — see idiom-door.spec.ts's
// "solving all 3 levels..." test for the real (non-dev-control) path,
// which reuses that test's already-paid-for full completion rather than
// repeating it here.

test("a first-ever visit shows no resurface callback", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#resurface-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
});

test("the dev 'simulate returning visitor' control shows a resurface callback on reload", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#dev-seed-history-btn");

  const resurfaceCard = page.locator("#resurface-card");
  await expect(resurfaceCard).toHaveClass(/visible/);
  await expect(page.locator("#level-intro-card")).not.toHaveClass(/visible/);

  // No quiz here - a low-stakes reminder only, per SNIPPET_PLANS.md.
  await expect(page.locator("[data-resurface-hanzi]")).not.toBeEmpty();
  await expect(page.locator("[data-resurface-meaning]")).not.toBeEmpty();
});

test("continuing from the resurface callback starts the first idiom's own intro", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#dev-seed-history-btn");
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);

  await page.click("#resurface-continue-btn");

  await expect(page.locator("#resurface-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
});

test("the dev 'clear history' control resets back to a fresh, no-callback state", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#dev-seed-history-btn");
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);

  await page.click("#dev-clear-history-btn");

  await expect(page.locator("#resurface-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
});
