import { test, expect, type Page } from "@playwright/test";
import { matchLevel } from "../src/idiom-door/matchLevelContent";
import { dragMatchTile } from "./helpers/idiomMatch";

/**
 * The "join the two halves" warm-up stage: before the first door
 * level's own intro, this session runs once on the whole 3-idiom set
 * at once — first-half tiles in a left column, second-half tiles in a
 * right column, dragged together in pairs with a connecting line
 * (2026-08-24 redesign, replacing an earlier tap-then-tap version: a
 * two-column classic-matching-worksheet layout with a drag-to-connect
 * gesture, both more standard and more reliable than repeated taps).
 * See e2e/helpers/idiomMatch.ts's completeMatchStage, which every
 * idiom-door.spec.ts test uses to get past this stage quickly; these
 * tests instead exercise the stage's own behavior directly.
 */
async function canvasBox(page: Page) {
  const box = await page.locator("#game-container canvas").boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  return box;
}

async function tilePagePosition(page: Page, tileId: string): Promise<{ x: number; y: number }> {
  const box = await canvasBox(page);
  const posEl = page.locator(`#match-tile-positions span[data-tile-id="${tileId}"]`);
  const x = Number(await posEl.getAttribute("data-x"));
  const y = Number(await posEl.getAttribute("data-y"));
  return { x: box.x + x, y: box.y + y };
}

test("shows the match warm-up intro before anything is tappable, and Start reveals the two columns", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await expect(page.locator("#game-container canvas")).toBeVisible();
  await expect(page.locator("#match-intro-card")).toHaveClass(/visible/);
  // The underlying stage chrome is already correct beneath the intro
  // overlay (same "no flash once Start is pressed" pattern
  // beginLevel/showDoorStageUI uses for every door level) — only the
  // full-screen intro card itself gates interaction, so #match-ui-layer
  // is *not* stage-hidden even before Start is tapped.
  await expect(page.locator("#match-ui-layer")).not.toHaveClass(/stage-hidden/);

  await page.click("#start-match-btn");
  await expect(page.locator("#match-intro-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#match-ui-layer")).not.toHaveClass(/stage-hidden/);
  const totalPairs = matchLevel.tiles.length / 2;
  await expect(page.locator("#match-status")).toHaveText(`0 of ${totalPairs} joined`);

  // Every tile has a known clickable position, and every first-half
  // tile sits left of every second-half tile — confirming the two
  // columns, not a shuffled grid.
  const positions = new Map<string, { x: number; y: number }>();
  for (const tile of matchLevel.tiles) {
    await expect(page.locator(`#match-tile-positions span[data-tile-id="${tile.id}"]`)).toHaveCount(1);
    positions.set(tile.id, await tilePagePosition(page, tile.id));
  }
  const maxFirstX = Math.max(...matchLevel.tiles.filter((t) => t.half === "first").map((t) => positions.get(t.id)!.x));
  const minSecondX = Math.min(...matchLevel.tiles.filter((t) => t.half === "second").map((t) => positions.get(t.id)!.x));
  expect(maxFirstX).toBeLessThan(minSecondX);
});

test("dragging from a first half to the wrong second half flashes wrong, and both are draggable again afterward", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomA, idiomB] = matchLevel.idiomIds;
  await dragMatchTile(page, `${idiomA}-first`, `${idiomB}-second`);

  await expect(page.locator("#match-status")).toHaveAttribute("data-outcome", "wrong");
  await expect(page.locator("#match-status")).toHaveText("Not quite — try another pair!");
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "0");

  // Once the wrong-pair flash reverts, both tiles are draggable again —
  // confirmed by successfully matching one of them with its real partner.
  await page.waitForTimeout(700);
  await dragMatchTile(page, `${idiomA}-first`, `${idiomA}-second`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-outcome", "matched");
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "1");
});

test("releasing a drag on empty space cancels it — nothing changes, and the tile is still draggable", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomA] = matchLevel.idiomIds;
  const from = await tilePagePosition(page, `${idiomA}-first`);
  const box = await canvasBox(page);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Release well below both columns' rows, on empty background.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10, { steps: 5 });
  await page.mouse.up();

  await expect(page.locator("#match-status")).toHaveText(`0 of ${matchLevel.idiomIds.length} joined`);
  await expect(page.locator("#match-status")).not.toHaveAttribute("data-outcome", /.+/);

  // Still draggable normally afterward.
  await dragMatchTile(page, `${idiomA}-first`, `${idiomA}-second`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "1");
});

test("joining every idiom's two halves completes the stage and hands off to the first door level's intro", async ({ page }) => {
  test.setTimeout(30000);
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  for (const idiomId of matchLevel.idiomIds) {
    await dragMatchTile(page, `${idiomId}-first`, `${idiomId}-second`);
  }

  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");
  await expect(page.locator("#match-status")).toHaveText("You joined them all! 🎉");

  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/, { timeout: 5000 });
  await expect(page.locator("#match-ui-layer")).toHaveClass(/stage-hidden/);
});
