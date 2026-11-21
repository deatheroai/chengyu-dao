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

/** Picks a sense, types `addition` in 团团's suggested ＋ and taps 长大吧. */
async function addSense(page: Page, sense: string, addition: string): Promise<void> {
  await page.click(`.sense-card[data-sense="${sense}"]`);
  await expect(page.locator("#step")).toBeVisible();
  await page.fill(".slot-input", addition);
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

  await expect(page.locator("#dots-label")).toHaveText("还要加 3 个感觉");

  // 团团's suggested ＋ (before 小狗) is open and empty; empty isn't accepted.
  await page.click('.sense-card[data-sense="see"]');
  await expect(page.locator(".slot-input")).toHaveCount(1);
  await expect(page.locator(".slot-input")).toHaveValue("");
  await page.click("#btn-grow");
  await expect(page.locator("#step-note")).toContainText("＋");

  // Help ladder: hint words, then an example with its added part in colour.
  await page.click("#btn-hint");
  await expect(page.locator(".hint-word")).toHaveCount(3);
  await page.click("#btn-example");
  expect(await textOf(page.locator("#example"))).toContain("红红的花开了");
  await expect(page.locator("#example .seg-see")).toHaveCount(1);

  // Typing previews the sentence with the new words in colour.
  await page.fill(".slot-input", "白白的");
  expect(await textOf(page.locator("#grow-sentence"))).toBe("白白的小狗在跑。");
  await expect(page.locator("#grow-sentence .seg-see")).toHaveCount(1);

  // 换一个 goes back to the cards without adding anything.
  await page.click("#btn-back");
  await expect(page.locator("#pick")).toBeVisible();
  await expect(page.locator(".dot.filled")).toHaveCount(0);
  expect(await textOf(page.locator("#grow-sentence"))).toBe("小狗在跑。");

  await addSense(page, "see", "白白的");
  await expect(page.locator("#reaction")).toContainText("“白白的”");
  await expect(page.locator(".dot.filled")).toHaveCount(1);
  await expect(page.locator("#dots-label")).toHaveText("还要加 2 个感觉");
  await expect(page.locator('.sense-card[data-sense="see"]')).toBeDisabled();

  // Another ＋ can be picked; then the suggested one stops glowing (it's not a must).
  await page.click('.sense-card[data-sense="hear"]');
  await page.click('.slot-btn[data-at="0"]');
  await expect(page.locator(".slot-input")).toHaveCount(1);
  await expect(page.locator(".slot-btn.suggested")).toHaveCount(0);
  expect(await textOf(page.locator("#slot-tip"))).toContain("就加在这里");
  await page.click('.slot-btn[data-at="5"]');
  await page.fill(".slot-input", "汪汪叫着，");
  await page.click("#btn-grow");
  expect(await textOf(page.locator("#grow-sentence"))).toBe("白白的小狗汪汪叫着，在跑。");

  // ✏️ 整句改一改 for bigger changes, in two places at once.
  await page.click('.sense-card[data-sense="feel"]');
  await page.click("#btn-whole");
  await expect(page.locator("#grow-input")).toHaveValue("白白的小狗汪汪叫着，在跑。");
  await page.fill("#grow-input", "白白的小狗开心地汪汪叫着，在草地上跑。");
  await page.click("#btn-grow");

  // The end: growth, before/after, a legend row per sense.
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#pick")).toBeHidden();
  await expect(page.locator("#end-growth")).toContainText("从 4 个字长到 17 个字");
  await expect(page.locator("#end-growth")).toContainText("⭐⭐⭐");
  await expect(page.locator(".legend-row")).toHaveCount(3);
  expect(await textOf(page.locator('#legend [data-sense="feel"]'))).toContain("开心地、草地上");

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

  await addSense(page, "see", "白白的");
  await expect(page.locator("#reaction")).toContainText("好白的小狗！ ⭐");
  expect(asked[0]).toMatchObject({ action: "grow", plain: "小狗在跑。", before: "小狗在跑。", sentence: "白白的小狗在跑。", sense: "see" });

  // The picture's hint words come first: they fit its suggested ＋.
  await page.click('.sense-card[data-sense="hear"]');
  await page.click("#btn-hint");
  expect(await textOf(page.locator(".hint-word").first())).toBe("汪汪叫着");

  // Not done: a nudge, and 就这样吧 keeps it without a star.
  await page.fill(".slot-input", "很快地");
  await page.click("#btn-grow");
  await expect(page.locator("#step-note")).toContainText("什么声音");
  await page.click("#btn-keep");
  await expect(page.locator(".dot.filled")).toHaveCount(2);
  await expect(page.locator("#reaction")).not.toContainText("⭐");
});

