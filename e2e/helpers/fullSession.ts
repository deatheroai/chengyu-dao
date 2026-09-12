import { expect, type Page } from "@playwright/test";
import { doorLevels } from "../../src/idiom-door/levelContent";
import { solveDoorLevel } from "./doorJump";
import { traceWholeIdiomPerfectly, continueFromWritingSummary } from "./writingStage";

/**
 * Plays one entire real idiom-door session (writing → door → balloon,
 * for every one of `doorLevels`) end to end, exactly as
 * idiom-door.spec.ts's own "solving all 3 levels..." test does — pulled
 * out here (rather than duplicated) since idiom-match.spec.ts's
 * milestone tests need this same real completion (main.ts only checks
 * `pendingMatchMilestone` inside `advanceAfterBalloonStage`, once a
 * session's very last idiom is recorded — see BACKLOG.md's 2026-09-08
 * "milestone-only matching" entry) to reach the matching finale at all,
 * not just a mocked-up shortcut into it. Real freehand tracing (real
 * gate — doorHp.ts) and real aimed jumps (doorJump.ts) throughout, same
 * as every other test in this suite that reaches the door/balloon
 * stages — nothing here is a test-only cheat path.
 */

const DOOR_REACH_TIMEOUT_MS = 70000;

async function playThroughLevel(page: Page, levelIndex: number): Promise<void> {
  const level = doorLevels[levelIndex];

  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await page.click("#start-level-btn");
  await expect(page.locator("#level-intro-card")).not.toHaveClass(/visible/);

  await expect(page.locator("#writing-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });
  await traceWholeIdiomPerfectly(page, level.idiom.hanzi.length);
  await continueFromWritingSummary(page);
  await expect(page.locator("#catch-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: 10000 });

  await solveDoorLevel(page, level);
  await expect(page.locator("#door-status")).toHaveAttribute("data-complete", "true");

  const balloonIntro = page.locator("#balloon-intro-card");
  await expect(balloonIntro).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await page.click("#start-balloon-btn");
  await expect(balloonIntro).not.toHaveClass(/visible/);
  await expect(page.locator("#balloon-ui-layer")).not.toHaveClass(/stage-hidden/, { timeout: DOOR_REACH_TIMEOUT_MS });

  await flyUntilResolved(page);

  const successCard = page.locator("#balloon-success-card");
  await expect(successCard).toHaveClass(/visible/, { timeout: DOOR_REACH_TIMEOUT_MS });
  await page.click("#balloon-continue-btn");
  await expect(successCard).not.toHaveClass(/visible/);
}

/** Same direct-steer-to-the-live-target approach as idiom-door.spec.ts's
 * own `flyUntilResolved` — see that copy's doc comment for why a blind
 * search pattern doesn't work here. Kept in lockstep with that one
 * rather than imported from it since idiom-door.spec.ts doesn't export
 * its helpers as a module (test files, not a shared helper). */
async function correctBalloonScreenPosition(page: Page, box: { x: number; y: number; width: number; height: number }): Promise<{ x: number; y: number }> {
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

/**
 * Plays every one of `doorLevels` (writing, door, balloon) in order,
 * from wherever the level-intro card is already showing (right after
 * `page.goto`, or after a resurface-card's Continue), through to the
 * session finishing — main.ts's `recordCompletedSession` fires the
 * instant the last one's balloon success card is dismissed, same moment
 * a fresh `pendingMatchMilestone` check runs. Does *not* wait for or
 * assert on whatever comes next (the session-summary card, or a
 * matching-finale milestone) — that's the caller's own thing to check.
 */
export async function completeFullIdiomSession(page: Page): Promise<void> {
  for (let i = 0; i < doorLevels.length; i++) {
    await playThroughLevel(page, i);
  }
}
