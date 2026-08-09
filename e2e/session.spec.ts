import { test, expect, type Page } from "@playwright/test";

async function tapRevealRegion(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport not set");
  const x = viewport.width * 0.5 + (Math.random() - 0.5) * 0.06 * viewport.width;
  const y = viewport.height * 0.42 + (Math.random() - 0.5) * 0.06 * viewport.height;
  await page.mouse.click(x, y);
  // Same real-tap-cadence reasoning as idiom-reveal.spec.ts's tapRegion.
  await page.waitForTimeout(120);
}

/** Taps through the reveal phase to completion, clicks Continue, then
 * picks the correct meaning-check option and clicks Next/summary. */
async function completeOneIdiom(page: Page) {
  const revealStatus = page.locator("#reveal-status");
  await expect(revealStatus).toHaveAttribute("data-complete", "false");

  // Default is 2 taps per character, 4 characters -> 8 taps to complete.
  for (let i = 0; i < 8; i++) {
    await tapRevealRegion(page);
  }
  await expect(revealStatus).toHaveAttribute("data-complete", "true");

  const continueBtn = page.locator("#continue-btn");
  await expect(continueBtn).toBeVisible();
  await continueBtn.click();

  await expect(page.locator("#meaning-check-phase")).not.toHaveClass(/hidden/);
  await expect(page.locator("#reveal-phase")).toHaveClass(/hidden/);

  const correctOption = page.locator('.option[data-correct="true"]');
  await correctOption.click();
  await expect(page.locator("#check-status")).toHaveAttribute("data-status", "correct");

  await page.locator("#next-btn").click();

  // A real child's finger needs to travel from this button back up to
  // the lantern before their first tap there can even land - comfortably
  // longer than the one frame Phaser's async scene swap needs to finish
  // creating the next idiom's zone. Without this, a synthetic click
  // immediately followed by synthetic taps can outrun that swap in a way
  // no real tap cadence would, and lose a tap to the gap where neither
  // the outgoing nor the incoming zone is listening yet.
  await page.waitForTimeout(350);
}

test("session progress starts at idiom 1 of 3 in the reveal phase", async ({ page }) => {
  await page.goto("/session.html");
  const progress = page.locator("#session-progress");
  await expect(progress).toHaveAttribute("data-phase", "reveal");
  await expect(progress).toHaveAttribute("data-index", "0");
  await expect(progress).toHaveAttribute("data-discovered-count", "0");
  await expect(progress).toHaveText("Idiom 1 of 3");

  await expect(page.locator("#reveal-phase")).not.toHaveClass(/hidden/);
  await expect(page.locator("#meaning-check-phase")).toHaveClass(/hidden/);
  await expect(page.locator("#summary-phase")).toHaveClass(/hidden/);
});

test("completing an idiom's reveal + meaning-check advances to the next idiom", async ({ page }) => {
  await page.goto("/session.html");
  await completeOneIdiom(page);

  const progress = page.locator("#session-progress");
  await expect(progress).toHaveAttribute("data-phase", "reveal");
  await expect(progress).toHaveAttribute("data-index", "1");
  await expect(progress).toHaveAttribute("data-discovered-count", "1");
  await expect(progress).toHaveText("Idiom 2 of 3");
  await expect(page.locator("#reveal-phase")).not.toHaveClass(/hidden/);
  await expect(page.locator("#meaning-check-phase")).toHaveClass(/hidden/);
});

test("finishing all 3 idioms shows a bounded session summary, not a 4th idiom", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/session.html");

  await completeOneIdiom(page);
  await completeOneIdiom(page);
  await completeOneIdiom(page);

  await expect(page.locator("#summary-phase")).not.toHaveClass(/hidden/);
  await expect(page.locator("#reveal-phase")).toHaveClass(/hidden/);
  await expect(page.locator("#meaning-check-phase")).toHaveClass(/hidden/);

  // The progress chip is a "next idiom" counter - once the session is
  // over there's nothing left to count toward, so it hides rather than
  // showing a stale "Idiom 3 of 3".
  await expect(page.locator("#session-progress")).toHaveClass(/hidden/);

  const summaryItems = page.locator(".summary-idiom");
  await expect(summaryItems).toHaveCount(3);

  // No duplicate idioms, and no path back into a reveal/meaning-check
  // phase from here - the session is genuinely bounded at 3.
  const ids = await summaryItems.evaluateAll((els) => els.map((el) => el.getAttribute("data-idiom-id")));
  expect(new Set(ids).size).toBe(3);

  await expect(page.locator(".summary-message")).toHaveText("Come back tomorrow for more!");
});
