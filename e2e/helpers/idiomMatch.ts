import { expect, type Page } from "@playwright/test";
import { matchLevel } from "../../src/idiom-door/matchLevelContent";

/** Clicks a given match tile at its current canvas-local position — see
 * IdiomMatchScene.syncTilePositionsToDom / #match-tile-positions, the
 * test-only hook this depends on (there's no per-tile DOM element to
 * click directly, since tiles are drawn to the Phaser canvas). */
async function tapMatchTile(page: Page, tileId: string): Promise<void> {
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  const posEl = page.locator(`#match-tile-positions span[data-tile-id="${tileId}"]`);
  const x = Number(await posEl.getAttribute("data-x"));
  const y = Number(await posEl.getAttribute("data-y"));
  await page.mouse.click(box.x + x, box.y + y);
}

/**
 * Dismisses the match-intro overlay and taps every idiom's two halves
 * into place, in order — the session's one-time warm-up (main.ts's
 * bootstrap → showMatchIntro → beginMatchStage) that now runs before
 * the very first door level's own intro. Every existing idiom-door.spec
 * test that exercises the door/balloon stages needs this run first,
 * right after `page.goto`, to get past it — see idiom-match.spec.ts for
 * tests of the warm-up stage's own behavior (wrong pairs, deselection,
 * completion) in isolation.
 */
export async function completeMatchStage(page: Page): Promise<void> {
  await expect(page.locator("#match-intro-card")).toHaveClass(/visible/);
  await page.click("#start-match-btn");
  await expect(page.locator("#match-intro-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#match-ui-layer")).not.toHaveClass(/stage-hidden/);

  for (const idiomId of matchLevel.idiomIds) {
    await tapMatchTile(page, `${idiomId}-first`);
    await tapMatchTile(page, `${idiomId}-second`);
  }

  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");
  // The scene hands off to the first door level's own intro shortly
  // after (IdiomMatchScene's COMPLETE_HANDOFF_MS beat) — waiting for it
  // here means every caller can go straight into door-level assertions
  // without repeating this wait itself.
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/, { timeout: 5000 });
}
