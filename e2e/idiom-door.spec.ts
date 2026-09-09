import { test, expect, type Page, type Locator } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";
import { balloonLevels } from "../src/idiom-door/balloonLevelContent";
import { JUMP_HP_COST, WRONG_CATCH_HP_PENALTY } from "../src/idiom-door/doorHp";
import { completeMatchStage } from "./helpers/idiomMatch";
import { traceWholeIdiomPerfectly } from "./helpers/writingStage";
import { solveDoorLevel, catchCharacter, jumpForTile, pressJumpButton, takeoffXForTile } from "./helpers/doorJump";

/**
 * Auto-runner puzzle (CATCH_MECHANIC_PLAN.md's 2026-08-23 revision):
 * the character runs forward on its own — no left/right control, no
 * separate grab button — and jumping is the one action, catching
 * whatever floating character it reaches automatically.
 *
 * Each level now opens with a full-screen intro card showing the
 * meaning (2026-08-23's follow-up feedback), then — 2026-09-09's
 * writing/tracing stage (BACKLOG.md) — each of the idiom's own 4
 * characters shown one at a time for the child to trace, before the
 * door scene actually starts. `helpers/writingStage.ts`'s
 * `traceWholeIdiomPerfectly` drives that with *real* freehand pointer
 * strokes along each character's own bundled median stroke points
 * (writingStrokeData.ts) — genuine input through hanzi-writer's own
 * stroke matching, landing with 0 mistakes every time (confirmed
 * during development), so every test below opens its door stage at
 * the full `PERFECT_TRACE_STARTING_HP` (writingScore.ts) unless it's
 * deliberately testing the HP economy itself.
 *
 * That HP is a *real* gate on jumping (doorHp.ts) — this suite's
 * earlier "just spam JUMP on an interval" strategy (most jumps landing
 * on nothing at all) would burn through a level's whole HP pool long
 * before catching every character, so `helpers/doorJump.ts` replaces
 * it with *aimed* jumps: each tile's own already-known, deterministic
 * world position (levelContent.ts) plus the door stage's own exported
 * jump physics (runPhysics.ts) work out exactly when to press jump for
 * a given tile, the same way `flyUntilResolved` below steers directly
 * to a balloon's live position rather than guessing a blind search
 * pattern. The pure-logic unit tests (orderedCatchProgress.ts,
 * doorHp.ts, writingScore.ts) already cover timing/scoring precisely —
 * this suite's job is confirming the pieces are wired together
 * correctly, not re-proving the logic.
 *
 * 2026-08-24: the session opens with a one-time "join the two halves"
 * match warm-up *before* the first level's own intro (see
 * IdiomMatchScene / matchLevelContent.ts) — every test here calls
 * `completeMatchStage` (e2e/helpers/idiomMatch.ts) right after
 * `page.goto` to get past it quickly, since this suite's job is the
 * writing/door/balloon stages; idiom-match.spec.ts tests the warm-up
 * itself.
 */
async function getPlayerX(page: Page): Promise<number> {
  const attr = await page.locator("#player-position").getAttribute("data-x");
  return Number(attr ?? "0");
}

/** 2026-08-28: hanzi+pinyin throughout this game is now rendered as
 * ruby annotation (rubyText.ts) — pinyin lives in `<rt>` elements
 * *inside* the hanzi container, so a raw `.textContent`/`toHaveText`
 * check picks up interleaved pinyin syllables along with the hanzi,
 * not just the hanzi. This strips `<rt>` content from a clone (never
 * mutating the real page) to recover just the base hanzi text, so
 * assertions can still check "does this element show idiom X" without
 * having to spell out every character's pinyin inline. */
async function rubyBaseText(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("rt").forEach((rt) => rt.remove());
    return clone.textContent ?? "";
  });
}

async function status(page: Page) {
  return page.locator("#door-status").evaluate((el) => ({
    nextIndex: el.getAttribute("data-next-index"),
    complete: el.getAttribute("data-complete"),
  }));
}

