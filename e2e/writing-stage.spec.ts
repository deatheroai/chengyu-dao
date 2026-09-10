import { test, expect, type Locator } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";
import { completeMatchStage } from "./helpers/idiomMatch";
import { traceCurrentCharacterPerfectly, continueFromWritingSummary } from "./helpers/writingStage";

/** Strips ruby `<rt>` pinyin annotations from a clone, recovering just
 * the base hanzi text — same approach as idiom-door.spec.ts's
 * rubyBaseText, needed here too since the writing-summary card's hanzi
 * line is ruby-annotated the same way. */
async function rubyBaseText(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("rt").forEach((rt) => rt.remove());
    return clone.textContent ?? "";
  });
}

/**
 * The writing/tracing stage itself (BACKLOG.md's 2026-09-08 "teach each
 * character before the door" entry, landed 2026-09-09) — each of an
 * idiom's 4 characters shown in turn, a stroke-order animation then a
 * HanziWriter quiz the child traces themselves. idiom-door.spec.ts
 * already drives this stage (via traceIdiomAndEnterDoor) on the way to
 * every door-stage test there; this file is this stage's own focused
 * coverage, same relationship idiom-match.spec.ts has to its warm-up
 * stage.
 */
async function enterFirstLevelsWritingStage(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/idiom-door.html");
  await completeMatchStage(page);
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
  await page.click("#start-level-btn");
  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
}

test("shows each of the idiom's 4 characters in turn, with a real HanziWriter target rendered", async ({ page }) => {
  test.setTimeout(90000);
  await enterFirstLevelsWritingStage(page);
  const idiom = doorLevels[0].idiom;
  const chars = Array.from(idiom.hanzi);

  for (let i = 0; i < chars.length; i++) {
    await expect.poll(() => page.locator("#writing-status").getAttribute("data-char-index")).toBe(String(i));
    await expect(page.locator("#writing-status")).toHaveAttribute("data-total", String(chars.length));
    await expect.poll(() => page.locator("#writing-status").getAttribute("data-char")).toBe(chars[i]);
    // hanzi-writer actually mounted an SVG into the target — not just
    // an empty div.
    await expect(page.locator("#writing-target svg")).toHaveCount(1);
    await traceCurrentCharacterPerfectly(page);
  }

  // The writing-summary card gates the actual move into the door stage.
  await continueFromWritingSummary(page);
  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await expect(page.locator("#writing-ui-layer")).toHaveClass(/stage-hidden/);
});

test("tracing every character with 0 mistakes opens the door stage at the full starting HP", async ({ page }) => {
  test.setTimeout(90000);
  await enterFirstLevelsWritingStage(page);
  const idiom = doorLevels[0].idiom;

  for (let i = 0; i < Array.from(idiom.hanzi).length; i++) {
    await traceCurrentCharacterPerfectly(page);
  }
  await continueFromWritingSummary(page);

  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await expect(page.locator("#door-hp")).toHaveAttribute("data-hp", "100");
});

/**
 * 2026-09-09 ("there should be some feedback on the writing to explain
 * to child how well he wrote"): right after each character's own quiz
 * resolves, `#writing-feedback` shows a star rating (writingScore.ts's
 * `traceRatingForAccuracy`) for a short beat before the next character
 * begins — a perfect (0-mistake) trace, same as every other e2e trace
 * in this suite, always rates the max 3 stars.
 */
test("shows a star-rated feedback message after each character, before moving to the next one", async ({ page }) => {
  test.setTimeout(90000);
  await enterFirstLevelsWritingStage(page);
  const chars = Array.from(doorLevels[0].idiom.hanzi);

  for (let i = 0; i < chars.length; i++) {
    await traceCurrentCharacterPerfectly(page);
    const feedback = page.locator("#writing-feedback");
    await expect(feedback).toHaveClass(/visible/, { timeout: 2000 });
    await expect(feedback).toHaveAttribute("data-stars", "3");
    await expect(feedback).toHaveAttribute("data-mistakes", "0");
    await expect.poll(() => feedback.textContent()).toContain("⭐⭐⭐");

    const isLast = i === chars.length - 1;
    if (isLast) {
      // The last character's feedback beat is what leads into the
      // writing-summary card, not another character's own watch/trace.
      await continueFromWritingSummary(page);
    } else {
      // The feedback clears once the *next* character's own watch/trace
      // phase begins, so it doesn't linger on screen past its beat.
      await expect.poll(() => page.locator("#writing-status").getAttribute("data-char-index")).toBe(String(i + 1));
      await expect(feedback).not.toHaveClass(/visible/);
    }
  }
});

