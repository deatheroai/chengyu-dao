import { test, expect, type Page } from "@playwright/test";
import { getStory } from "../src/reading/stories";
import { storyStrokeData } from "../src/reading/storyStrokeData";

const story = getStory();

/** Draws the character currently loaded in `padSelector` stroke by
 * stroke along its bundled medians — the same character-space → screen
 * transform hanzi-writer's Positioner uses (see
 * e2e/helpers/writingStage.ts for the derivation). */
async function writePerfectly(page: Page, padSelector: string): Promise<void> {
  const pad = page.locator(padSelector);
  const char = await pad.getAttribute("data-char");
  const size = Number(await pad.getAttribute("data-size"));
  const padding = Number(await pad.getAttribute("data-padding"));
  const data = storyStrokeData[char!];
  const box = (await pad.locator("svg").boundingBox())!;
  const inner = size - 2 * padding;
  const scale = inner / 1024;
  const toScreen = ([ix, iy]: number[]) => ({
    x: box.x + padding + ix * scale,
    y: box.y + size - (padding + 124 * scale) - iy * scale,
  });
  for (const median of data.medians) {
    const pts = median.map(toScreen);
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 3 });
    await page.mouse.up();
  }
}

test("reading view highlights every target word", async ({ page }) => {
  await page.goto("/story-writer.html");
  await expect(page.locator("#story-title")).toHaveText(story.title);
  await expect(page.locator(".target-word")).toHaveCount(story.targets.length);
  await expect(page.locator("#read-char-row .mini-box")).toHaveCount(story.targets.length);
});

test("tapping a new character opens it in practice; flawless writing earns three stars and a saved best time", async ({ page }) => {
  await page.goto("/story-writer.html");
  const t = story.targets[2];
  await page.click(`#read-char-row .mini-box[data-char="${t.char}"]`);
  await expect(page.locator("#panel-practise")).toBeVisible();
  await expect(page.locator("#practise-pad")).toHaveAttribute("data-char", t.char);
  await expect(page.locator("#practise-pad svg")).toBeVisible();
  await page.click("#btn-free");
  await expect(page.locator("#practise-timer")).toBeVisible();
  await writePerfectly(page, "#practise-pad");
  await expect(page.locator("#practise-feedback")).toContainText("完美");
  const badge = page.locator(`#practise-char-row .mini-box[data-char="${t.char}"] .mini-badge`);
  await expect(badge).toHaveText("★★★");
  await expect(page.locator("#practise-best")).toContainText("最快");

  // Progress survives a reload on the same device.
  await page.reload();
  await page.click('[data-step="practise"]');
  await expect(badge).toHaveText("★★★");
  await page.click(`#practise-char-row .mini-box[data-char="${t.char}"]`);
  await expect(page.locator("#practise-best")).toContainText("最快");

  // The parent can clear it.
  await page.click('[data-step="read"]');
  page.once("dialog", (d) => d.accept());
  await page.click("#btn-reset");
  await page.click('[data-step="practise"]');
  await expect(badge).toHaveText("☆☆☆");
});

test("memory test: write every character, then see the score", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/story-writer.html");
  await page.click('[data-step="test"]');
  for (let i = 0; i < story.targets.length; i++) {
    await expect(page.locator("#test-progress")).toContainText(`${i + 1} / ${story.targets.length}`);
    await expect(page.locator("#test-pad svg")).toBeVisible();
    if (i === 0) {
      await page.click("#btn-test-reveal");
      await expect(page.locator("#test-feedback")).toContainText("✗");
    } else {
      await writePerfectly(page, "#test-pad");
      await expect(page.locator("#test-feedback")).toContainText("✓");
    }
    await page.click("#btn-test-next");
  }
  await expect(page.locator("#test-summary")).toBeVisible();
  await expect(page.locator("#summary-title")).toContainText(`${story.targets.length - 1} / ${story.targets.length}`);
  await expect(page.locator("#summary-best")).toContainText(`${story.targets.length - 1} / ${story.targets.length}`);
  await expect(page.locator("#btn-review")).toBeVisible();
  await page.click("#btn-review");
  await expect(page.locator("#panel-practise")).toBeVisible();
});

test("switching characters draws each one in a fresh pad", async ({ page }) => {
  await page.goto("/story-writer.html");
  await page.click('[data-step="practise"]');
  await page.click("#btn-trace");
  await writePerfectly(page, "#practise-pad");
  for (const t of story.targets.slice(1, 3)) {
    await page.click(`#practise-char-row .mini-box[data-char="${t.char}"]`);
    await expect(page.locator("#practise-pad")).toHaveAttribute("data-char", t.char);
    await expect(page.locator("#practise-pad svg")).toHaveCount(1);
  }
  const refs = await page.$$eval("#practise-pad [clip-path]", (els) => els.map((e) => e.getAttribute("clip-path")!));
  expect(refs.length).toBeGreaterThan(0);
  expect(refs.every((r) => r.startsWith("url(#"))).toBe(true);
});
