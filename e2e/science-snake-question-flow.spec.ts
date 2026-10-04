import { test, expect, type Page } from "@playwright/test";
import { steerBoardTo, stopBoardSteering } from "./helpers/questionFlow";
import { steerRoomTo, stopRoomSteering } from "./helpers/answerRoom";
import { answerRoomContent } from "../src/science-snake/answerRoomContent";
import { scienceQuestionsById } from "../src/science-snake/scienceQuestions";

/**
 * The redesign's question flow on the real game
 * (science-snake.html): eat a science item → eat the question phrase by phrase →
 * the ANSWER door → the answer room in the same canvas → back to the
 * board. Real ticks and rules throughout; steering by
 * helpers/questionFlow.ts on the board and helpers/answerRoom.ts in the
 * room.
 */

const flow = (page: Page) => page.locator("#question-flow");

/** Eats a science item and every phrase of its question, up to the ANSWER door (and golden apples) appearing. */
async function openQuestionToDoor(page: Page): Promise<string> {
  await page.goto("/science-snake.html");
  await page.click("#start-btn");

  await steerBoardTo(page, "science");
  await expect(flow(page)).not.toHaveAttribute("data-question-id", "", { timeout: 60_000 });
  const questionId = (await flow(page).getAttribute("data-question-id"))!;
  await expect(page.locator("#room-panel")).toHaveAttribute("data-mode", "reading");
  // One phrase apple at a time.
  await expect(flow(page).locator("span[data-phrase]")).toHaveCount(1);

  await steerBoardTo(page, "phrase");
  await expect(flow(page).locator("span[data-door]")).toHaveCount(6, { timeout: 150_000 });
  await expect(flow(page)).toHaveAttribute("data-eaten", (await flow(page).getAttribute("data-phrases"))!);
  // The bar has built the whole question, phrase by phrase.
  await expect(page.locator("#question-built")).toContainText(answerRoomContent[questionId].questionParts[2]);
  await expect(page.locator("#door-hint")).toBeVisible();
  // Two golden apples, above and below the door's middle letter.
  await expect(flow(page).locator("span[data-golden]")).toHaveCount(2);
  return questionId;
}

async function openQuestionAndReachRoom(page: Page): Promise<string> {
  const questionId = await openQuestionToDoor(page);
  await steerBoardTo(page, "door");
  await expect(page.locator("#room-panel")).toHaveAttribute("data-mode", "room", { timeout: 60_000 });
  // The whole question sits in the middle of the board during the countdown.
  await expect(page.locator("#room-intro")).toBeVisible();
  await expect(page.locator("#room-intro .question-parts p")).toHaveCount(3);
  await expect(page.locator("#room-intro")).toBeHidden({ timeout: 10_000 });
  await stopBoardSteering(page);
  return questionId;
}

test("science item → question phrases → ANSWER door → answer room → sentence built → back on the board, one question answered", async ({ page }) => {
  test.setTimeout(240_000);
  await openQuestionAndReachRoom(page);

  await steerRoomTo(page, "right");
  await expect(page.locator("#room-panel")).toHaveAttribute("data-mode", "idle", { timeout: 120_000 });
  await stopRoomSteering(page);
  await expect(flow(page)).toHaveAttribute("data-questions-correct", "1");
  await expect(flow(page)).toHaveAttribute("data-question-id", "");
  // Back on the main board after the 3-2-1.
  await expect(page.locator("#countdown")).toHaveText("", { timeout: 5_000 });
});

