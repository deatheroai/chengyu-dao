import { expect, type Page } from "@playwright/test";

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
 * 2026-08-24 → 2026-09-08 ("milestone-only matching"): this used to
 * dismiss a per-session match warm-up (dragging every idiom's first
 * half to its second half) that ran before the very first door level's
 * own intro — every existing idiom-door.spec/writing-stage.spec test
 * that exercises the door/writing/balloon stages called this right
 * after `page.goto` to get past it. That warm-up is gone (see
 * IdiomMatchScene's own doc comment for the redesign: the matching
 * mechanic is milestone-finale-only now, gated behind
 * `pendingMatchMilestone` rather than running every session), so on a
 * fresh, empty-history page load — every one of those callers' actual
 * situation — `#level-intro-card` is already showing the moment this is
 * called; kept as a real wait (not deleted from every call site) so
 * this still reads as "get past whatever comes before the first idiom's
 * intro," matching name and call-site shape both unchanged. See
 * idiom-match.spec.ts for the matching mechanic's own behavior (wrong
 * pairs, cancelled drags, completion, HP) and its milestone-triggering
 * (pendingMatchMilestone/splitIntoSubRounds) in isolation.
 */
export async function completeMatchStage(page: Page): Promise<void> {
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
}
