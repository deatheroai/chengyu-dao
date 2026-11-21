import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { SEEDS } from "../src/sentence-grower/seeds";

const require = createRequire(import.meta.url);
const hints = { see: ["雪白的"], hear: ["汪汪汪"], smell: [], touch: [], feel: [], pattern: [] };

/** Stroke data comes from jsDelivr in production; serve it locally here. */
async function serveStrokeData(page: Page): Promise<void> {
  await page.route("https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/**", (route) => {
    const char = decodeURIComponent(route.request().url().split("/").pop()!.replace(/\.json$/, ""));
    route.fulfill({ contentType: "application/json", body: readFileSync(require.resolve(`hanzi-writer-data/${char}.json`)) });
  });
}

/** Visible text of an element, without pinyin <rt> annotations. */
async function textOf(el: Locator): Promise<string> {
  return el.evaluate((node) => {
    const copy = node.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("rt, button").forEach((x) => x.remove());
    return copy.textContent ?? "";
  });
}

async function aiOff(page: Page): Promise<void> {
  await page.route("**/api/story-partner", (route) => route.fulfill({ json: { enabled: false } }));
}

/** Picks a sense, rewrites the sentence and taps 长大吧. */
async function addSense(page: Page, sense: string, sentence: string): Promise<void> {
  await page.click(`.sense-card[data-sense="${sense}"]`);
  await expect(page.locator("#step")).toBeVisible();
  await page.fill("#grow-input", sentence);
  await page.click("#btn-grow");
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await serveStrokeData(page);
});

test("without AI: grow a sentence with three senses, read it, save it", async ({ page }) => {
  await aiOff(page);
  await page.goto("/sentence-grower.html");
  await expect(page.locator(".seed-card")).toHaveCount(SEEDS.length);
  await expect(page.locator("#garden-wrap")).toBeHidden();

  await page.click('[data-seed="puppy"]');
  expect(await textOf(page.locator("#grow-sentence"))).toBe("小狗在跑。");
  await expect(page.locator(".sense-card:not([disabled])")).toHaveCount(6);

  // The child's sentence starts in the box; unchanged isn't accepted.
  await page.click('.sense-card[data-sense="see"]');
  await expect(page.locator("#grow-input")).toHaveValue("小狗在跑。");
  await page.click("#btn-grow");
  await expect(page.locator("#step-note")).toContainText("看到");

  // Help ladder: hint words, then an example on a different sentence.
  await page.click("#btn-hint");
  await expect(page.locator(".hint-word")).toHaveCount(3);
  await page.click("#btn-example");
  expect(await textOf(page.locator("#example"))).toContain("红红的花开了");

  // 换一个 goes back to the cards without adding anything.
  await page.click("#btn-back");
  await expect(page.locator("#pick")).toBeVisible();
  await expect(page.locator(".dot.filled")).toHaveCount(0);

  await addSense(page, "see", "白白的小狗在草地上跑");
  await expect(page.locator("#reaction")).toContainText("“白白的”");
  await expect(page.locator(".dot.filled")).toHaveCount(1);
  await expect(page.locator('.sense-card[data-sense="see"]')).toBeDisabled();
  await expect(page.locator("#grow-sentence .seg-see")).toHaveCount(2);

  await addSense(page, "hear", "白白的小狗汪汪叫着，在草地上跑。");
  await addSense(page, "feel", "白白的小狗开心地汪汪叫着，在草地上跑。");

  // The end: growth, before/after, a legend row per sense.
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#pick")).toBeHidden();
  await expect(page.locator("#end-growth")).toContainText("从 4 个字长到 17 个字");
  await expect(page.locator("#end-growth")).toContainText("⭐⭐⭐");
  await expect(page.locator(".legend-row")).toHaveCount(3);
  expect(await textOf(page.locator('#legend [data-sense="see"]'))).toContain("白白的、草地上");

  // 改一改: the edit is saved and shown as an edit, not a sense.
  await page.click("#btn-edit");
  await page.fill("#edit-input", "白白的小狗开心地汪汪叫着，在草地上跑来跑去。");
  await page.click("#btn-edit-save");
  await expect(page.locator("#end-after .seg-edit")).toHaveCount(1);
  await expect(page.locator("#read-actions")).toBeHidden();

  // 团团 asks to learn one character the child added.
  await expect(page.locator("#practise")).toBeVisible();
  await expect(page.locator(".teach-word")).toHaveCount(1);
  await page.click("#btn-practise");
  await expect(page.locator("#practise-pad svg")).toBeVisible();

  // Saved to 我的好句子; open it and delete it with two taps.
  await page.click("#btn-again");
  await expect(page.locator(".garden-item")).toHaveCount(1);
  expect(await textOf(page.locator(".garden-item"))).toContain("跑来跑去");
  await page.click(".garden-item");
  await expect(page.locator("#read-legend .legend-row")).toHaveCount(3);
  await page.click("#btn-delete");
  await expect(page.locator("#btn-delete")).toContainText("再点一次");
  await page.click("#btn-delete");
  await expect(page.locator("#garden-wrap")).toBeHidden();
});

