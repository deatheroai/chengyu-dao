import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { FAMILIES } from "../src/sharp-eyes/families";
import { noteById } from "../src/sharp-eyes/notes";
import { correctText, parseNote } from "../src/sharp-eyes/round";
import { planSession } from "../src/sharp-eyes/session";
import { isComplex } from "../src/sharp-eyes/writing";

const require = createRequire(import.meta.url);
const PROGRESS_KEY = "chengyu-dao:sharp-eyes:progress:v1:test";

/** Visible text of an element, without pinyin <rt> annotations. */
async function textOf(el: Locator): Promise<string> {
  return el.evaluate((node) => {
    const copy = node.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("rt, button.speak-btn").forEach((x) => x.remove());
    return copy.textContent ?? "";
  });
}

const cell = (page: Page, i: number) => page.locator(`.cell[data-cell="${i}"]`);

/** Stroke data comes from jsDelivr in production; serve it locally here. */
async function serveStrokeData(page: Page): Promise<void> {
  await page.route("https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/**", (route) => {
    const char = decodeURIComponent(route.request().url().split("/").pop()!.replace(/\.json$/, ""));
    route.fulfill({ contentType: "application/json", body: readFileSync(require.resolve(`hanzi-writer-data/${char}.json`)) });
  });
}

/** Writes the pad's character stroke by stroke along its medians (no wrong strokes). */
async function writePerfectly(page: Page, padSelector: string): Promise<void> {
  const pad = page.locator(padSelector);
  const char = (await pad.getAttribute("data-char"))!;
  const size = Number(await pad.getAttribute("data-size"));
  const padding = Number(await pad.getAttribute("data-padding"));
  const data = JSON.parse(readFileSync(require.resolve(`hanzi-writer-data/${char}.json`), "utf8")) as { medians: number[][][] };
  await expect(pad.locator("svg")).toBeVisible();
  await pad.scrollIntoViewIfNeeded();
  // Wait until the pad stops moving (the page may still be scrolling to it).
  let box = (await pad.locator("svg").boundingBox())!;
  await expect
    .poll(async () => {
      const now = (await pad.locator("svg").boundingBox())!;
      const still = now.y === box.y && now.x === box.x;
      box = now;
      return still;
    })
    .toBe(true);
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

const phase = (page: Page, pad: string) => page.locator(pad).getAttribute("data-phase");

/** Teaches 团团 the fixed character: watches, writes alone, then 继续. */
async function teach(page: Page): Promise<void> {
  await expect(page.locator("#write")).toBeVisible();
  await expect.poll(() => phase(page, "#write-pad"), { timeout: 20000 }).toMatch(/^(trace|free)$/);
  if ((await phase(page, "#write-pad")) === "trace") {
    await writePerfectly(page, "#write-pad");
    await expect.poll(() => phase(page, "#write-pad"), { timeout: 5000 }).toBe("free");
  }
  await writePerfectly(page, "#write-pad");
  await expect(page.locator("#write-line")).toContainText("一笔都没错");
  await page.click("#btn-write-next");
}

/** Finds and fixes every mistake in the note on screen (characters already written: no writing). */
async function fixAll(page: Page, id: string): Promise<void> {
  for (const m of parseNote(noteById(id)!).mistakes) {
    await cell(page, m.cell).click();
    await expect(page.locator("#fix")).toBeVisible();
    await page.locator(".choice", { hasText: m.right }).click();
    await expect(cell(page, m.cell)).toHaveClass(/fixed/);
    await expect(page.locator("#write")).toBeHidden();
  }
}

/** Saved progress to start from (set once, so the page's own saves then stick). */
async function startWith(page: Page, progress: object): Promise<void> {
  await page.addInitScript(([key, value]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, [PROGRESS_KEY, JSON.stringify(progress)] as const);
}

/** Every family character written once, long ago: fixes need no writing. */
async function allWrittenBefore(page: Page, stamps: Record<string, string> = {}, more: object = {}): Promise<void> {
  const writes = Object.fromEntries(FAMILIES.flatMap((f) => f.chars.map((c) => [c.char, { n: 1, at: 0 }])));
  await startWith(page, { stamps, writes, ...more });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await serveStrokeData(page);
});

test("团团 asks for help with one note; the starter costs no ink, and a simple fix needs no writing", async ({ page }) => {
  await page.goto("/sharp-eyes.html?test");
  await expect(page.locator("#home-line")).toContainText("帮我");
  await expect(page.locator("#btn-start")).toContainText("只改一张便条");
  await page.click("#btn-start");

  const starter = parseNote(noteById("p3-play")!);
  await expect(page.locator("#note-title")).toHaveText("给妈妈的便条");
  await expect(page.locator("#ink")).toContainText("不用墨水");

  // A right character: it wobbles, but no ink is used on the starter.
  await cell(page, 0).click();
  await expect(cell(page, 0)).toHaveClass(/ok/);
  await expect(page.locator("#tuan-line")).toContainText("是对的");

  // The mistake: circled, the funny reveal, then pick from its family.
  const m = starter.mistakes[0];
  await cell(page, m.cell).click();
  await expect(cell(page, m.cell)).toHaveClass(/found/);
  await expect(page.locator("#tuan-line")).toContainText("今天的第一个错字");
  await expect(page.locator("#oops")).toContainText("操场变成工厂");
  await page.locator(".choice", { hasText: m.wrong }).click();
  await expect(page.locator("#tuan-line")).toContainText("工厂");
  await page.locator(".choice", { hasText: m.right }).click();
  await expect(cell(page, m.cell)).toHaveClass(/fixed/);
  expect(await textOf(page.locator("#note-text"))).toBe("妈妈，我去楼下的操场找小猫，它欠我一根竹子！");

  // 场 is a simple character: no writing, straight to the stamp.
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#write")).toBeHidden();
  await expect(page.locator("#stamp")).toHaveText("优");
  await expect(page.locator("#end-pens")).toBeHidden();
  await expect(page.locator("#btn-dictate")).toBeHidden();

  // Back home, the next note is offered and the count shows.
  await page.click("#btn-end-home");
  await expect(page.locator("#home-count")).toContainText("1 张");
  await expect(page.locator("#start-sub")).toContainText("电梯里的通告");
});

test("a harder character is written once after the fix, and 默写 waits a few minutes", async ({ page }) => {
  await page.goto("/sharp-eyes.html?test&note=p3-q-cat");
  const m = parseNote(noteById("p3-q-cat")!).mistakes[0];
  // 团团 wrote 眼晴: the pinyin is what he meant (yǎnjing), not qíng, so it doesn't give the mistake away.
  await expect(cell(page, m.cell)).toHaveText("晴jing");
  await expect(cell(page, m.cell - 1).locator("rt")).toHaveText("yǎn");
  await cell(page, m.cell).click();
  await page.locator(".choice", { hasText: m.right }).click();
  await expect(page.locator("#write-label")).toContainText("教团团写「睛」");
  await expect(page.locator("#write-pad")).toHaveAttribute("data-phase", "watch");
  await teach(page);
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#end-pens")).toContainText("金笔");
  await expect(page.locator("#btn-dictate")).toBeHidden();
  await page.click("#btn-end-home");
  await expect(page.locator("#home-count")).toContainText("1 个字过一会儿再默写");
  await expect(page.locator("#btn-home-dictate")).toBeHidden();
});

test("默写 tests a harder character later, in its sentence; written twice, it's done", async ({ page }) => {
  await allWrittenBefore(page, {}, { toWrite: [{ noteId: "p3-q-cat", mistake: 0 }] });
  await page.goto("/sharp-eyes.html?test");
  await expect(page.locator("#btn-home-dictate")).toContainText("1 个字");
  await page.click("#btn-home-dictate");
  await expect(page.locator("#dict-count")).toHaveText("第 1 / 1 个");
  expect(await textOf(page.locator("#dict-sentence"))).toBe("小猫的眼\u3000一直盯着我的鱼丸。");
  await expect(page.locator(".dict-blank rt")).toHaveText("jing"); // 眼睛: neutral tone
  await expect.poll(() => phase(page, "#dict-pad"), { timeout: 10000 }).toBe("free");
  await writePerfectly(page, "#dict-pad");
  await expect(page.locator("#dict-line")).toContainText("对了");
  await page.click("#btn-dict-next");
  await expect(page.locator("#dict-score")).toHaveText("默写：1 / 1");
  await page.click("#btn-dict-home");
  await expect(page.locator("#btn-home-dictate")).toBeHidden();
  await expect(page.locator("#home-count")).not.toContainText("再默写");
});

test("a character shown in 默写 comes back a few minutes later", async ({ page }) => {
  await allWrittenBefore(page, {}, { toWrite: [{ noteId: "p3-q-cat", mistake: 0 }] });
  await page.goto("/sharp-eyes.html?test");
  await page.click("#btn-home-dictate");
  await page.click("#btn-dict-show");
  await page.click("#btn-dict-next");
  await expect(page.locator("#dict-score")).toHaveText("默写：0 / 1");
  await expect(page.locator(".dict-results li.again")).toHaveText("睛");
  await page.click("#btn-dict-home");
  await expect(page.locator("#btn-home-dictate")).toBeHidden();
  await expect(page.locator("#home-count")).toContainText("1 个字过一会儿再默写");
});

test("wrong taps use red ink; running out shows the rest and gives 加油", async ({ page }) => {
  await page.goto("/sharp-eyes.html?test&note=p3-lift");
  const p = parseNote(noteById("p3-lift")!);
  await expect(page.locator(".drop:not(.empty)")).toHaveCount(3);
  await expect(page.locator("#found-label")).toHaveText(`找到 0 / ${p.mistakes.length} 个`);
  const rightOnes = p.cells.map((c, i) => (c.mistake === undefined && /\p{Script=Han}/u.test(c.char) ? i : -1)).filter((i) => i >= 0);
  for (const i of rightOnes.slice(0, 2)) await cell(page, i).click();
  await expect(page.locator(".drop:not(.empty)")).toHaveCount(1);
  await expect(page.locator("#tuan-line")).toContainText("1 滴");
  await cell(page, rightOnes[2]).click();
  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#stamp")).toHaveText("加油");
  await expect(page.locator(".cell.missed")).toHaveCount(p.mistakes.length);
  expect(await textOf(page.locator("#note-text"))).toBe(correctText(p));
  await expect(page.locator("#btn-dictate")).toBeHidden();
});

test("🔍 提示 narrows down to the character and gives the family's clue, with no ink", async ({ page }) => {
  await allWrittenBefore(page);
  await page.goto("/sharp-eyes.html?test&note=p3-beach");
  const m = parseNote(noteById("p3-beach")!).mistakes[0];
  await page.click("#btn-hint");
  await expect(page.locator("#tuan-line")).toContainText("这一句");
  await page.click("#btn-hint");
  await expect(page.locator(".cell.hinted")).toHaveCount(3);
  await page.click("#btn-hint");
  await expect(page.locator(".cell.hinted")).toHaveCount(1);
  await expect(cell(page, m.cell)).toHaveClass(/hinted/);
  await expect(page.locator("#tuan-line")).toContainText("青");
  await expect(page.locator(".drop:not(.empty)")).toHaveCount(3);
  await fixAll(page, "p3-beach");
  await expect(page.locator("#stamp")).toHaveText("优");
});

test("an essay doesn't say how many and stays open until 改好了", async ({ page }) => {
  await allWrittenBefore(page);
  await page.goto("/sharp-eyes.html?test&note=p3-e-dog");
  await expect(page.locator("#tuan-line")).toContainText("不知道错了几个");
  await expect(page.locator("#found-dots")).toBeHidden();
  await fixAll(page, "p3-e-dog");
  await expect(page.locator("#end")).toBeHidden();
  await page.click("#btn-finish");
  await expect(page.locator("#stamp")).toHaveText("优");
});

test("a whole session: 📝 ⚡ 📝 ⚡ 📒, a fastest-time record, then the report card and 默写", async ({ page }) => {
  test.setTimeout(180000);
  await allWrittenBefore(page, { "p3-play": "优" }, { fastest: { 3: 99 } });
  const plan = planSession({ stamps: { "p3-play": "优" } }, 3);
  expect(plan.map((st) => st.kind)).toEqual(["find", "quick", "find", "quick", "essay"]);

  await page.goto("/sharp-eyes.html?test");
  await expect(page.locator("#home-level")).toContainText("现在是 P3");
  await page.click("#btn-start");
  await expect(page.locator("#stage-strip li")).toHaveCount(6);

  for (const [si, stage] of plan.entries()) {
    const next = plan[si + 1];
    if (stage.kind === "quick") {
      // ⚡ 快手改: four sentences against the clock, no writing in between.
      for (const [i, n] of stage.notes.entries()) {
        await expect(page.locator("#note-title")).toHaveText(`快手改 ${i + 1} / 4`);
        await expect(page.locator("#quick-timer")).toBeVisible();
        await expect(page.locator("#found-label")).toContainText("🏆 最快");
        const m = parseNote(n).mistakes[0];
        await cell(page, m.cell).click();
        await page.locator(".choice", { hasText: m.right }).click();
        await expect(page.locator("#write")).toBeHidden();
      }
      await expect(page.locator("#end")).toBeVisible();
      await expect(page.locator("#end-pens")).toContainText("4 句里有 4 句够快");
      if (si === 1) await expect(page.locator("#end-pens")).toContainText("🏆 新纪录");
    } else {
      await expect(page.locator("#note-title")).toHaveText(stage.notes[0].title);
      await fixAll(page, stage.notes[0].id);
      if (stage.kind === "essay") await page.click("#btn-finish");
      await expect(page.locator("#stamp")).toHaveText("优");
    }
    await expect(page.locator("#btn-next")).toHaveText(
      !next ? "看成绩单 🏅" : next.kind === "quick" ? "下一关：⚡ 快手改" : next.kind === "essay" ? "最后一关：团团的作文 📒" : "再来一张 📝",
    );
    await page.click("#btn-next");
  }

  await expect(page.locator("#view-report")).toBeVisible();
  await expect(page.locator("#report-rows li")).toHaveCount(5);
  await expect(page.locator("#report-rows")).toContainText("🏆");
  await expect(page.locator("#report-sum")).toContainText("“优” 11 / 11");
  await expect(page.locator("#report-sum")).toContainText("⚡ 8");
  await expect(page.locator("#report-line")).toContainText("全部都是");
  const harder = new Set(plan.flatMap((st) => st.notes.flatMap((n) => parseNote(n).mistakes.map((m) => m.right))).filter(isComplex));
  const due = Math.min(6, harder.size);
  await expect(page.locator("#btn-report-dictate")).toHaveText(`✍️ 默写 ${due} 个字`);
  await page.click("#btn-report-dictate");
  await expect(page.locator("#dict-count")).toHaveText(`第 1 / ${due} 个`);
});
