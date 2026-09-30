import { test, expect, type Page } from "@playwright/test";
import { scienceQuestions } from "../src/science-snake/scienceQuestions";
import { chunkWords } from "../src/science-snake/chunkWords";

/**
 * Science Snake e2e. Real play is random (seeded off Date.now) and
 * steering a bot onto a specific tile is flaky, so these drive the
 * `?e2e`-only `window.__snakeE2E` seams (main.ts / SnakeGameScene's
 * e2e* methods) — everything after "the snake reached an item" (the
 * overlay, grading, reveal gating, win/lose cards, score recording) is
 * the real code path.
 */

type Seams = { eatScienceItem(): boolean; fillBoardWithScienceItems(): void; forceWinLength(): void };
declare global {
  interface Window {
    __snakeE2E: Seams;
  }
}

async function startRun(page: Page): Promise<void> {
  await page.goto("/science-snake.html?e2e");
  await page.locator("#start-btn").click();
  await expect(page.locator("#start-card")).not.toHaveClass(/visible/);
}

/** Eats a science item and returns the question the overlay is now asking. */
async function eatAndGetQuestion(page: Page) {
  expect(await page.evaluate(() => window.__snakeE2E.eatScienceItem())).toBe(true);
  await expect(page.locator("#question-overlay")).toHaveClass(/visible/);
  const prompt = (await page.locator("#question-prompt").textContent()) ?? "";
  const question = scienceQuestions.find((q) => q.prompt === prompt);
  if (!question) throw new Error(`overlay showed an unknown prompt: ${prompt}`);
  return question;
}

async function submit(page: Page, text: string): Promise<void> {
  await page.locator("#question-input").fill(text);
  await page.locator("#question-submit-btn").click();
}

test("a winning run: correct answer closes the overlay, then reaching win length shows the win card with a score", async ({ page }) => {
  await startRun(page);
  const question = await eatAndGetQuestion(page);
  await submit(page, question.modelAnswer);
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);

  await page.evaluate(() => window.__snakeE2E.forceWinLength());
  await expect(page.locator("#win-card")).toHaveClass(/visible/);
  await expect(page.locator("#win-stats")).toContainText("1 correct");
  await expect(page.locator("#high-score-display")).toContainText("High score");
  await expect(page.locator("#win-comparison")).not.toBeEmpty();

  await page.locator("#win-play-again-btn").click();
  await expect(page.locator("#win-card")).not.toHaveClass(/visible/);
});

test("wrong once shows the hint; wrong twice gates Continue behind stepping through every reveal chunk", async ({ page }) => {
  await startRun(page);
  const question = await eatAndGetQuestion(page);

  await expect(page.locator("#question-hint")).toHaveClass(/hidden/);
  await submit(page, "I really do not know the answer to this one");
  await expect(page.locator("#question-hint")).not.toHaveClass(/hidden/);
  await expect(page.locator("#question-hint")).toHaveText(question.hint);
  await expect(page.locator("#question-overlay")).toHaveClass(/visible/);

  await submit(page, "I still do not know the answer to this one");
  await expect(page.locator("#question-reveal")).not.toHaveClass(/hidden/);
  await expect(page.locator("#question-ask-form")).toHaveClass(/hidden/);

  const chunks = chunkWords(question.modelAnswer);
  expect(chunks.length).toBeGreaterThan(1);
  // Continue is absent from the start and stays absent until the last chunk.
  for (let shown = 1; shown < chunks.length; shown++) {
    await expect(page.locator("#question-reveal-continue-btn")).toHaveClass(/hidden/);
    await expect(page.locator("#question-reveal-next-btn")).not.toHaveClass(/hidden/);
    await expect(page.locator("#question-overlay")).toHaveClass(/visible/);
    await page.locator("#question-reveal-next-btn").click();
  }
  await expect(page.locator("#question-reveal-text")).toHaveText(question.modelAnswer);
  await expect(page.locator("#question-reveal-next-btn")).toHaveClass(/hidden/);
  await expect(page.locator("#question-reveal-continue-btn")).not.toHaveClass(/hidden/);

  await page.locator("#question-reveal-continue-btn").click();
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
});

test("a suffocation loss: unanswered science items piling up ends the run with the lose card", async ({ page }) => {
  await startRun(page);
  const question = await eatAndGetQuestion(page);
  await submit(page, "I really do not know the answer to this one");
  await submit(page, "I still do not know the answer to this one");
  for (let i = 1; i < chunkWords(question.modelAnswer).length; i++) {
    await page.locator("#question-reveal-next-btn").click();
  }
  await page.locator("#question-reveal-continue-btn").click();

  await page.evaluate(() => window.__snakeE2E.fillBoardWithScienceItems());
  await expect(page.locator("#lose-card")).toHaveClass(/visible/);
  await expect(page.locator("#lose-message")).toContainText("couldn't breathe");
  await expect(page.locator("#lose-comparison")).not.toBeEmpty();

  await page.locator("#lose-play-again-btn").click();
  await expect(page.locator("#lose-card")).not.toHaveClass(/visible/);
});
