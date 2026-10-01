import { test, expect, type Page } from "@playwright/test";
import { steerBoardTo, stopBoardSteering } from "./helpers/questionFlow";
import { steerRoomTo, stopRoomSteering } from "./helpers/answerRoom";

/**
 * The redesign's question flow on the real game
 * (science-snake.html?answer=room — opt-in until it replaces the typed
 * overlay): eat a science item → ①②③ appear and reveal the question →
 * the ANSWER door → the answer room in the same canvas → back to the
 * board. Real ticks and rules throughout; steering by
 * helpers/questionFlow.ts on the board and helpers/answerRoom.ts in the
 * room.
 */

const flow = (page: Page) => page.locator("#question-flow");

async function openQuestionAndReachRoom(page: Page): Promise<string> {
  await page.goto("/science-snake.html?answer=room");
  await page.click("#start-btn");

  await steerBoardTo(page, "science");
  await expect(flow(page)).not.toHaveAttribute("data-question-id", "", { timeout: 60_000 });
  const questionId = (await flow(page).getAttribute("data-question-id"))!;
  await expect(page.locator("#room-panel")).not.toHaveClass(/hidden/);
  await expect(flow(page).locator("span[data-part]")).toHaveCount(3);

  await steerBoardTo(page, "part");
  await expect(flow(page)).toHaveAttribute("data-revealed", "3", { timeout: 90_000 });
  await expect(page.locator("#room-panel .question-parts p")).toHaveCount(3);
  await expect(flow(page).locator("span[data-door]")).toHaveCount(6, { timeout: 10_000 });
  await expect(page.locator("#door-hint")).toBeVisible();

  await steerBoardTo(page, "door");
  await expect(page.locator("#room-panel-title")).toHaveText("Build the answer", { timeout: 60_000 });
  await stopBoardSteering(page);
  return questionId;
}

test("science item → ①②③ → ANSWER door → answer room → sentence built → back on the board, one question answered", async ({ page }) => {
  test.setTimeout(240_000);
  await openQuestionAndReachRoom(page);

  await steerRoomTo(page, "right");
  await expect(page.locator("#room-panel")).toHaveClass(/hidden/, { timeout: 120_000 });
  await stopRoomSteering(page);
  await expect(flow(page)).toHaveAttribute("data-questions-correct", "1");
  await expect(flow(page)).toHaveAttribute("data-question-id", "");
  // Back on the main board after the 3-2-1.
  await expect(page.locator("#countdown")).toHaveText("", { timeout: 5_000 });
});

test("a wrong blue apple sends the snake back to the board with the question and door still there", async ({ page }) => {
  test.setTimeout(240_000);
  const questionId = await openQuestionAndReachRoom(page);

  await steerRoomTo(page, "wrong");
  await expect(page.locator("#wrong-choice-card")).toHaveClass(/visible/, { timeout: 120_000 });
  await stopRoomSteering(page);
  await page.click("#wrong-choice-btn");

  await expect(page.locator("#question-reading")).toBeVisible();
  await expect(flow(page)).toHaveAttribute("data-question-id", questionId);
  await expect(flow(page)).toHaveAttribute("data-questions-correct", "0");
  await expect(flow(page).locator("span[data-door]")).toHaveCount(6);
});
