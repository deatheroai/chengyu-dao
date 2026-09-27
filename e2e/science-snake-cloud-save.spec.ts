import { test, expect, type Page } from "@playwright/test";

// Science Snake's cloud save panel (cloudSaveStatus.ts / scoreCloudSync.ts).
// Same approach as e2e/cloud-save.spec.ts: the Vite dev server has no
// /api/cloud-save route (it's Vercel-only), so every test stands one in
// via page.route — here an in-memory store keyed by game + code, the
// same way api/cloud-save.ts keys Redis, so the tests also check that
// Science Snake only ever reads and writes its own namespace.

const CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;

interface FakeServer {
  store: Map<string, unknown>;
  posts: { code: string; game?: string; data: unknown }[];
  gets: number;
}

async function fakeCloudServer(page: Page, initial: Record<string, unknown> = {}, status?: number): Promise<FakeServer> {
  const server: FakeServer = { store: new Map(Object.entries(initial)), posts: [], gets: 0 };
  await page.route("**/api/cloud-save**", async (route) => {
    const request = route.request();
    if (status) {
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: "not-configured" }) });
      return;
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON() as { code: string; game?: string; data: unknown };
      server.posts.push(body);
      server.store.set(`${body.game ?? "idiom-door"}:${body.code}`, body.data);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    server.gets++;
    const params = new URL(request.url()).searchParams;
    const key = `${params.get("game") ?? "idiom-door"}:${params.get("code")}`;
    if (!server.store.has(key)) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not-found" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: server.store.get(key) }) });
  });
  return server;
}

async function openPanelFromStartCard(page: Page): Promise<void> {
  await page.goto("/science-snake.html");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
  await page.locator("#start-card .cloud-save-open-btn").click();
  await expect(page.locator("#cloud-save-card")).toHaveClass(/visible/);
}

test("opening the panel shows an 8-character code and saves under Science Snake's own namespace", async ({ page }) => {
  const server = await fakeCloudServer(page);
  await openPanelFromStartCard(page);

  const code = await page.locator("[data-cloud-code]").textContent();
  expect(code).toMatch(CODE_PATTERN);
  await expect(page.locator("[data-cloud-status]")).toHaveText("Saved to the cloud ✓");
  expect(server.posts).toEqual([{ code, game: "science-snake", data: { highScore: null, lastRun: null } }]);
});

test("closing the panel returns to the start card, and reopening shows the same code", async ({ page }) => {
  await fakeCloudServer(page);
  await openPanelFromStartCard(page);
  const firstCode = await page.locator("[data-cloud-code]").textContent();

  await page.click("#cloud-save-dismiss-btn");
  await expect(page.locator("#cloud-save-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#start-card")).toHaveClass(/visible/);

  await page.locator("#start-card .cloud-save-open-btn").click();
  await expect(page.locator("[data-cloud-code]")).toHaveText(firstCode ?? "");
});

test("restoring from another device's code brings its high score in, without touching an idiom-door save", async ({ page }) => {
  const record = { applesEaten: 12, questionsCorrect: 3, score: 150, achievedAt: 1000 };
  const idiomSave = { completedSessions: [{ idiomIds: ["x"], completedAt: 1 }] };
  const server = await fakeCloudServer(page, {
    "science-snake:234567AB": { highScore: record, lastRun: record },
    "idiom-door:234567AB": idiomSave,
  });
  await openPanelFromStartCard(page);
  await expect(page.locator("#high-score-display")).toHaveText("");

  await page.fill("#cloud-restore-input", "234567ab");
  await page.click("#cloud-restore-btn");

  await expect(page.locator("[data-cloud-status]")).toHaveText("Scores restored ✓");
  await expect(page.locator("[data-cloud-code]")).toHaveText("234567AB");
  await expect(page.locator("#high-score-display")).toHaveText("🏆 High score: 150");
  expect(server.store.get("idiom-door:234567AB")).toEqual(idiomSave);

  // Still there after a reload — it was saved locally, not just shown.
  await page.reload();
  await expect(page.locator("#high-score-display")).toHaveText("🏆 High score: 150");
});

test("restoring from a code with no Science Snake save shows a not-found message and keeps this device's code", async ({ page }) => {
  await fakeCloudServer(page, { "idiom-door:234567AB": { completedSessions: [] } });
  await openPanelFromStartCard(page);
  const ownCode = await page.locator("[data-cloud-code]").textContent();

  await page.fill("#cloud-restore-input", "234567AB");
  await page.click("#cloud-restore-btn");

  await expect(page.locator("[data-cloud-status]")).toHaveText(/No Science Snake save found/);
  await expect(page.locator("[data-cloud-code]")).toHaveText(ownCode ?? "");
});

test("restoring rejects an obviously malformed code without any network call", async ({ page }) => {
  const server = await fakeCloudServer(page);
  await openPanelFromStartCard(page);
  await expect(page.locator("[data-cloud-status]")).toHaveText("Saved to the cloud ✓");
  const getsBefore = server.gets;

  await page.fill("#cloud-restore-input", "nope");
  await page.click("#cloud-restore-btn");

  await expect(page.locator("[data-cloud-status]")).toHaveText(/doesn't look like a save code/);
  expect(server.gets).toBe(getsBefore);
});

test("the backend not being provisioned yet shows a friendly message, not a raw error", async ({ page }) => {
  await fakeCloudServer(page, {}, 501);
  await openPanelFromStartCard(page);
  await expect(page.locator("[data-cloud-status]")).toHaveText(/isn't set up/);
});