test("with AI: a sense that's there but reads oddly gets a question, not a pass", async ({ page }) => {
  await page.route("**/api/story-partner", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: { enabled: true } });
    const odd = (req.postDataJSON() as { sentence: string }).sentence.includes("汤的味道面");
    return route.fulfill({
      json: {
        senseDone: true,
        readsWell: !odd,
        fixHint: odd ? "“汤的味道面”读起来有点怪，可以怎么改？" : "",
        reaction: "好香！",
        hint: "",
        hints,
      },
    });
  });
  await page.goto("/sentence-grower.html");
  await expect(page.locator("body")).toHaveAttribute("data-ai", "on");
  await page.click('[data-seed="noodles"]');
  await addSense(page, "smell", "面汤的味道");
  await expect(page.locator("#step-note")).toContainText("“汤的味道面”");
  await expect(page.locator(".dot.filled")).toHaveCount(0);
  await expect(page.locator("#btn-listen")).toBeVisible();

  // Fixed: accepted with a star.
  await page.fill(".slot-input", "香喷喷的");
  await page.click("#btn-grow");
  await expect(page.locator("#reaction")).toContainText("好香！ ⭐");
  expect(await textOf(page.locator("#grow-sentence"))).toBe("爸爸买了一碗香喷喷的面。");

  // Or moving on anyway keeps the ⭐ for the sense.
  await page.click('.sense-card[data-sense="touch"]');
  await page.fill(".slot-input", "面汤的味道");
  await page.click("#btn-grow");
  await expect(page.locator("#btn-keep")).toBeVisible();
  await page.click("#btn-keep");
  await expect(page.locator(".dot.filled")).toHaveCount(2);
  await expect(page.locator("#reaction")).toContainText("⭐");
});

test("AI failing falls back to the offline check", async ({ page }) => {
  await page.route("**/api/story-partner", (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: { enabled: true } }) : route.fulfill({ status: 502, json: { error: "ai-failed" } }),
  );
  await page.goto("/sentence-grower.html");
  await expect(page.locator("body")).toHaveAttribute("data-ai", "on");
  await page.click('[data-seed="rain"]');
  await addSense(page, "hear", "，哗啦啦");
  await expect(page.locator("#reaction")).toContainText("⭐");

  // A long addition still fits in its box (Chinese characters are wide).
  await page.click('.sense-card[data-sense="smell"]');
  await page.locator(".slot-input").pressSequentially("，泥土的味道漂浮着");
  const [shown, needed] = await page.locator(".slot-input").evaluate((e) => [e.clientWidth, e.scrollWidth]);
  expect(needed).toBeLessThanOrEqual(shown);
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
  // No picture: 团团 asks the general question, and no ＋ is suggested.
  expect(await textOf(page.locator("#step-question"))).toContain("颜色");
  await expect(page.locator(".slot-input")).toHaveCount(0);
  await expect(page.locator(".slot-btn.suggested")).toHaveCount(0);
  await page.click("#btn-grow");
  await expect(page.locator("#step-note")).toContainText("先点一个");
  await page.locator(".slot-btn").first().click();
  await page.fill(".slot-input", "蓝蓝的");
  await page.click("#btn-grow");
  expect(await textOf(page.locator("#grow-sentence"))).toBe("蓝蓝的大海很大。");

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
