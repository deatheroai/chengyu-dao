import { test, expect } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";

// #cloud-save-btn is placed alongside #session-progress specifically so
// it's reachable throughout the session, including underneath the
// level-intro-card overlay that's visible the instant the page loads
// (same "stacks above the full-screen overlays" pattern that badge
// already relies on — see idiom-door.html's comment on it) — so every
// test here can open the panel right after page.goto with nothing to
// dismiss first.
//
// The Vite dev server this suite runs against has no /api/cloud-save
// route at all (that's Vercel-only, at deploy time), so every test
// mocks it via page.route rather than depending on real network
// behavior for a route that doesn't exist in this environment.

test("opening the panel mints and shows an 8-character code, then confirms it saved", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/idiom-door.html");

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
  await page.goto("/idiom-door.html");

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
  await page.goto("/idiom-door.html");

  await page.click("#cloud-save-btn");
  await expect(page.locator("[data-cloud-status]")).toHaveText(/isn't set up/);
});

test("restoring from a valid code merges that idiom's history in and reloads", async ({ page }) => {
  const seededIdiomId = doorLevels[0].idiom.id;
  await page.route("**/api/cloud-save**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { completedSessions: [{ idiomIds: [seededIdiomId], completedAt: 1000 }] },
        }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
  await page.goto("/idiom-door.html");
  // A fresh visit has no history yet — confirms the resurface callback
  // below is actually caused by the restore, not already there.
  await expect(page.locator("#resurface-card")).not.toHaveClass(/visible/);

  await page.click("#cloud-save-btn");
  await page.fill("#cloud-restore-input", "234567AB");
  await page.click("#cloud-restore-btn");

  // handleRestoreFromCode reloads the page on success (cloudSaveStatus.ts).
  await page.waitForURL("**/idiom-door.html");
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);
  await expect(page.locator("[data-resurface-hanzi]")).not.toBeEmpty();
});

test("restoring from a code nothing was ever saved under shows a not-found message", async ({ page }) => {
  await page.route("**/api/cloud-save**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not-found" }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
  await page.goto("/idiom-door.html");

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
  await page.goto("/idiom-door.html");

  await page.click("#cloud-save-btn");
  await page.fill("#cloud-restore-input", "nope");
  await page.click("#cloud-restore-btn");

  await expect(page.locator("[data-cloud-status]")).toHaveText(/doesn't look like a save code/);
  expect(getCalled).toBe(false);
});
