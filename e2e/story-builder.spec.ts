import { test, expect } from "@playwright/test";
import { ADVENTURES } from "../src/story-builder/adventures";

const adventure = ADVENTURES[0];

test("write a whole story with the partner, expanding each sentence", async ({ page }) => {
  await page.goto("/story-builder.html");
  await expect(page.locator(".adventure-card")).toHaveCount(ADVENTURES.length);
  await expect(page.locator("#library")).toBeHidden();

  await page.locator(`[data-adventure="${adventure.id}"]`).click();
  await expect(page.locator(".line-partner")).toHaveCount(1);

  // Too short: stays on the write step with a hint.
  await page.fill("#write-input", "雨");
  await page.click("#btn-write-done");
  await expect(page.locator("#write-hint")).not.toBeEmpty();
  await expect(page.locator("#turn-expand")).toBeHidden();

  for (const i of adventure.beats.keys()) {
    await page.fill("#write-input", "咪咪看着外面");
    await page.click("#btn-write-done");
    await expect(page.locator("#turn-expand")).toBeVisible();
    await expect(page.locator("#expand-input")).toHaveValue("咪咪看着外面");

    // Put the caret at the end and tap a scene word for the first sense tab.
    await page.locator("#expand-input").press("End");
    const firstWord = page.locator("#word-row .chip").first();
    const word = await firstWord.getAttribute("data-word");
    await firstWord.click();
    await expect(page.locator("#expand-input")).toHaveValue(`咪咪看着外面${word}`);
    await expect(page.locator(".badge.on")).not.toHaveCount(0);

    // A pattern chip leaves a gap that must be filled before committing.
    await page.locator('.sense-tab[data-sense="pattern"]').click();
    await page.locator('#word-row .chip[data-word="像……一样"]').click();
    await page.click("#btn-expand-done");
    await expect(page.locator("#expand-hint")).toContainText("……");
    await page.keyboard.type("小鸟");
    await page.click("#btn-expand-done");

    await expect(page.locator(".line-child")).toHaveCount(i + 1);
    await expect(page.locator(".line-child").last()).toContainText("像小鸟");
    await expect(page.locator(".line-child .line-meta").last()).toContainText("★★★");
    await expect(page.locator(".praise").last()).toBeVisible();
    if (i < adventure.beats.length - 1) await expect(page.locator("#write-prompt")).toContainText(adventure.beats[i + 1].prompt[0]);
  }

  await expect(page.locator("#turn-end")).toBeVisible();
  await expect(page.locator("#end-stars")).toContainText(`${adventure.beats.length * 3} / ${adventure.beats.length * 3}`);

  // It's in the story book, and opens again.
  await page.click("#btn-again");
  await expect(page.locator(".library-item")).toHaveCount(1);
  await page.locator(".library-item").click();
  await expect(page.locator("#read-flow .line-child")).toHaveCount(adventure.beats.length);
  await page.click("#btn-delete-saved");
  await expect(page.locator("#btn-delete-saved")).toContainText("确认");
  await expect(page.locator("#view-read")).toBeVisible();
  await page.click("#btn-delete-saved");
  await expect(page.locator("#library")).toBeHidden();
});

test("pinyin toggle hides and remembers", async ({ page }) => {
  await page.goto("/story-builder.html");
  const rt = page.locator(".adventure-title rt").first();
  await expect(rt).toBeVisible();
  await page.click("#btn-pinyin");
  await expect(rt).toBeHidden();
  await page.reload();
  await expect(page.locator(".adventure-title rt").first()).toBeHidden();
});
