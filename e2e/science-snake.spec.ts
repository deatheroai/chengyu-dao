import { test, expect } from "@playwright/test";
import { steerToItem, playUntilEnded, readSnakeState } from "./helpers/snakeNav";

/**
 * BACKLOG.md's "E2E test suite (e2e/science-snake*.spec.ts)" entry:
 * mirrors idiom-door's e2e/helpers/ pattern — steer for real off a live
 * DOM mirror of otherwise canvas-only state (src/science-snake/
 * gameStatus.ts), never a scripted/precomputed path.
 *
 * science-snake's own real win/suffocation thresholds (WIN_LENGTH: 269
 * cells; SUFFOCATION_THRESHOLD_RATIO: 192 unresolved questions) are sized
 * for an actual multi-minute play session, not a CI run — so the win and
 * suffocation tests below use SnakeGameSceneData's own dev/e2e-only
 * override knobs (src/science-snake/main.ts's devNumberOverride) to make
 * those thresholds reachable in a handful of real moves. Every mechanic
 * that matters is still exercised for real either way: movement, growth,
 * collision, item spawning, question grading, the win/suffocation
 * predicates themselves, and the resulting card + high-score write —
 * only the pass/fail *threshold* is test data, same as a unit test
 * building a small board by hand instead of a production-sized one.
 */

const WRONG_ANSWER = "The cat sat on the old mat because it was feeling very tired again today.";

test("reveals the model answer in gated chunks after two wrong tries, and Continue only appears once every chunk has been shown", async ({ page }) => {
  await page.goto("/science-snake.html");
  await page.click("#start-btn");

  await steerToItem(page, (item) => item.type === "science");

  const overlay = page.locator("#question-overlay");
  await expect(overlay).toHaveClass(/visible/);

  // First wrong try: hint appears, a second try is offered.
  await page.fill("#question-input", WRONG_ANSWER);
  await page.click("#question-submit-btn");
  await expect(page.locator("#question-hint")).not.toHaveClass(/hidden/);
  await expect(page.locator("#question-ask-form")).not.toHaveClass(/hidden/);

  // Second wrong try: moves into the word-chunk reveal.
  await page.fill("#question-input", WRONG_ANSWER);
  await page.click("#question-submit-btn");
  await expect(page.locator("#question-reveal")).not.toHaveClass(/hidden/);
  await expect(page.locator("#question-ask-form")).toHaveClass(/hidden/);

  const nextBtn = page.locator("#question-reveal-next-btn");
  const continueBtn = page.locator("#question-reveal-continue-btn");

  // The mechanic's actual point (BACKLOG.md): Continue must not be
  // reachable before every chunk has been stepped through via Next, not
  // just present in the DOM from the start.
  await expect(continueBtn).toBeHidden();
  await expect(nextBtn).toBeVisible();

  let revealTaps = 0;
  while (await nextBtn.isVisible()) {
    await expect(continueBtn).toBeHidden();
    await nextBtn.click();
    revealTaps += 1;
    if (revealTaps > 20) throw new Error("reveal never finished stepping through every chunk");
  }
  expect(revealTaps).toBeGreaterThan(0);
  await expect(continueBtn).toBeVisible();

  await continueBtn.click();
  await expect(overlay).not.toHaveClass(/visible/);
});

test("a real winning playthrough shows the win card and records the high score", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/science-snake.html");
  await page.evaluate(() => localStorage.setItem("science-snake-dev-win-length-override", "8"));
  await page.reload();
  await page.click("#start-btn");

  // Only ever targets apples/poison-apples, not science items — this
  // test is about the win path, not the question flow (covered above).
  const finalState = await playUntilEnded(page, (item) => item.type !== "science");
  expect(finalState.outcome).toBe("win");

  await expect(page.locator("#win-card")).toHaveClass(/visible/);
  const winStats = await page.locator("#win-stats").textContent();
  expect(winStats).toMatch(/apples/i);

  const highScoreText = await page.locator("#high-score-display").textContent();
  expect(highScoreText).toContain("High score");
});

test("a real suffocation-loss playthrough — wrong answers piling up unresolved questions — shows the lose card", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/science-snake.html");
  // 3/384: exactly what one wrong-twice ("indigestion") resolution piles
  // on from this game's guaranteed single starting science item (removed
  // on pickup, INDIGESTION_SPAWN_COUNT=3 added back) — see
  // itemSpawner.ts's spawnIndigestionPileOn. Low enough that a single
  // real wrong-twice cycle crosses it, without depending on however many
  // science items happen to be on the board from ordinary steady-state
  // spawning at the moment this run starts.
  await page.evaluate(() => localStorage.setItem("science-snake-dev-suffocation-ratio-override", String(3 / 384)));
  await page.reload();
  await page.click("#start-btn");

  await steerToItem(page, (item) => item.type === "science");

  const overlay = page.locator("#question-overlay");
  await expect(overlay).toHaveClass(/visible/);

  await page.fill("#question-input", WRONG_ANSWER);
  await page.click("#question-submit-btn");
  await page.fill("#question-input", WRONG_ANSWER);
  await page.click("#question-submit-btn");
  await expect(page.locator("#question-reveal")).not.toHaveClass(/hidden/);

  const nextBtn = page.locator("#question-reveal-next-btn");
  const continueBtn = page.locator("#question-reveal-continue-btn");
  let revealTaps = 0;
  while (await nextBtn.isVisible()) {
    await nextBtn.click();
    revealTaps += 1;
    if (revealTaps > 20) throw new Error("reveal never finished stepping through every chunk");
  }
  await continueBtn.click();
  await expect(overlay).not.toHaveClass(/visible/);

  const loseCard = page.locator("#lose-card");
  await expect(loseCard).toHaveClass(/visible/, { timeout: 10000 });
  const state = await readSnakeState(page);
  expect(state.outcome).toBe("suffocation");
  const loseStats = await page.locator("#lose-stats").textContent();
  expect(loseStats).toMatch(/apples/i);
});