// Once `nextIndex`/`complete` flips true, the character still has to
// physically *run* to the door before anything past that point (the
// next intro, or the session summary) appears — and since 2026-08-24's
// randomized 5-9 repeats per character (up from a flat 4), a level's
// track can run up to ~9400px long (levelContent.ts's
// MAX_REPEATS_PER_CHARACTER), which even at this mechanic's (also
// bumped, same feedback round) 320px/s runSpeed is still up to ~30s of
// running if the puzzle happens to complete right at the start of the
// track. This timeout covers that worst case with real headroom,
// rather than a fixed guess sized for the old, much shorter/slower
// tracks (which is exactly what broke here once tracks got longer).
const DOOR_REACH_TIMEOUT_MS = 70000;

/** Asserts the level-intro card is showing a given level's Mandarin
 * clue (hanzi, each character ruby-annotated with its own pinyin —
 * see rubyText.ts), with the English fallback still hidden. */
async function expectIntroShowing(page: Page, levelIndex: number): Promise<void> {
  const idiom = doorLevels[levelIndex].idiom;
  const intro = page.locator("#level-intro-card");
  const zhEl = intro.locator("[data-intro-meaning-zh]");
  await expect(intro).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect.poll(() => rubyBaseText(zhEl)).toBe(idiom.meaningZh.hanzi);
  // At least one character actually got a pinyin annotation, not just
  // the bare hanzi — confirms renderRubyText ran, not only that the
  // (harder to get wrong) plain-text fallback would have looked right.
  await expect(zhEl.locator("rt").first()).not.toHaveText("");
  await expect(intro.locator("[data-intro-meaning-en]")).toBeHidden();
}

/** Dismisses the level-intro screen (reading/thinking pause) so the
 * writing/tracing stage (traceIdiomAndEnterDoor below) actually starts.
 * Every test needs this right after `page.goto()`, and again after
 * every level transition — each new level shows its own intro. The one
 * exception is the in-scene "reached the door unsolved" retrace, which
 * deliberately does *not* re-show the intro. */
async function startPlaying(page: Page): Promise<void> {
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
  await page.click("#start-level-btn");
  await expect(page.locator("#level-intro-card")).not.toHaveClass(/visible/);
}

/**
 * 2026-09-09: traces the level-intro card's idiom (real freehand
 * strokes, see this file's own top doc comment) and waits for the door
 * stage to actually start. Every test that needs the door scene running
 * calls this right after `startPlaying` — the door scene doesn't exist
 * on screen (nor does `#meaning-prompt`/`#door-status` carry this
 * level's content) until the writing stage's last character resolves.
 */
async function traceIdiomAndEnterDoor(page: Page, levelIndex: number): Promise<void> {
  const level = doorLevels[levelIndex];
  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await traceWholeIdiomPerfectly(page, level.idiom.hanzi.length);
  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
}

/** Dismisses the balloon stage's own intro screen (2026-09-07 addition —
 * same reading/thinking pause as startPlaying above, but for the masked
 * sentence this stage's balloons quiz) so BalloonSentenceScene actually
 * starts. Every test needs this right after a door is solved, before
 * expectBalloonStageShowing — the scene (and so its balloons) doesn't
 * exist on screen until Start is pressed here. */
async function startBalloonStage(page: Page, levelIndex: number): Promise<void> {
  const { maskedSentence, idiom } = balloonLevels[levelIndex];
  const card = page.locator("#balloon-intro-card");
  const sentence = card.locator("[data-balloon-intro-sentence]");
  await expect(card).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect.poll(() => rubyBaseText(sentence)).toBe(maskedSentence.hanzi);
  // Same "never hand the child the answer directly" check as
  // expectBalloonStageShowing's smaller in-flight prompt below.
  await expect.poll(() => rubyBaseText(sentence)).not.toContain(idiom.hanzi);
  await page.click("#start-balloon-btn");
  await expect(card).not.toHaveClass(/visible/);
}

/** Asserts the balloon-sentence stage (2026-08-25: a stage after each
 * idiom's door; redesigned 2026-08-26 to show the idiom's own example
 * sentence with the idiom blanked out, rather than naming the idiom
 * directly) is showing for a given level, and starting unresolved. */
