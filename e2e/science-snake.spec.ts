import { test, expect, type Page } from "@playwright/test";
import { sweepFullBoardUntilWin, driveToSuffocation, chaseNearestScienceItem, waitForLoseReason } from "./helpers/scienceSnake";

/**
 * Science Snake (BACKLOG.md's "E2E test suite" entry, the last open item
 * for this mechanic). Mirrors idiom-door's own e2e/helpers/ split: real
 * ticks, real spawner, real grading throughout — `helpers/scienceSnake.ts`
 * only reads the game's own test-only DOM hooks (`snakeStatus.ts`'s
 * #snake-status/#board-items) and taps the same on-screen joystick a real
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
  // game *logic* and DOM state, not the mobile joystick's own touch
  // handling (already covered live per BACKLOG.md's mobile-friendliness
  // entries, and by this suite's own lighter tests elsewhere). Desktop
  // only.
  testInfo.skip(testInfo.project.name === "mobile", "logic-only test; see this test's own timeout comment for why it isn't worth doubling on mobile too");

  // The underlying simulation (11 rng seeds against the real game logic)
  // reached WIN_LENGTH in 2-4 *simulated* minutes each time, since a
  // poison apple's permanent 4x growth multiplier does most of the work
  // once one is eaten — but that's luck-dependent (a 10% roll per apple
  // spawn), and without one, growth is only ~1.67 per item encountered on
  // average, needing ~160 encounters at the sweep's own passive rate.
  // This project's own GRID_WIDTH/GRID_HEIGHT doc comment says the board
  // is deliberately sized "to sustain a 10-15 min session" — a full real
  // win is *meant* to take a while, not a testing inconvenience to
  // engineer around. A same-day attempt at speeding this up with an
  // aggressive item-hunting strategy (answer everything correctly/eat
  // every apple instead of just what the safe sweep passively crosses)
  // was reverted: verified against the real game logic, it self-collided
  // in the large majority of simulated runs once the body grew past
  // roughly 20-30 — a flood-fill "how much room does this leave me"
  // check catches the *immediately* obviously-bad moves, but a snake
  // chasing food directly can still walk itself into a shrinking pocket a
  // few moves ahead, which is exactly the well-known reason real
  // "solved snake" bots use a fixed Hamiltonian cycle for the *entire*
  // run rather than switching to greedy chasing once seemingly-safe.
  // That leaves this sweep's own real, wide timing spread as a fact
  // about the feature, not a bug to fix away: 3.5-6.3 minutes locally
  // with an early poison hit, but this test's own actual GitHub Actions
  // run needed more than 39 minutes on *two consecutive* attempts (the
  // full e2e suite contending for the runner's CPU the whole time, per
  // its own "73 passed (1.6h)" total — nearly 4x this project's normal
  // ~25-minute suite time). None of this makes the sweep unsafe — the
  // cycle itself, not speed, is what guarantees it can't self-collide,
  // so a long-enough timeout is a correct fix, not a papered-over one.
  // 90 minutes gives real headroom above the worst case actually
  // observed on the real CI runner; this repo is public, so GitHub
  // Actions minutes aren't a quota concern, just a slower feedback loop
  // for this one test.
  test.setTimeout(90 * 60 * 1000);
  await startGame(page);

  await sweepFullBoardUntilWin(page, 89 * 60 * 1000);

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
