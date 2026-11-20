import { test, expect, type Locator, type Page } from "@playwright/test";
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

/** Visible text of an element, without pinyin <rt> annotations. */
async function textOf(el: Locator): Promise<string> {
  return el.evaluate((node) => {
    const copy = node.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("rt").forEach((rt) => rt.remove());
    return copy.textContent ?? "";
  });
}

/** Writes the character on the pad stroke by stroke, along its medians. */
async function writePerfectly(page: Page, padSelector: string): Promise<void> {
  const pad = page.locator(padSelector);
  const char = (await pad.getAttribute("data-char"))!;
  const size = Number(await pad.getAttribute("data-size"));
  const padding = Number(await pad.getAttribute("data-padding"));
  const data = JSON.parse(readFileSync(require.resolve(`hanzi-writer-data/${char}.json`), "utf8")) as { medians: number[][][] };
  await expect(pad.locator("svg")).toBeVisible();
  const box = (await pad.locator("svg").boundingBox())!;
  const scale = (size - 2 * padding) / 1024;
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

  // 教团团写字: 团团 asks about three characters from the child's own
  // sentences, favouring ones added in a mission over everyday ones.
  const words = page.locator(".teach-word");
  await expect(words).toHaveCount(3);
  const picks = await words.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.char!));
  const childText = "雨很大，哗啦啦。咪咪跳进水坑。原来是一只小鸟，冷得发抖。";
  for (const c of picks) expect(childText).toContain(c);
  expect(picks).toContain("哗");
  expect(picks).not.toContain("是");
  await page.click("#btn-practise");
  await expect(page.locator("#btn-practise")).toBeHidden();
  await expect(page.locator(".char-tab")).toHaveCount(3);
  await expect(page.locator("#practise-pad svg")).toBeVisible();
  await expect(page.locator("#practise-pad")).toHaveAttribute("data-char", picks[0]);
  await expect(page.locator("#practise-feedback")).toContainText("怎么写");

  // Writing it alone with no mistakes teaches 团团, and the pad moves on.
  await page.click("#btn-free");
  await writePerfectly(page, "#practise-pad");
  await expect(page.locator("#practise-feedback")).toContainText(`我学会「${picks[0]}」啦`);
  await expect(page.locator(".char-tab").first()).toHaveClass(/learned/);
  await expect(page.locator(`.teach-word[data-char="${picks[0]}"]`)).toHaveClass(/learned/);
  await expect(page.locator("#teach-count")).toContainText("学会了 1 个字");
  await expect(page.locator("#practise-pad")).toHaveAttribute("data-char", picks[1]);

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
        ...(last
          ? {
              feedback: {
                stars: [
                  { quote: "呼呼呼", why: "我好像听到了风声！" },
                  { quote: "金色的星星", why: "这是团团写的，不是你写的。" },
                ],
                wish: { turn: 2, tip: "“开心”可以换一个词吗？", words: ["开心极了", "笑眯眯", "乐开了花"] },
              },
            }
          : {}),
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

  const more = ["小狗很开心", "小狗笑了起来", "小狗看见星星"];
  for (let t = 1; t < TURNS; t++) {
    await writeAndSpin(page, more[t - 1]);
    await page.click("#btn-done");
    await expect(page.locator(".line-child")).toHaveCount(t + 1);
  }
  await expect.poll(() => partnerText(page, -1)).toContain("回家睡觉");
  await expect(page.locator("#end-stars")).toContainText(`${TURNS} / ${TURNS}`);
  expect(posts.at(-1)!.turnsLeft).toBe(0);

  // 好词卡: the AI's star on the child's own words; a quote the child never wrote is dropped.
  const card = page.locator("#end-feedback .fb-card");
  await expect(card).toHaveAttribute("data-source", "ai");
  await expect(card.locator(".fb-star")).toHaveCount(1);
  await expect.poll(() => textOf(card.locator(".fb-quote"))).toBe("呼呼呼");

  // No pinyin until a word is tapped, even though the page's 拼音 toggle is on.
  const word = card.locator(".fb-why .tapword").first();
  await expect(word.locator("rt").first()).toBeHidden();
  await word.click();
  await expect(word.locator("rt").first()).toBeVisible();
  // The page's 拼音 toggle hides the story's pinyin but not a tapped word's.
  await page.click("#btn-pinyin");
  await expect(page.locator(".line-child rt").first()).toBeHidden();
  await expect(word.locator("rt").first()).toBeVisible();
  await page.click("#btn-pinyin");

  // The wish: the child rewrites their sentence; unchanged isn't accepted.
  expect(await textOf(card.locator(".fb-wish .fb-sentence"))).toBe("小狗很开心。");
  await card.locator(".fb-try").click();
  await card.locator(".fb-save").click();
  await expect(card.locator(".fb-rewrite .partner-note")).toBeVisible();
  await card.locator(".fb-input").fill("小狗开心极了");
  await card.locator(".fb-save").click();
  await expect(card.locator(".fb-done")).toBeVisible();
  await expect(page.locator(".line-child").nth(1)).toContainText("小狗开心极了。");

  // Saved with the story: reopening shows the card and the rewrite.
  await page.click("#btn-again");
  await page.locator(".library-item").click();
  await expect(page.locator("#read-flow .line-child").nth(1)).toContainText("小狗开心极了。");
  await expect(page.locator("#read-feedback .fb-wish.done")).toBeVisible();
  expect(await textOf(page.locator("#read-feedback .fb-wish .fb-sentence"))).toBe("小狗开心极了。");
});