async function expectBalloonStageShowing(page: Page, levelIndex: number): Promise<void> {
  const { maskedSentence, idiom } = balloonLevels[levelIndex];
  const prompt = page.locator("#balloon-prompt");
  await expect(page.locator("#balloon-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect.poll(() => rubyBaseText(prompt)).toBe(maskedSentence.hanzi);
  // The blanked sentence never hands the child the answer directly.
  await expect.poll(() => rubyBaseText(prompt)).not.toContain(idiom.hanzi);
  await expect(page.locator("#balloon-status")).toHaveAttribute("data-resolved", "false");
}

/**
 * Balloon positions depend on rendered text measurement and this
 * stage's own scrolling camera, not just content, so — unlike the door
 * puzzle's tiles — a test can't fly toward a known *screen* position
 * from content alone. 2026-08-26: rather than guessing a blind search
 * pattern (tried a fixed zigzag, then screen-corner waypoints, then
 * directional holds — none reliably covered an arbitrarily-sized/
 * shaped grid within a sane timeout), this steers directly to the
 * correct balloon's real position, continuously re-read from the
 * `#balloon-target-positions`/`#balloon-camera-scroll` test-only hooks
 * (balloonPositionStatus.ts) and converted from world to screen space
 * — same "expose the exact position, drag deterministically" approach
 * idiom-match.spec.ts's dragMatchTile already uses for match tiles, just
 * re-read every beat here since a balloon keeps drifting *and* the
 * camera keeps re-centering, unlike a match tile's fixed position.
 *
 * 2026-08-28: clamped to just inside the canvas's own bounds. Once the
 * game started drawing its door/balloon session from a rotating
 * selection of idioms (sessionIdioms.ts) rather than the same fixed 3
 * every time, some layouts put the correct balloon far enough from the
 * avatar's starting position that the naive world→screen conversion
 * lands off-canvas (negative, or past the canvas's own width/height) on
 * the first cycle or two, before the camera has scrolled to follow. A
 * real finger/mouse can't click outside the screen either — it would
 * just drag to the nearest edge in that direction, and the *next*
 * cycle's re-read (as the avatar/camera catch up) converges from there,
 * same as this now does. Confirmed via a reproduction against a session
 * that reliably hit this (jing-di-zhi-wa / ban-tu-er-fei /
 * yan-er-you-xin, 2026-08-28): unclamped, the aim point stayed stuck
 * off-canvas cycle after cycle and never resolved within the timeout;
 * clamped, it converged in ~2.5s.
 */
async function correctBalloonScreenPosition(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
): Promise<{ x: number; y: number }> {
  const target = page.locator('#balloon-target-positions span[data-correct="true"]');
  const wx = Number(await target.getAttribute("data-x"));
  const wy = Number(await target.getAttribute("data-y"));
  const scrollX = Number(await page.locator("#balloon-camera-scroll").getAttribute("data-x"));
  const scrollY = Number(await page.locator("#balloon-camera-scroll").getAttribute("data-y"));
  const rawX = box.x + (wx - scrollX);
  const rawY = box.y + (wy - scrollY);
  return {
    x: Math.min(Math.max(rawX, box.x + 1), box.x + box.width - 1),
    y: Math.min(Math.max(rawY, box.y + 1), box.y + box.height - 1),
  };
}

// Generous relative to how fast this actually resolves in practice
// (well under a second of real dragging once aimed) — the slack is for
// CPU contention under parallel test load, not aiming uncertainty: this
// steers directly to the correct balloon's live position every beat
// (see correctBalloonScreenPosition above), so a longer timeout here
// costs nothing when things go normally and only matters as headroom
// when they don't. Presses and releases once per cycle (rather than one
// continuous hold micro-adjusted every beat) — a fresh, decisive
// press-move-hold-release, same shape as the already-reliable "dragging
// the pointer" test elsewhere in this file — proved more robust than a
// single long-held drag with many intermediate moves.
async function flyUntilResolved(page: Page, maxMs = 45000): Promise<void> {
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  const isResolved = async (): Promise<boolean> => (await page.locator("#balloon-status").getAttribute("data-resolved")) === "true";

  const CYCLE_MS = 2000;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const pos = await correctBalloonScreenPosition(page, box);
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    let resolved = false;
    try {
      const cycleDeadline = Math.min(deadline, Date.now() + CYCLE_MS);
      while (Date.now() < cycleDeadline) {
        await page.waitForTimeout(150);
        if (await isResolved()) {
          resolved = true;
          break;
        }
      }
    } finally {
      await page.mouse.up();
    }
    if (resolved) return;
  }
  throw new Error("flyUntilResolved timed out");
}

/** Asserts the 2026-08-28 success card (congratulations + meaning/
 * example recap, shown after a correct balloon catch, before advancing)
 * is showing the right idiom's content. */
async function expectBalloonSuccessCardShowing(page: Page, levelIndex: number): Promise<void> {
  const idiom = balloonLevels[levelIndex].idiom;
  const card = page.locator("#balloon-success-card");
  await expect(card).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect.poll(() => rubyBaseText(card.locator("[data-success-hanzi]"))).toBe(idiom.hanzi);
  await expect.poll(() => rubyBaseText(card.locator("[data-success-meaning-zh]"))).toBe(idiom.meaningZh.hanzi);
  await expect.poll(() => rubyBaseText(card.locator("[data-success-sentence]"))).toBe(idiom.exampleSentence.hanzi);
  // Each hanzi line actually got ruby-annotated, not just left plain.
  await expect(card.locator("[data-success-hanzi] rt").first()).not.toHaveText("");
}

/** Dismisses the success card so the session actually advances — the
 * card gates that the same way level-intro-card's Start button gates
 * a level beginning (2026-08-28: tap to continue, not a timer). */
async function continueFromBalloonSuccess(page: Page): Promise<void> {
  await page.click("#balloon-continue-btn");
  await expect(page.locator("#balloon-success-card")).not.toHaveClass(/visible/);
}

/**
 * 2026-08-27 regression: the dev-only #dev-controls block (bottom-right)
 * used to visually and functionally overlap #jump-btn (bottom-*center*,
 * but wide enough that its own right edge reaches well into the right
 * side of a typical mobile viewport) — a real child could accidentally
 * tap "Seed history"/"Clear history" instead of jumping, per your
 * report. Confirmed via bounding boxes, not just visually, since a
 * small pixel overlap is easy to miss in a screenshot.
 */
test("the dev-only controls never overlap the jump button", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);

  const jumpBox = await page.locator("#jump-btn").boundingBox();
  const devBox = await page.locator("#dev-controls").boundingBox();
  if (!jumpBox || !devBox) throw new Error("missing bounding box");

  const overlapsHorizontally = jumpBox.x < devBox.x + devBox.width && devBox.x < jumpBox.x + jumpBox.width;
  const overlapsVertically = jumpBox.y < devBox.y + devBox.height && devBox.y < jumpBox.y + jumpBox.height;
  expect(overlapsHorizontally && overlapsVertically).toBe(false);
});

