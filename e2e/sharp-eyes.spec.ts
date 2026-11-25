import { test, expect, type Locator, type Page } from "@playwright/test";
import { noteById } from "../src/sharp-eyes/notes";
import { correctText, parseNote } from "../src/sharp-eyes/round";

/** Visible text of an element, without pinyin <rt> annotations. */
async function textOf(el: Locator): Promise<string> {
  return el.evaluate((node) => {
    const copy = node.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("rt, button.speak-btn").forEach((x) => x.remove());
    return copy.textContent ?? "";
  });
}

const cell = (page: Page, i: number) => page.locator(`.cell[data-cell="${i}"]`);

/** Finds and fixes every mistake in the note on screen. */
async function fixAll(page: Page, id: string): Promise<void> {
  for (const m of parseNote(noteById(id)!).mistakes) {
    await cell(page, m.cell).click();
    await expect(page.locator("#fix")).toBeVisible();
    await page.locator(".choice", { hasText: m.right }).click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("团团 asks for help with one note; the starter costs no ink and ends with a stamp", async ({ page }) => {
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

  await expect(page.locator("#end")).toBeVisible();
  await expect(page.locator("#stamp")).toHaveText("优");

  // Back home, the next note is offered and the count shows.
  await page.click("#btn-end-home");
  await expect(page.locator("#home-count")).toContainText("1 张");
  await expect(page.locator("#start-sub")).toContainText("电梯里的通告");
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
});

test("🔍 提示 narrows down to the character and gives the family's clue, with no ink", async ({ page }) => {
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
  await page.goto("/sharp-eyes.html?test&note=p3-e-dog");
  await expect(page.locator("#tuan-line")).toContainText("不知道错了几个");
  await expect(page.locator("#found-dots")).toBeHidden();
  await fixAll(page, "p3-e-dog");
  await expect(page.locator("#end")).toBeHidden();
  await page.click("#btn-finish");
  await expect(page.locator("#stamp")).toHaveText("优");
});
