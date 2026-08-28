import { expect, type Page } from "@playwright/test";
import { matchLevel } from "../../src/idiom-door/matchLevelContent";

/** The current canvas-local position of a given match tile — see
 * IdiomMatchScene.syncTilePositionsToDom / #match-tile-positions, the
 * test-only hook this depends on (there's no per-tile DOM element to
 * click directly, since tiles are drawn to the Phaser canvas). */
async function tilePagePosition(page: Page, tileId: string): Promise<{ x: number; y: number }> {
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  const posEl = page.locator(`#match-tile-positions span[data-tile-id="${tileId}"]`);
  const x = Number(await posEl.getAttribute("data-x"));
  const y = Number(await posEl.getAttribute("data-y"));
  return { x: box.x + x, y: box.y + y };
}

/** Drags from one match tile to another — the join gesture
 * (2026-08-24 redesign, replacing an earlier tap-then-tap version):
 * press on the origin tile, move in a few steps toward the target (so
 * Phaser's pointermove handler actually sees intermediate positions,
 * not just a teleport), release over the target. */
export async function dragMatchTile(page: Page, fromTileId: string, toTileId: string): Promise<void> {
  const from = await tilePagePosition(page, fromTileId);
  const to = await tilePagePosition(page, toTileId);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/** Presses and releases a tile without ever moving in between — a plain
 * tap, as opposed to dragMatchTile's drag. IdiomMatchScene tells the two
 * apart by how far the pointer moved between press and release (see its
 * TAP_MOVE_THRESHOLD), so this deliberately never calls `mouse.move`
 * between `down` and `up`. */
export async function tapMatchTile(page: Page, tileId: string): Promise<void> {
  const at = await tilePagePosition(page, tileId);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.up();
}

/**
 * Dismisses the match-intro overlay and drags every idiom's first half
 * to its second half, in order — the session's one-time warm-up
 * (main.ts's bootstrap → showMatchIntro → beginMatchStage) that now
 * runs before the very first door level's own intro. Every existing
 * idiom-door.spec test that exercises the door/balloon stages needs
 * this run first, right after `page.goto`, to get past it — see
 * idiom-match.spec.ts for tests of the warm-up stage's own behavior
 * (wrong pairs, cancelled drags, completion) in isolation.
 */
export async function completeMatchStage(page: Page): Promise<void> {
  await expect(page.locator("#match-intro-card")).toHaveClass(/visible/);
  await page.click("#start-match-btn");
  await expect(page.locator("#match-intro-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#match-ui-layer")).not.toHaveClass(/stage-hidden/);

  for (const idiomId of matchLevel.idiomIds) {
    await dragMatchTile(page, `${idiomId}-first`, `${idiomId}-second`);
  }

  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");
  // The scene hands off to the first door level's own intro shortly
  // after (IdiomMatchScene's COMPLETE_HANDOFF_MS beat) — waiting for it
  // here means every caller can go straight into door-level assertions
  // without repeating this wait itself.
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/, { timeout: 5000 });
}