/** 2026-09-07: sessionIdioms.ts's real rotation is once a day — a
 * tester replaying the game many times in one sitting was otherwise
 * stuck seeing the same 3 idioms ("I am getting bored testing on these
 * three idioms"). Confirms the dev-only reroll override actually lands
 * in localStorage and back out again, and that "Clear history" reverts
 * the *content itself* (not just the override key) to today's
 * deterministic set — not just that the mechanism runs without error. */
test("the dev 'new idioms' control rerolls this session's idiom set, and 'clear history' reverts it to today's normal set", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/idiom-door.html");
  const readOverride = () => page.evaluate(() => localStorage.getItem("chengyu-dao-dev-idiom-seed-override"));
  expect(await readOverride()).toBeNull();

  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  const todaysMeaning = await page.locator("#meaning-prompt").textContent();

  // Both dev buttons below reload the page (main.ts's wireDevControls).
  // Each click is followed by an auto-retrying `expect(locator)` — not a
  // one-shot `page.evaluate` — specifically so it absorbs that reload's
  // timing the same way every other dev-control test in this file does;
  // a bare `page.evaluate` right after `click()` can race the in-flight
  // navigation and read stale (pre-reload) state.
  await page.click("#dev-reroll-idioms-btn");
  await expect(page.locator("#match-intro-card")).toHaveClass(/visible/);
  expect(await readOverride()).not.toBeNull();

  await page.click("#dev-clear-history-btn");
  await expect(page.locator("#match-intro-card")).toHaveClass(/visible/);
  expect(await readOverride()).toBeNull();

  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await expect(page.locator("#meaning-prompt")).toHaveText(todaysMeaning ?? "");
});

