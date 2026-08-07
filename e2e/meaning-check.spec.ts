import { test, expect } from "@playwright/test";

test("renders an idiom, meaning, and 3 options", async ({ page }) => {
  await page.goto("/meaning-check.html");

  await expect(page.locator("#idiom-hanzi")).not.toBeEmpty();
  await expect(page.locator("#idiom-pinyin")).not.toBeEmpty();
  await expect(page.locator("#idiom-meaning")).not.toBeEmpty();
  await expect(page.locator(".option")).toHaveCount(3);
  await expect(page.locator("#explanation")).toBeHidden();
  await expect(page.locator("#next-btn")).toBeHidden();
});

test("picking the correct option on the first try shows the explanation and next button", async ({ page }) => {
  await page.goto("/meaning-check.html");

  await page.locator('.option[data-correct="true"]').click();

  const status = page.locator("#check-status");
  await expect(status).toHaveAttribute("data-status", "correct");
  await expect(status).toHaveAttribute("data-attempts", "1");
  await expect(status).toHaveText("That's it! 🎉");

  await expect(page.locator('.option[data-state="correct"]')).toHaveCount(1);
  await expect(page.locator("#explanation")).toBeVisible();
  await expect(page.locator("#next-btn")).toBeVisible();

  // Locked in: further clicks on other options shouldn't be possible.
  const options = page.locator(".option");
  for (let i = 0; i < (await options.count()); i++) {
    await expect(options.nth(i)).toBeDisabled();
  }
});

test("a wrong pick invites another try instead of locking or punishing", async ({ page }) => {
  await page.goto("/meaning-check.html");

  const wrongOption = page.locator('.option[data-correct="false"]').first();
  await wrongOption.click();

  const status = page.locator("#check-status");
  await expect(status).toHaveAttribute("data-status", "wrong-try-again");
  await expect(status).toHaveAttribute("data-attempts", "1");
  await expect(status).toHaveText("Hmm, let's look again!");

  // Not locked in yet: no explanation/next button, options still enabled.
  await expect(page.locator("#explanation")).toBeHidden();
  await expect(page.locator("#next-btn")).toBeHidden();
  await expect(wrongOption).toBeEnabled();
  await expect(wrongOption).toHaveAttribute("data-state", "wrong");

  // The correct option is still clickable and resolves the round.
  await page.locator('.option[data-correct="true"]').click();
  await expect(status).toHaveAttribute("data-status", "correct");
  await expect(status).toHaveAttribute("data-attempts", "2");
  await expect(page.locator("#next-btn")).toBeVisible();
});

test("after two wrong picks, the answer is revealed rather than left unresolved", async ({ page }) => {
  await page.goto("/meaning-check.html");

  const wrongOptions = page.locator('.option[data-correct="false"]');
  await wrongOptions.nth(0).click();
  await wrongOptions.nth(1).click();

  const status = page.locator("#check-status");
  await expect(status).toHaveAttribute("data-status", "revealed");
  await expect(status).toHaveAttribute("data-attempts", "2");
  await expect(status).toHaveText("Here's the one that fits:");

  // The correct answer is now visibly marked, explanation shown, and
  // both wrong attempts remain visible as "wrong" (not hidden away).
  await expect(page.locator('.option[data-state="correct"]')).toHaveCount(1);
  await expect(page.locator('.option[data-state="wrong"]')).toHaveCount(2);
  await expect(page.locator("#explanation")).toBeVisible();
  await expect(page.locator("#next-btn")).toBeVisible();
});

test("'Next idiom' starts a fresh round", async ({ page }) => {
  await page.goto("/meaning-check.html");

  await page.locator('.option[data-correct="true"]').click();
  await expect(page.locator("#next-btn")).toBeVisible();

  const firstHanzi = await page.locator("#idiom-hanzi").textContent();
  await page.click("#next-btn");

  const status = page.locator("#check-status");
  await expect(status).toHaveAttribute("data-status", "choosing");
  await expect(status).toHaveAttribute("data-attempts", "0");
  await expect(page.locator("#explanation")).toBeHidden();
  await expect(page.locator("#next-btn")).toBeHidden();
  await expect(page.locator(".option")).toHaveCount(3);
  for (const btn of await page.locator(".option").all()) {
    await expect(btn).toBeEnabled();
  }

  // Not a strict requirement (there are only 15 idioms and picking is
  // random), but the prompt should always match whatever idiom is shown.
  const promptIdiom = await page.locator("#prompt-idiom").textContent();
  const hanzi = await page.locator("#idiom-hanzi").textContent();
  expect(promptIdiom).toBe(hanzi);
  expect(typeof firstHanzi).toBe("string");
});
