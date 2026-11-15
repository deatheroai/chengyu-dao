import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ADVENTURES } from "../src/story-builder/adventures";
import { TURNS } from "../src/story-builder/flow";

const require = createRequire(import.meta.url);
const adventure = ADVENTURES[0];
const hints = { see: ["红红的"], hear: ["哗啦啦"], smell: ["香香的"], touch: ["软软的"], feel: ["开心"], pattern: ["像棉花"] };

/** Stroke data comes from jsDelivr in production; serve it locally here. */
async function serveStrokeData(page: Page): Promise<void> {
  await page.route("https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/**", (route) => {
    const char = decodeURIComponent(route.request().url().split("/").pop()!.replace(/\.json$/, ""));
    route.fulfill({ contentType: "application/json", body: readFileSync(require.resolve(`hanzi-writer-data/${char}.json`)) });
  });
}

/** A partner line's text without the pinyin <rt> annotations. */
async function partnerText(page: Page, n: number): Promise<string> {
  const el = n < 0 ? page.locator(".line-partner .line-text").last() : page.locator(".line-partner .line-text").nth(n);
  await expect(el).toBeVisible();
  return el.evaluate((node) => {
    const copy = node.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("rt").forEach((rt) => rt.remove());
    return copy.textContent ?? "";
  });
}

async function aiOff(page: Page): Promise<void> {
  await page.route("**/api/story-partner", (route) => route.fulfill({ json: { enabled: false } }));
}

/** Writes a sentence, spins, and waits for the mission card. */
async function writeAndSpin(page: Page, sentence: string): Promise<void> {
  await page.fill("#sentence", sentence);
  await page.click("#btn-written");
  await page.click("#btn-spin");
  await expect(page.locator("#mission")).toBeVisible();
  await expect(page.locator("#mission-title")).not.toBeEmpty();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await serveStrokeData(page);
});

test("without AI: write, spin a mission, finish the story and practise characters", async ({ page }) => {
  await aiOff(page);
  await page.goto("/story-builder.html");
  await expect(page.locator(".adventure-card")).toHaveCount(ADVENTURES.length);
  await expect(page.locator("#idea-card")).toBeHidden();

  await page.locator(`[data-adventure="${adventure.id}"]`).click();
  await expect(page.locator(".line-partner")).toHaveCount(1);

  // Too short: stays on the write step.
  await page.fill("#sentence", "雨");
  await page.click("#btn-written");
  await expect(page.locator("#turn-hint")).not.toBeEmpty();
  await expect(page.locator("#spin-area")).toBeHidden();

  // Turn 1: unchanged sentence isn't accepted; an edited one earns a star.
  await writeAndSpin(page, "雨很大");
  await page.click("#btn-hint");
  await expect(page.locator(".hint-word").first()).toBeVisible();
  await page.click("#btn-done");
  await expect(page.locator("#partner-note")).toBeVisible();
  await page.locator("#sentence").press("End");
  await page.keyboard.type("，哗啦啦");
  await page.click("#btn-done");
  await expect(page.locator(".line-child")).toHaveCount(1);
  await expect(page.locator(".line-child").first()).toContainText("雨很大，哗啦啦。");
  await expect(page.locator(".line-child .line-before").first()).toContainText("原来：雨很大。");
  await expect(page.locator(".line-child .line-meta").first()).toContainText("⭐");
  expect(await partnerText(page, 1)).toContain(adventure.beats[1].partner.slice(0, 4));

  // Turn 2: skip the mission (no star).
  await writeAndSpin(page, "咪咪跳进水坑");
  await page.click("#btn-skip");
  await expect(page.locator(".line-child")).toHaveCount(2);
  await expect(page.locator(".line-child .line-meta").nth(1)).not.toContainText("⭐");

  // Turn 3, then the ending.
  await writeAndSpin(page, "原来是一只小鸟");
  await page.locator("#sentence").press("End");
  await page.keyboard.type("，冷得发抖");
  await page.click("#btn-done");
  await expect(page.locator(".line-child")).toHaveCount(TURNS);
  await expect.poll(() => partnerText(page, -1)).toContain(adventure.ending.slice(0, 4));
  await expect(page.locator("#turn-end")).toBeVisible();
  await expect(page.locator("#end-stars")).toContainText(`2 / ${TURNS}`);

  // Handwriting: pick characters from the child's own sentences.
  await expect(page.locator('.char-chip[data-char="雨"]')).toBeVisible();
  await expect(page.locator('.char-chip[data-char="团"]')).toHaveCount(0);
  await page.locator('.char-chip[data-char="雨"]').click();
  await page.locator('.char-chip[data-char="鸟"]').click();
  await page.click("#btn-practise");
  await expect(page.locator(".char-tab")).toHaveCount(2);
  await expect(page.locator("#practise-pad svg")).toBeVisible();
  await expect(page.locator("#practise-pad")).toHaveAttribute("data-char", "雨");
  await page.locator(".char-tab").nth(1).click();
  await expect(page.locator("#practise-pad")).toHaveAttribute("data-char", "鸟");

  // Saved to the story book; opens again; deletes with two taps.
  await page.click("#btn-again");
  await expect(page.locator(".library-item")).toHaveCount(1);
  await page.locator(".library-item").click();
  await expect(page.locator("#read-flow .line-child")).toHaveCount(TURNS);
  await page.click("#btn-delete-saved");
  await expect(page.locator("#btn-delete-saved")).toContainText("确认");
  await page.click("#btn-delete-saved");
  await expect(page.locator("#library")).toBeHidden();
});