test("shows a full-screen intro with the meaning before the level starts, and nothing moves until Start is pressed", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await expect(page.locator("#game-container canvas")).toBeVisible();

  await expectIntroShowing(page, 0);

  const x1 = await getPlayerX(page);
  await page.waitForTimeout(500);
  const x2 = await getPlayerX(page);
  expect(x2).toBe(x1); // frozen behind the intro card, no auto-run yet

  await startPlaying(page);
  // 2026-09-09: the writing stage runs next, before the door scene
  // itself — still nothing moving (there's no door scene running yet
  // to move).
  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/);
  const x3 = await getPlayerX(page);
  await page.waitForTimeout(500);
  const x4 = await getPlayerX(page);
  expect(x4).toBe(x3); // still frozen — tracing hasn't finished yet

  await traceIdiomAndEnterDoor(page, 0);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });

  const x5 = await getPlayerX(page);
  await page.waitForTimeout(500);
  const x6 = await getPlayerX(page);
  expect(x6).toBeGreaterThan(x5); // now running forward on its own, no input needed
});

test("the intro's English explanation stays hidden until the 🤔 icon is tapped", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  const intro = page.locator("#level-intro-card");
  const englishEl = intro.locator("[data-intro-meaning-en]");
  await expect(englishEl).toBeHidden();

  await page.click("#reveal-english-btn");
  await expect(englishEl).toBeVisible();
  await expect(englishEl).toHaveText(`"${doorLevels[0].idiom.meaning}"`);
});

test("running without ever jumping never catches anything", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await page.waitForTimeout(4000); // several floating characters would have been run past by now
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("a well-timed jump catches the correct next character", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await catchCharacter(page, doorLevels[0], 0);
  expect((await status(page)).nextIndex).not.toBe("0");
});

/** 2026-09-09: doorHp.ts's real HP gate — earned from the writing stage
 * (100 here, since traceIdiomAndEnterDoor traces perfectly), spent per
 * jump, with an extra penalty on top for a jump that lands on the
 * *wrong* character. */
