import { test, expect } from "@playwright/test";
import { startRun, readBoard, steerIntoScienceItem, submitAnswer } from "./helpers/scienceSnake";
import { chunkWords } from "../src/science-snake/chunkWords";
import { CORRECT_ANSWER_GROWTH } from "../src/science-snake/snakeGrid";

// A full win (filling the board) and suffocation loss (~190 unanswered
// items on the board) take far too long to reach by real steering, so
// those stay covered by the pure snakeGrid/suffocation unit tests. These
// cover the DOM/Phaser wiring the unit tests can't: the question overlay
// flow and — the actual point of the mechanic — the reveal's "Continue"
// staying gated behind stepping through every chunk.

const WRONG_ANSWER = "It is just something that happens because the weather is nice today.";

test("start card begins a run and hides itself", async ({ page }) => {
  await startRun(page);
  const board = await readBoard(page);
  expect(board.length).toBe(3);
  expect(board.items.some((i) => i.type === "science")).toBe(true);
});

test("a correct answer closes the overlay and grows the snake", async ({ page }) => {
  await startRun(page);
  const question = await steerIntoScienceItem(page);
  const lengthBefore = (await readBoard(page)).length;

  await submitAnswer(page, question.modelAnswer);

  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
  // Growth is applied over the next few ticks (one segment per tick), so poll.
  await expect.poll(async () => (await readBoard(page)).length).toBeGreaterThanOrEqual(lengthBefore + CORRECT_ANSWER_GROWTH);
});

test("a wrong first try shows the hint and keeps the overlay open", async ({ page }) => {
  await startRun(page);
  const question = await steerIntoScienceItem(page);

  await expect(page.locator("#question-hint")).toHaveClass(/hidden/);
  await submitAnswer(page, WRONG_ANSWER);

  await expect(page.locator("#question-overlay")).toHaveClass(/visible/);
  await expect(page.locator("#question-hint")).not.toHaveClass(/hidden/);
  await expect(page.locator("#question-hint")).toHaveText(question.hint);
  // …and a correct second try still counts.
  await submitAnswer(page, question.modelAnswer);
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
});

test("the wrong-twice reveal only offers Continue after every chunk is stepped through", async ({ page }) => {
  await startRun(page);
  const question = await steerIntoScienceItem(page);
  await submitAnswer(page, WRONG_ANSWER);
  await submitAnswer(page, WRONG_ANSWER);

  const chunks = chunkWords(question.modelAnswer);
  expect(chunks.length).toBeGreaterThan(1);
  const next = page.locator("#question-reveal-next-btn");
  const cont = page.locator("#question-reveal-continue-btn");

  await expect(page.locator("#question-reveal")).not.toHaveClass(/hidden/);
  // Only the first chunk is showing, and Continue isn't offered yet.
  await expect(cont).toHaveClass(/hidden/);
  await expect(next).not.toHaveClass(/hidden/);

  for (let i = 1; i < chunks.length; i++) {
    await expect(cont).toHaveClass(/hidden/);
    await next.click();
  }

  await expect(cont).not.toHaveClass(/hidden/);
  await expect(next).toHaveClass(/hidden/);
  await expect(page.locator("#question-reveal-text")).toHaveText(question.modelAnswer);

  const itemsBefore = (await readBoard(page)).items.length;
  await cont.click();
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
  // Indigestion piles unanswered science items onto the board.
  await expect.poll(async () => (await readBoard(page)).items.length).toBeGreaterThan(itemsBefore);
});
