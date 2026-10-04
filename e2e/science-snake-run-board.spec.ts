import { test, expect } from "@playwright/test";

/**
 * The runs board (runBoard.ts) on the start card: the last four runs,
 * newest first, with a ▲ on every number that beat the run before.
 * Seeded straight into localStorage, the same records recordRun writes.
 */

const run = (score: number, applesEaten: number, questionsCorrect: number, goldenAttempts: number, goldenCorrect: number, achievedAt: number) => ({
  score,
  applesEaten,
  questionsCorrect,
  goldenAttempts,
  goldenCorrect,
  achievedAt,
});

test("the start card shows the last four runs, newest first, with ▲ where a run beat the one before", async ({ page }) => {
  await page.addInitScript(
    (runs) => {
      localStorage.setItem("science-snake-recent-runs", JSON.stringify(runs));
      localStorage.setItem("science-snake-last-run", JSON.stringify(runs[0]));
      localStorage.setItem("science-snake-high-score", JSON.stringify(runs[0]));
    },
    [run(250, 10, 1, 2, 1, 4000), run(120, 12, 2, 0, 0, 3000), run(80, 10, 1, 0, 0, 2000), run(40, 8, 0, 0, 0, 1000)],
  );
  await page.goto("/science-snake.html");
  const board = page.locator("#start-card [data-run-board]");
  await expect(board).toBeVisible();
  const rows = board.locator("tr");
  await expect(rows).toHaveCount(5); // header + 4 runs
  // Latest: 250 points, 2 right (1 room + 1 golden), 10 apples, 2 golden.
  await expect(rows.nth(1).locator("td")).toHaveText(["250 ▲", "2", "10", "2 ▲"]);
  await expect(rows.nth(2).locator("td")).toHaveText(["120 ▲", "2 ▲", "12 ▲", "0"]);
  await expect(rows.nth(4).locator("td")).toHaveText(["40", "0", "8", "0"]);
});

test("with no runs yet, there's no board", async ({ page }) => {
  await page.goto("/science-snake.html");
  await expect(page.locator("#start-card [data-run-board]")).toBeHidden();
});