test("each jump costs HP, and a wrong catch costs extra on top", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  const level = doorLevels[0];

  await expect(page.locator("#door-hp")).toHaveAttribute("data-hp", "100");

  await catchCharacter(page, level, 0);
  const afterOneCatch = 100 - JUMP_HP_COST;
  await expect(page.locator("#door-hp")).toHaveAttribute("data-hp", String(afterOneCatch));

  // Deliberately jump for a tile that does *not* match the next-needed
  // character — guaranteed "wrong" per orderedCatchProgress.ts's strict
  // ordering, whichever character it actually belongs to. Its own real
  // *takeoff* point (not just `tile.x`) needs to be safely ahead of the
  // runner — a tile whose takeoff point (up to ~80px *before* `tile.x`,
  // see takeoffXForTile) already fell behind the runner would make
  // `jumpForTile` press immediately/late and badly mistimed, risking a
  // clean miss rather than the deliberate wrong catch this test needs.
  //
  // levelContent.ts packs every slot (no gaps — SLOT_WIDTH±SLOT_JITTER
  // puts adjacent tiles as close as MIN_SLOT_GAP, 110px), tighter than
  // one jump's own ~190px ground footprint (confirmed live: even a
  // precisely-*aimed* jump can chain-catch a densely-packed neighbor a
  // frame before or after the intended tile — `checkCatches` runs every
  // frame of the whole arc, not once at takeoff, so this is real game
  // behavior, not an aiming bug). So rather than asserting one *exact*
  // resulting HP (fragile against however many neighbors a given day's
  // level layout happens to pack in), this only asserts what's
  // guaranteed regardless of how many extra tiles a wide/lucky arc
  // happens to sweep up: at least the one deliberate wrong catch's own
  // full cost (`JUMP_HP_COST` + `WRONG_CATCH_HP_PENALTY`) came off, and
  // progress never advances from a catch that wasn't the correct
  // character (whether the one aimed at or a chained-in neighbor).
  const nextChar = Array.from(level.idiom.hanzi)[1];
  const currentX = await getPlayerX(page);
  const wrongTile = level.tiles
    .filter((t) => t.char !== nextChar && takeoffXForTile(t) > currentX + 30)
    .sort((a, b) => a.x - b.x)[0];
  if (!wrongTile) throw new Error("expected a reachable non-matching tile ahead of the runner in this level");

  await jumpForTile(page, wrongTile);
  await expect(page.locator("#door-status")).toHaveAttribute("data-outcome", "wrong", { timeout: 5000 });
  // Let the frame(s) right after the press finish resolving (see
  // catchCharacter's own use of the same short settle wait) before
  // reading a final HP value to assert against.
  await page.waitForTimeout(500);
  const hpAfterWrongCatch = Number(await page.locator("#door-hp").getAttribute("data-hp"));
  expect(hpAfterWrongCatch).toBeLessThanOrEqual(afterOneCatch - JUMP_HP_COST - WRONG_CATCH_HP_PENALTY);
  // The wrong catch (or catches) never advanced progress.
  expect((await status(page)).nextIndex).toBe("1");
});

/** 2026-09-09: reaching the door unsolved (BACKLOG.md's "HP: earned
 * from tracing, spent in the door stage, a real gate" entry) now routes
 * back out to retracing this same idiom (a fresh HP pool) rather than
 * an in-place respawn of the same tiles with an already-spent one — see
 * IdiomDoorSceneData.onUnsolvedDoorReached's doc comment. */
test("reaching the door unsolved sends the child back to retrace the same idiom, not the next one", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  const level = doorLevels[0];

  await expect(page.locator("#door-hp")).toHaveAttribute("data-hp", "100");

  // Never jump — the character runs the whole (unsolved) track and hits
  // the closed door.
  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await expect(page.locator("#catch-ui-layer")).toHaveClass(/stage-hidden/);

  // Same idiom, not the next one — no level-intro re-shown, no session
  // progress advanced, same "quick nudge to try again" ethos the old
  // in-place restart had.
  await expect(page.locator("#level-intro-card")).not.toHaveClass(/visible/);
  await expect(page.locator("[data-progress-fraction]")).toHaveText("1/3");
  await expect.poll(() => page.locator("#writing-status").getAttribute("data-char")).toBe(Array.from(level.idiom.hanzi)[0]);

  // Retracing perfectly again opens the door stage at a fresh, full HP
  // pool — not whatever was left of the old one.
  await traceWholeIdiomPerfectly(page, level.idiom.hanzi.length);
  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await expect(page.locator("#door-hp")).toHaveAttribute("data-hp", "100");
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${level.idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("solving a level opens the door into the balloon stage, and resolving that shows the next level's intro; Start begins it", async ({ page }) => {
  test.setTimeout(210000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);

  await solveDoorLevel(page, doorLevels[0]);
  await expect(page.locator("#door-status")).toHaveAttribute("data-complete", "true");

  await startBalloonStage(page, 0);
  await expectBalloonStageShowing(page, 0);
  await flyUntilResolved(page);

  await expectBalloonSuccessCardShowing(page, 0);
  await continueFromBalloonSuccess(page);

  await expectIntroShowing(page, 1);

  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 1);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[1].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });
});

test("the balloon stage shows the sentence with the idiom blanked out, and flying around eventually resolves it", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await solveDoorLevel(page, doorLevels[0]);

  await startBalloonStage(page, 0);
  await expectBalloonStageShowing(page, 0);
  await flyUntilResolved(page);

  await expect(page.locator("#balloon-status")).toHaveAttribute("data-resolved", "true");
  await expect(page.locator("#balloon-status")).toHaveText("That's the one! Great reading. 🎈");
});

