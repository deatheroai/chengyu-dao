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
