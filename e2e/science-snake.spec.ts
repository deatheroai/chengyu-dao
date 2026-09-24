import { test, expect, type Page } from "@playwright/test";
import { sweepFullBoardUntilWin, driveToSuffocation, chaseNearestScienceItem, waitForLoseReason } from "./helpers/scienceSnake";

/**
 * Science Snake (BACKLOG.md's "E2E test suite" entry, the last open item
 * for this mechanic). Mirrors idiom-door's own e2e/helpers/ split: real
 * ticks, real spawner, real grading throughout — `helpers/scienceSnake.ts`
 * only reads the game's own test-only DOM hooks (`snakeStatus.ts`'s
 * #snake-status/#board-items) and clicks the same on-screen D-pad a real
 * child would tap, the same "expose canvas-internal state as a hidden
 * data attribute, then steer through the real UI" approach idiom-door's
 * own #player-position/#balloon-target-positions already use.
 *
 * The win and suffocation playthroughs are both driven by strategies
 * verified quantitatively against the real snakeGrid.ts/itemSpawner.ts/
 * suffocation.ts logic (a throwaway Node simulation, not just reasoned
 * about) before being wired into these slower, real-browser tests — see
 * scienceSnake.ts's own doc comments for what was checked and why.
 */

async function startGame(page: Page): Promise<void> {
  await page.goto("/science-snake.html");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
  await page.click("#start-btn");
  await expect(page.locator("#start-card")).not.toHaveClass(/visible/);
}

test("a full winning playthrough fills the board", async ({ page }, testInfo) => {
  // Real per-run time here has a wide, RNG-driven spread (see the sweep
  // budget's own comment below) — running this on both projects would
  // double an already-large worst case for no real benefit: it exercises
  // game *logic* and DOM state, not the mobile D-pad's own touch
  // handling (already covered live per BACKLOG.md's mobile-friendliness
  // entries, and by this suite's own lighter tests elsewhere). Desktop
  // only.
  testInfo.skip(testInfo.project.name === "mobile", "logic-only test; see this test's own timeout comment for why it isn't worth doubling on mobile too");

  // The underlying simulation (11 rng seeds against the real game logic)
  // reached WIN_LENGTH in 2-4 *simulated* minutes each time, since a
  // poison apple's permanent 4x growth multiplier does most of the work
  // once one is eaten — but that's luck-dependent (a 10% roll per apple
  // spawn). Real runs measured live show a genuinely wide spread: as
  // fast as 3.5-6.3 minutes with an early poison hit, but a run without
  // one is much slower (without it, growth is only ~1.67 per item
  // encountered on average, needing ~160 encounters at the sweep's own
  // passive rate), and CPU contention from other e2e tests running at
  // the same time (this sandbox's own real, reproduced behavior — a run
  // that took 4.3 minutes alone needed over 27 minutes racing another
  // slow test) stacks on top of that. None of this makes the sweep
  // unsafe (the cycle itself, not speed, is what guarantees it can't
  // self-collide) — just slow in the worst case. 40 minutes covers the
  // real worst case observed plus contention headroom; CI's own
  // retries:1 (playwright.config.ts) gives a second, likely
  // less-contended attempt on top of that if one run is still unlucky.
  test.setTimeout(40 * 60 * 1000);
  await startGame(page);

  await sweepFullBoardUntilWin(page, 39 * 60 * 1000);

  await expect(page.locator("#win-card")).toHaveClass(/visible/);
  const stats = await page.locator("#win-stats").textContent();
  expect(stats).toMatch(/apples/);
  expect(stats).toMatch(/points/);

  // "Play again" actually restarts, rather than leaving a stale win card up.
  await page.click("#win-play-again-btn");
  await expect(page.locator("#win-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#start-card")).not.toHaveClass(/visible/);
});

test("repeated wrong answers pile up unresolved questions until the board suffocates", async ({ page }, testInfo) => {
  // Same "logic/DOM, not mobile touch-input, doesn't need doubling"
  // reasoning as the win playthrough above.
  testInfo.skip(testInfo.project.name === "mobile", "logic-only test, desktop covers it");

  // From the same simulation: suffocation was reached within 50 real
  // seconds of game time across 400 rng seeds, 0 self-collisions. Real
  // isolated runs measured live took 6.1-6.8 minutes, but — same
  // contention finding as the win test above — racing another slow e2e
  // test in this sandbox pushed two consecutive attempts past 11 minutes
  // without finishing. 20 minutes covers that with real headroom; CI's
  // own retries:1 gives a second, likely less-contended attempt too.
  test.setTimeout(20 * 60 * 1000);
  await startGame(page);

  await driveToSuffocation(page, 19 * 60 * 1000);

  await waitForLoseReason(page, "unanswered questions piled up");
  const stats = await page.locator("#lose-stats").textContent();
  expect(stats).toMatch(/correct answers/);
});

test("the reveal overlay's Continue is gated behind stepping through every chunk, not present from the start", async ({ page }) => {
  test.setTimeout(60000);
  await startGame(page);

  await chaseNearestScienceItem(page);
  await expect(page.locator("#question-overlay")).toHaveClass(/visible/);

  const continueBtn = page.locator("#question-reveal-continue-btn");
  const nextBtn = page.locator("#question-reveal-next-btn");
  const revealText = page.locator("#question-reveal-text");

  // Wrong once: hint appears, no reveal yet.
  await page.fill("#question-input", "I am not sure about this one and would rather just guess something here.");
  await page.click("#question-submit-btn");
  await expect(page.locator("#question-hint")).not.toHaveClass(/hidden/);
  await expect(page.locator("#question-reveal")).toHaveClass(/hidden/);

  // Wrong twice: reveal section opens with its first chunk already
  // shown (not blank) — Continue must be hidden immediately, before any
  // "Next" tap.
  await page.fill("#question-input", "I am not sure about this one and would rather just guess something here.");
  await page.click("#question-submit-btn");
  await expect(page.locator("#question-reveal")).not.toHaveClass(/hidden/);
  await expect(continueBtn).toHaveClass(/hidden/);
  const firstChunkText = await revealText.textContent();
  expect(firstChunkText?.trim().length).toBeGreaterThan(0);

  // Step through every remaining chunk. Continue must stay hidden until
  // the very last one — the actual point of this mechanic, not
  // incidental UI (per BACKLOG.md's "enforce reading instead of skipping
  // away").
  let steps = 0;
  while (await nextBtn.isVisible()) {
    await expect(continueBtn).toHaveClass(/hidden/);
    const before = await revealText.textContent();
    await nextBtn.click();
    await expect(revealText).not.toHaveText(before ?? "");
    steps++;
    if (steps > 20) throw new Error("reveal never finished — isFullyRevealed likely stuck");
  }
  expect(steps).toBeGreaterThan(0);

  // Only now, once every chunk has been shown, does Continue appear.
  await expect(continueBtn).not.toHaveClass(/hidden/);
  await continueBtn.click();
  await expect(page.locator("#question-overlay")).not.toHaveClass(/visible/);
});