test("with AI: 团团 starts from the child's idea, nudges, then reacts", async ({ page }) => {
  const posts: Record<string, unknown>[] = [];
  let turnCalls = 0;
  await page.route("**/api/story-partner", async (route) => {
    const req = route.request();
    if (req.method() === "GET") return route.fulfill({ json: { enabled: true } });
    const body = req.postDataJSON() as Record<string, unknown>;
    posts.push(body);
    if (body.action === "start") {
      return route.fulfill({ json: { next: { line: "从前，有一只会飞的小狗。", question: "它飞去哪里？", hints } } });
    }
    turnCalls++;
    const last = body.turnsLeft === 0;
    const done = turnCalls !== 1; // the first attempt needs another try
    return route.fulfill({
      json: {
        missionDone: done,
        reaction: done ? "哇，我好像听到了！" : "好句子！",
        hint: done ? "" : "它飞的时候有什么声音？",
        next: last
          ? { line: "小狗回家睡觉了。", question: "", hints: { see: [], hear: [], smell: [], touch: [], feel: [], pattern: [] } }
          : { line: `小狗飞到了第${turnCalls}朵云上。`, question: "然后呢？", hints },
      },
    });
  });

  await page.goto("/story-builder.html");
  await expect(page.locator("#idea-card")).toBeVisible();
  await page.fill("#idea-input", "会飞的小狗");
  await page.click("#btn-idea");
  expect(await partnerText(page, 0)).toContain("会飞的小狗");
  await expect(page.locator("#turn-prompt")).toContainText("它");

  await writeAndSpin(page, "小狗飞到天上");
  await page.click("#btn-hint");
  await expect(page.locator(".hint-word").first()).toBeVisible();
  await page.click("#btn-done");
  await expect(page.locator("#partner-note")).toContainText("有什么声音");
  await expect(page.locator(".line-child")).toHaveCount(0);
  await page.locator("#sentence").press("End");
  await page.keyboard.type("，呼呼呼");
  await page.click("#btn-done");
  await expect(page.locator(".line-child")).toHaveCount(1);
  await expect(page.locator(".praise").last()).toContainText("我好像听到了");

  const turn1 = posts.filter((p) => p.action === "turn").at(-1)!;
  expect(turn1.original).toBe("小狗飞到天上。");
  expect(turn1.sentence).toBe("小狗飞到天上，呼呼呼。");
  expect(turn1.turnsLeft).toBe(TURNS - 1);

  for (let t = 1; t < TURNS; t++) {
    await writeAndSpin(page, "小狗很开心");
    await page.click("#btn-done");
    await expect(page.locator(".line-child")).toHaveCount(t + 1);
  }
  await expect.poll(() => partnerText(page, -1)).toContain("回家睡觉");
  await expect(page.locator("#end-stars")).toContainText(`${TURNS} / ${TURNS}`);
});

test("with AI down mid-story: carries on with the pre-written story", async ({ page }) => {
  await page.route("**/api/story-partner", (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: { enabled: true } }) : route.fulfill({ status: 502, json: { error: "ai-failed" } }),
  );
  await page.goto("/story-builder.html");
  await page.locator(`[data-adventure="${adventure.id}"]`).click();
  await writeAndSpin(page, "雨很大");
  await page.locator("#sentence").press("End");
  await page.keyboard.type("，滴答滴答");
  await page.click("#btn-done");
  await expect(page.locator(".line-child")).toHaveCount(1);
  expect(await partnerText(page, 1)).toContain(adventure.beats[1].partner.slice(0, 4));
});

test("pinyin toggle hides and remembers", async ({ page }) => {
  await aiOff(page);
  await page.goto("/story-builder.html");
  const rt = page.locator(".adventure-title rt").first();
  await expect(rt).toBeVisible();
  await page.click("#btn-pinyin");
  await expect(rt).toBeHidden();
  await page.reload();
  await expect(page.locator(".adventure-title rt").first()).toBeHidden();
});
