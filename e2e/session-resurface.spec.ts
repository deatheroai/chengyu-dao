import { test, expect } from "@playwright/test";
import { completeOneIdiom } from "./helpers/session";

// Each Playwright test gets its own isolated browser context by default,
// so localStorage (and therefore session history) starts empty per test
// without any explicit clearing.

test("a first-ever visit shows no resurface callback", async ({ page }) => {
  await page.goto("/session.html");
  await expect(page.locator("#resurface-phase")).toHaveClass(/hidden/);
  await expect(page.locator("#reveal-phase")).not.toHaveClass(/hidden/);
});

test("the dev 'simulate returning visitor' control shows a resurface callback on reload", async ({ page }) => {
  await page.goto("/session.html");
  await page.click("#dev-seed-history-btn");

  const resurfacePhase = page.locator("#resurface-phase");
  await expect(resurfacePhase).not.toHaveClass(/hidden/);
  await expect(page.locator("#reveal-phase")).toHaveClass(/hidden/);

  // No quiz here - a low-stakes reminder only, per SNIPPET_PLANS.md.
  await expect(page.locator("#resurface-hanzi")).not.toBeEmpty();
  await expect(page.locator("#resurface-pinyin")).not.toBeEmpty();
  await expect(page.locator("#resurface-meaning")).not.toBeEmpty();
});

test("continuing from the resurface callback starts a normal session, without repeating that idiom", async ({ page }) => {
  await page.goto("/session.html");
  await page.click("#dev-seed-history-btn");

  const resurfacePhase = page.locator("#resurface-phase");
  // Wait for the reload to actually land before reading its attribute -
  // getAttribute() doesn't auto-retry the way expect() does, so reading
  // it too early could still see the pre-reload document.
  await expect(resurfacePhase).not.toHaveClass(/hidden/);
  const resurfacedId = await resurfacePhase.getAttribute("data-idiom-id");
  expect(resurfacedId).toBeTruthy();

  await page.click("#resurface-continue-btn");

  await expect(page.locator("#resurface-phase")).toHaveClass(/hidden/);
  await expect(page.locator("#reveal-phase")).not.toHaveClass(/hidden/);

  const progress = page.locator("#session-progress");
  await expect(progress).toHaveAttribute("data-phase", "reveal");
  await expect(progress).toHaveAttribute("data-index", "0");
  // The idiom just shown in the callback shouldn't immediately reappear
  // as the first "new" idiom of this same sitting.
  const firstIdiomId = await progress.getAttribute("data-idiom-id");
  expect(firstIdiomId).not.toBe(resurfacedId);
});

test("the dev 'clear history' control resets back to a fresh, no-callback state", async ({ page }) => {
  await page.goto("/session.html");
  await page.click("#dev-seed-history-btn");
  await expect(page.locator("#resurface-phase")).not.toHaveClass(/hidden/);

  await page.click("#dev-clear-history-btn");

  await expect(page.locator("#resurface-phase")).toHaveClass(/hidden/);
  await expect(page.locator("#reveal-phase")).not.toHaveClass(/hidden/);
});

test("finishing a real session is enough on its own to trigger a resurface callback next visit", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/session.html");

  await completeOneIdiom(page);
  await completeOneIdiom(page);
  await completeOneIdiom(page);
  await expect(page.locator("#summary-phase")).not.toHaveClass(/hidden/);

  // A fresh page load now (standing in for "the next time the child
  // opens the game") should resurface one of the idioms just discovered
  // - no dev control needed here, this exercises the real record/read
  // path end to end.
  await page.goto("/session.html");
  const resurfacePhase = page.locator("#resurface-phase");
  await expect(resurfacePhase).not.toHaveClass(/hidden/);
  await expect(page.locator("#resurface-hanzi")).not.toBeEmpty();
});