test("a wrong blue apple sends the snake back to the board, doubled and muddy, with the question and door still there", async ({ page }) => {
  test.setTimeout(240_000);
  const questionId = await openQuestionAndReachRoom(page);
  const lengthBefore = Number(await page.locator("#snake-status").getAttribute("data-length"));

  await steerRoomTo(page, "wrong");
  await expect(page.locator("#wrong-choice-card")).toHaveClass(/visible/, { timeout: 120_000 });
  await stopRoomSteering(page);
  await page.click("#wrong-choice-btn");

  await expect(page.locator("#room-panel")).toHaveAttribute("data-mode", "reading");
  await expect(page.locator("#door-hint")).toBeVisible();
  await expect(flow(page)).toHaveAttribute("data-question-id", questionId);
  await expect(flow(page)).toHaveAttribute("data-questions-correct", "0");
  await expect(flow(page).locator("span[data-door]")).toHaveCount(6);
  // The punishment: muddy until the question is answered, and twice as long once the owed growth has played out.
  await expect(flow(page)).toHaveAttribute("data-muddy", "true");
  await expect
    .poll(async () => Number(await page.locator("#snake-status").getAttribute("data-length")), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(lengthBefore * 2);
});

test("the question bar keeps one height, so the board never changes size as the question comes and goes", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/science-snake.html");
  const height = () => page.locator("#game-container").evaluate((el) => Math.round(el.getBoundingClientRect().height));
  const before = await height();
  await page.click("#start-btn");
  await steerBoardTo(page, "science");
  await expect(flow(page)).not.toHaveAttribute("data-question-id", "", { timeout: 60_000 });
  await steerBoardTo(page, "phrase");
  await expect(flow(page).locator("span[data-door]")).toHaveCount(6, { timeout: 150_000 });
  await stopBoardSteering(page);
  expect(await height()).toBe(before);
});

test("a golden apple: typing the whole answer right clears the question for +150, and the snake turns golden", async ({ page }) => {
  test.setTimeout(240_000);
  const questionId = await openQuestionToDoor(page);

  await steerBoardTo(page, "golden");
  await expect(page.locator("#golden-card")).toHaveClass(/visible/, { timeout: 60_000 });
  await stopBoardSteering(page);
  // Both golden apples go once one is eaten; the question is shown, not the answer.
  await expect(flow(page).locator("span[data-golden]")).toHaveCount(0);
  await expect(page.locator("#golden-question")).toHaveText(scienceQuestionsById[questionId].prompt);

  await page.fill("#golden-input", scienceQuestionsById[questionId].modelAnswer);
  await page.click("#golden-submit-btn");
  await expect(page.locator("#golden-title")).toHaveText("✨ Golden answer!");
  await page.click("#golden-continue-btn");

  await expect(page.locator("#golden-card")).not.toHaveClass(/visible/);
  await expect(flow(page)).toHaveAttribute("data-golden-correct", "1");
  await expect(flow(page)).toHaveAttribute("data-questions-correct", "0");
  await expect(flow(page)).toHaveAttribute("data-question-id", "");
  await expect(page.locator("#room-panel")).toHaveAttribute("data-mode", "idle");
  await expect(page.locator("#countdown")).toHaveText("", { timeout: 5_000 });
});

test("a golden apple: a wrong answer shows the clue, and the ANSWER door is still there without the golden apples", async ({ page }) => {
  test.setTimeout(240_000);
  const questionId = await openQuestionToDoor(page);

  await steerBoardTo(page, "golden");
  await expect(page.locator("#golden-card")).toHaveClass(/visible/, { timeout: 60_000 });
  await stopBoardSteering(page);

  await page.fill("#golden-input", "I am not sure what happens here.");
  await page.click("#golden-submit-btn");
  await expect(page.locator("#golden-title")).toHaveText("Not quite!");
  await expect(page.locator("#golden-hint")).toContainText(scienceQuestionsById[questionId].hint);
  await page.click("#golden-continue-btn");

  await expect(page.locator("#golden-card")).not.toHaveClass(/visible/);
  await expect(flow(page)).toHaveAttribute("data-question-id", questionId);
  await expect(flow(page)).toHaveAttribute("data-golden-correct", "0");
  await expect(flow(page).locator("span[data-door]")).toHaveCount(6);
  await expect(flow(page).locator("span[data-golden]")).toHaveCount(0);
  await expect(page.locator("#door-hint")).toBeVisible();
  await expect(page.locator("#door-hint-golden")).toBeHidden();
});