test("dragging the pointer steers the avatar toward it (2026-08-26: replaced the on-screen d-pad)", async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await solveDoorLevel(page, doorLevels[0]);
  await startBalloonStage(page, 0);
  await expectBalloonStageShowing(page, 0);

  const x1 = Number(await page.locator("#balloon-position").getAttribute("data-x"));
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");

  // Press down roughly where the avatar starts (center), then drag
  // toward the right edge — the avatar should steer toward wherever the
  // pointer currently is, same physics as a held keyboard direction.
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 20, startY, { steps: 5 });
  await page.waitForTimeout(700);
  await page.mouse.up();

  const x2 = Number(await page.locator("#balloon-position").getAttribute("data-x"));
  expect(x2).toBeGreaterThan(x1);
});

test("solving all 3 levels shows the session summary, and Play again shows the first level's intro again", async ({ page }) => {
  test.setTimeout(600000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  const summary = page.locator("#session-summary-card");
  await expect(summary).not.toBeVisible();
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await expect(page.locator("[data-progress-fraction]")).toHaveText("1/3");

  for (let i = 0; i < doorLevels.length; i++) {
    await solveDoorLevel(page, doorLevels[i]);
    await expect(page.locator("#door-status")).toHaveAttribute("data-complete", "true");
    await startBalloonStage(page, i);
    await expectBalloonStageShowing(page, i);
    await flyUntilResolved(page);

    await expectBalloonSuccessCardShowing(page, i);
    await continueFromBalloonSuccess(page);

    const isLast = i === doorLevels.length - 1;
    if (isLast) {
      await expect(summary).toBeVisible({ timeout: DOOR_REACH_TIMEOUT_MS });
      // 2026-08-27: the "1/3, 2/3, ..." session-progress badge — every
      // dot done, none current, once the whole session is complete.
      await expect(page.locator("[data-progress-fraction]")).toHaveText("3/3");
      await expect(page.locator(".progress-dot.done")).toHaveCount(doorLevels.length);
      await expect(page.locator(".progress-dot.current")).toHaveCount(0);
    } else {
      await expectIntroShowing(page, i + 1);
      await expect(page.locator("[data-progress-fraction]")).toHaveText(`${i + 2}/${doorLevels.length}`);
      await startPlaying(page);
      await traceIdiomAndEnterDoor(page, i + 1);
    }
  }

  const hanziList = doorLevels.map((l) => l.idiom.hanzi).join(" · ");
  await expect(summary.locator("[data-summary-list]")).toHaveText(hanziList);

  await page.click("#play-again-btn");
  await expect(summary).not.toBeVisible();
  await expectIntroShowing(page, 0);
  await expect(page.locator("[data-progress-fraction]")).toHaveText("1/3");

  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await expect(page.locator("#meaning-prompt")).toHaveText(`Which idiom means: "${doorLevels[0].idiom.meaning}"`);
  const s = await status(page);
  expect(s).toEqual({ nextIndex: "0", complete: "false" });

  // 2026-08-26: finishing that first real session earlier in this test
  // (before "Play again" restarted a fresh in-page run) should be enough
  // on its own to trigger a resurface callback on a genuinely fresh page
  // load - no dev control needed here, this exercises the real
  // record/read path end to end. See idiom-door-resurface.spec.ts for
  // the dev-control-based coverage of the resurface flow itself; this
  // reuses the full completion already paid for above rather than
  // repeating it in its own (expensive) test.
  await page.goto("/idiom-door.html");
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);
  await expect(page.locator("[data-resurface-hanzi]")).not.toBeEmpty();
});

test("the on-screen JUMP button works the same as the keyboard", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await startPlaying(page);
  await traceIdiomAndEnterDoor(page, 0);
  await catchCharacter(page, doorLevels[0], 0, pressJumpButton);
  expect((await status(page)).nextIndex).not.toBe("0");
});