/**
 * 2026-09-09 ("...eventually how many points he got"): once every
 * character is traced, main.ts's writing-summary card restates the
 * idiom, its overall star rating, and the literal HP number earned —
 * checked here directly rather than only through
 * `continueFromWritingSummary`'s own bare visibility check.
 */
test("the writing-summary card shows the idiom, its rating, and the HP points earned", async ({ page }) => {
  test.setTimeout(90000);
  await enterFirstLevelsWritingStage(page);
  const idiom = doorLevels[0].idiom;

  for (let i = 0; i < Array.from(idiom.hanzi).length; i++) {
    await traceCurrentCharacterPerfectly(page);
  }

  const card = page.locator("#writing-summary-card");
  await expect(card).toHaveClass(/visible/, { timeout: 5000 });
  await expect.poll(() => rubyBaseText(card.locator("[data-writing-summary-hanzi]"))).toBe(idiom.hanzi);
  await expect(card.locator("[data-writing-summary-rating]")).toContainText("⭐⭐⭐");
  await expect(card.locator("[data-writing-summary-hp]")).toContainText("100");

  await page.click("#writing-continue-btn");
  await expect(card).not.toHaveClass(/visible/);
  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
});

test("the writing stage's own chrome is hidden during the match warm-up", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#match-intro-card")).toHaveClass(/visible/);
  await expect(page.locator("#writing-ui-layer")).toHaveClass(/stage-hidden/);
});

/** Same storage shape sessionHistory.ts's own `recordCompletedSession`
 * writes — seeds a device with `count` prior completed sessions
 * directly (rather than actually playing that many full sessions),
 * same "dev-only reset/toggle stands in for really waiting" idea
 * main.ts's own dev-seed-history-btn already uses for the resurface
 * flow. Reloads afterward so main.ts's bootstrap (and its resurface-card
 * gate, now showing since `hasPriorSession()` is true) picks it up. */
async function seedCompletedSessions(page: import("@playwright/test").Page, count: number): Promise<void> {
  await page.evaluate((n) => {
    const completedSessions = Array.from({ length: n }, (_, i) => ({
      idiomIds: ["yi-xin-yi-yi", "you-shi-you-zhong", "ban-tu-er-fei"],
      completedAt: Date.now() - (n - i) * 1000,
    }));
    localStorage.setItem("idiom-session-history", JSON.stringify({ completedSessions }));
  }, count);
  await page.reload();
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);
  await page.click("#resurface-continue-btn");
}

/**
 * 2026-09-09 ("can we skip the example tracing [for] the more advanced
 * phases... after three celebrations... the child may get impatient
 * waiting if he already knew the strokes"): writingScore.ts's
 * `shouldSkipStrokeDemo` gates the stroke-order animation on how many
 * sessions this device has already completed (each one ending at the
 * celebratory session-summary card) — a brand-new device still gets it,
 * a device with `SESSIONS_BEFORE_SKIPPING_STROKE_DEMO` (3) or more
 * behind it skips straight to the quiz. Checked with a short, tight
 * poll timeout right as the writing stage appears (not the usual
 * generous one) specifically so this distinguishes "skipped the
 * animation" from "the animation just happened to finish very fast" —
 * a real stroke-order animation takes at least ~1s even for the
 * simplest bundled character, so `data-phase` still reading "watch"
 * within a couple hundred ms of the stage appearing is a reliable
 * negative signal.
 */
test("a brand-new device sees the stroke-order demo before its first character's quiz", async ({ page }) => {
  test.setTimeout(60000);
  await enterFirstLevelsWritingStage(page);
  await expect(page.locator("#writing-status")).toHaveAttribute("data-phase", "watch", { timeout: 300 });
});

test("a device with 3+ completed sessions behind it skips straight to the quiz", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await seedCompletedSessions(page, 3);

  await completeMatchStage(page);
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
  await page.click("#start-level-btn");

  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await expect(page.locator("#writing-status")).toHaveAttribute("data-phase", "trace", { timeout: 300 });
  await expect(page.locator("#writing-status")).toHaveAttribute("data-char-index", "0");
});

test("a device with only 2 completed sessions still sees the demo (right up to the threshold)", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/idiom-door.html");
  await seedCompletedSessions(page, 2);

  await completeMatchStage(page);
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
  await page.click("#start-level-btn");

  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await expect(page.locator("#writing-status")).toHaveAttribute("data-phase", "watch", { timeout: 300 });
});
