import { test, expect } from "@playwright/test";
import { completeOneIdiom } from "./helpers/session";

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
