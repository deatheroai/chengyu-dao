import { test, expect } from "@playwright/test";

// Mirrors e2e/cloud-save.spec.ts (idiom-door's own suite) — same panel
// shape, same Vite-dev-server-has-no-/api-route reasoning, adapted to
// Science Snake's own high-score/last-run cloud data instead of
// idiom-door's discovered-idiom history. #cloud-save-btn is placed
// alongside #high-score-display specifically so it's reachable
// throughout, including underneath #start-card, which is visible the
// instant the page loads — every test here can open the panel right
// after page.goto with nothing to dismiss first.

test("opening the panel mints and shows an 8-character code, then confirms it saved", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/science-snake.html");

  await page.click("#cloud-save-btn");
  await expect(page.locator("#cloud-save-card")).toHaveClass(/visible/);

  const code = await page.locator("[data-cloud-code]").textContent();
  expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);

  await expect(page.locator("[data-cloud-status]")).toHaveText("Saved to the cloud ✓");
});

test("reopening the panel shows the same code rather than minting a new one", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/science-snake.html");

  await page.click("#cloud-save-btn");
  const firstCode = await page.locator("[data-cloud-code]").textContent();

  await page.click("#cloud-save-dismiss-btn");
  await expect(page.locator("#cloud-save-card")).not.toHaveClass(/visible/);

  await page.click("#cloud-save-btn");
  await expect(page.locator("[data-cloud-code]")).toHaveText(firstCode ?? "");
});

test("the backend not being provisioned yet shows a friendly message, not a raw error", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    await route.fulfill({ status: 501, contentType: "application/json", body: JSON.stringify({ error: "not-configured" }) });
  });
  await page.goto("/science-snake.html");

  await page.click("#cloud-save-btn");
  await expect(page.locator("[data-cloud-status]")).toHaveText(/isn't set up/);
});

test("restoring from a valid code merges that high score in and reloads", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            highScore: { applesEaten: 5, questionsCorrect: 2, score: 85, achievedAt: 1000 },
            lastRun: { applesEaten: 5, questionsCorrect: 2, score: 85, achievedAt: 1000 },
          },
        }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
  await page.goto("/science-snake.html");
  // A fresh visit has no high score yet — confirms the header below is
  // actually caused by the restore, not already there.
  await expect(page.locator("#high-score-display")).toBeEmpty();

  await page.click("#cloud-save-btn");
  await page.fill("#cloud-restore-input", "234567AB");
  await page.click("#cloud-restore-btn");

  // handleRestoreFromCode reloads the page on success (cloudSaveStatus.ts).
  await page.waitForURL("**/science-snake.html");
  await expect(page.locator("#high-score-display")).toHaveText("🏆 High score: 85");
});

test("restoring from a code nothing was ever saved under shows a not-found message", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not-found" }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
  await page.goto("/science-snake.html");

  await page.click("#cloud-save-btn");
  await page.fill("#cloud-restore-input", "234567AB");
  await page.click("#cloud-restore-btn");

  await expect(page.locator("[data-cloud-status]")).toHaveText(/No save found/);
  // No reload on failure — the panel and its code are still right there.
  await expect(page.locator("#cloud-save-card")).toHaveClass(/visible/);
});

test("restoring rejects an obviously malformed code without any network call", async ({ page }) => {
  let getCalled = false;
  await page.route("**/api/cloud-save**", async (route) => {
    if (route.request().method() === "GET") getCalled = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/science-snake.html");

  await page.click("#cloud-save-btn");
  await page.fill("#cloud-restore-input", "nope");
  await page.click("#cloud-restore-btn");

  await expect(page.locator("[data-cloud-status]")).toHaveText(/doesn't look like a save code/);
  expect(getCalled).toBe(false);
});
