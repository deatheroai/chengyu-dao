import { expect, type Page } from "@playwright/test";

export async function tapRevealRegion(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport not set");
  const x = viewport.width * 0.5 + (Math.random() - 0.5) * 0.06 * viewport.width;
  const y = viewport.height * 0.42 + (Math.random() - 0.5) * 0.06 * viewport.height;
  await page.mouse.click(x, y);
  // A real fingertip can't physically tap faster than this anyway; see
  // idiom-reveal.spec.ts's tapRegion for the full reasoning.
  await page.waitForTimeout(120);
}

/** Taps through the reveal phase to completion, clicks Continue, then
 * picks the correct meaning-check option and clicks Next/summary. */
export async function completeOneIdiom(page: Page) {
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
