import { test, expect } from "@playwright/test";
import { doorLevels } from "../src/idiom-door/levelContent";
import { completeMatchStage } from "./helpers/idiomMatch";
import { traceCurrentCharacterPerfectly } from "./helpers/writingStage";

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

  // The door stage starts right after the last character resolves.
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

  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await expect(page.locator("#door-hp")).toHaveAttribute("data-hp", "100");
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