test("a saved story from before feedback gets an offline 好词卡", async ({ page }) => {
  await aiOff(page);
  // The child's real story from 2026-11-17, saved before the card existed.
  const petDay = {
    id: "idea-1",
    adventureId: "idea",
    title: "我养宠物的天",
    savedAt: 1,
    lines: [
      { by: "partner", text: "今天早上，团团醒来时，发现一只小兔子坐在我的床边。" },
      { by: "child", text: "我想一会儿，就叫它小大。我说：“你好。”它叫了一声“咕！”", plain: "我想一会儿，就叫它小大。", mission: "hear", missionDone: true },
      { by: "partner", text: "小兔子听了，开心地跳了起来。" },
      { by: "child", text: "小兔看到太阳亮亮的，像火一样亮。", plain: "小兔看到太阳亮亮的。", mission: "pattern", missionDone: true },
      { by: "partner", text: "小兔眯着眼睛笑，它的小鼻子闻到了香香的味道。" },
      { by: "child", text: "原来是冰淇淋的味道，它心里觉得软软的。", plain: "原来是冰淇淋的味道。", mission: "feel", missionDone: true },
      { by: "partner", text: "小兔子抱着团团，一起吃冰淇淋。" },
    ],
  };
  await page.addInitScript((story) => {
    if (!localStorage.getItem("chengyu-dao:story-builder:library:v1")) {
      localStorage.setItem("chengyu-dao:story-builder:library:v1", JSON.stringify([story]));
    }
  }, petDay);
  await page.goto("/story-builder.html");
  await page.locator(".library-item").click();

  const card = page.locator("#read-feedback .fb-card");
  await expect(card).toHaveAttribute("data-source", "offline");
  await expect(card.locator(".fb-star")).toHaveCount(2);
  expect(await textOf(card.locator(".fb-star .fb-quote").nth(1))).toBe("像火一样亮");
  expect(await textOf(card.locator(".fb-wish .fb-tip"))).toContain("“亮”用了两次");
  await card.locator(".fb-try").click();
  await expect(card.locator(".hint-word")).toHaveCount(3);
  await card.locator(".fb-input").fill("小兔看到太阳金灿灿的，像火一样亮");
  await card.locator(".fb-save").click();
  await expect(page.locator("#read-flow .line-child").nth(1)).toContainText("金灿灿的");

  await page.reload();
  await page.locator(".library-item").click();
  await expect(page.locator("#read-flow .line-child").nth(1)).toContainText("金灿灿的");
  await expect(page.locator("#read-feedback .fb-wish.done")).toBeVisible();
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

test("?test keeps a separate story book", async ({ page }) => {
  await aiOff(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem("chengyu-dao:story-builder:library:v1")) {
      localStorage.setItem(
        "chengyu-dao:story-builder:library:v1",
        JSON.stringify([{ id: "child-1", adventureId: "idea", title: "孩子的故事", savedAt: 1, lines: [{ by: "partner", text: "从前。" }] }]),
      );
    }
  });
  await page.goto("/story-builder.html?test");
  await expect(page.locator("#test-badge")).toBeVisible();
  await expect(page.locator("#library")).toBeHidden();

  await page.goto("/story-builder.html");
  await expect(page.locator("#test-badge")).toBeHidden();
  await expect(page.locator(".library-item")).toHaveCount(1);
  await expect(page.locator("#library-title")).toHaveText("📚 我的故事书");
});