test("with AI: 团团 judges each sense, nudges, and the child can move on", async ({ page }) => {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/story-partner", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: { enabled: true } });
    const body = req.postDataJSON() as Record<string, unknown>;
    asked.push(body);
    const done = body.sense === "see";
    return route.fulfill({
      json: { senseDone: done, reaction: done ? "好白的小狗！" : "好句子！", hint: done ? "" : "小狗会发出什么声音？", hints },
    });
  });
  await page.goto("/sentence-grower.html");
  await expect(page.locator("body")).toHaveAttribute("data-ai", "on");
  await page.click('[data-seed="puppy"]');

  await addSense(page, "see", "白白的小狗在跑。");
  await expect(page.locator("#reaction")).toContainText("好白的小狗！ ⭐");
  expect(asked[0]).toMatchObject({ action: "grow", plain: "小狗在跑。", before: "小狗在跑。", sentence: "白白的小狗在跑。", sense: "see" });

  // AI hints are used for the next sense.
  await page.click('.sense-card[data-sense="hear"]');
  await page.click("#btn-hint");
  expect(await textOf(page.locator(".hint-word").first())).toBe("汪汪汪");

  // Not done: a nudge, and 就这样吧 keeps it without a star.
  await page.fill("#grow-input", "白白的小狗很快地在跑。");
  await page.click("#btn-grow");
  await expect(page.locator("#step-note")).toContainText("什么声音");
  await page.click("#btn-keep");
  await expect(page.locator(".dot.filled")).toHaveCount(2);
  await expect(page.locator("#reaction")).not.toContainText("⭐");
});

test("AI failing falls back to the offline check", async ({ page }) => {
  await page.route("**/api/story-partner", (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: { enabled: true } }) : route.fulfill({ status: 502, json: { error: "ai-failed" } }),
  );
  await page.goto("/sentence-grower.html");
  await expect(page.locator("body")).toHaveAttribute("data-ai", "on");
  await page.click('[data-seed="rain"]');
  await addSense(page, "hear", "雨哗啦啦地下着。");
  await expect(page.locator("#reaction")).toContainText("⭐");
});

test("sentences from 我的故事书 can be grown, and ?test keeps a separate list", async ({ page }) => {
  await aiOff(page);
  await page.goto("/sentence-grower.html");
  await page.evaluate(() =>
    localStorage.setItem(
      "chengyu-dao:story-builder:library:v1",
      JSON.stringify([
        {
          id: "s1",
          adventureId: "idea",
          title: "会飞的小狗",
          savedAt: 1,
          lines: [
            { by: "partner", text: "从前有一只小狗。" },
            { by: "child", text: "蓝蓝的大海哗哗地响。", plain: "大海很大", mission: "hear", missionDone: true },
          ],
        },
      ]),
    ),
  );
  await page.reload();
  await expect(page.locator(".story-seed")).toHaveCount(1);
  await page.click(".story-seed");
  expect(await textOf(page.locator("#grow-sentence"))).toBe("大海很大。");
  await page.click('.sense-card[data-sense="see"]');
  // No picture: 团团 asks the general question.
  expect(await textOf(page.locator("#step-question"))).toContain("颜色");

  await page.goto("/sentence-grower.html?test");
  await expect(page.locator("#test-badge")).toBeVisible();
  await expect(page.locator("#link-story")).toHaveAttribute("href", "/story-builder.html?test");
});

test("the story builder links to the sentence grower", async ({ page }) => {
  await aiOff(page);
  await page.goto("/story-builder.html");
  await page.click("#link-grower");
  await expect(page).toHaveURL(/sentence-grower\.html$/);
  await expect(page.locator(".seed-card").first()).toBeVisible();
});
