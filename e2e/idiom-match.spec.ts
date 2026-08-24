import { test, expect, type Page } from "@playwright/test";
import { matchLevel } from "../src/idiom-door/matchLevelContent";

/**
 * The "join the two halves" warm-up stage (2026-08-24): before the
 * first door level's own intro, this session runs once on the whole
 * 3-idiom set at once — each idiom split into a first-half and
 * second-half tile, scattered, tapped back together in pairs. See
 * e2e/helpers/idiomMatch.ts's completeMatchStage, which every
 * idiom-door.spec.ts test uses to get past this stage quickly; these
 * tests instead exercise the stage's own behavior directly.
 */
async function tilePosition(page: Page, tileId: string): Promise<{ x: number; y: number }> {
  const posEl = page.locator(`#match-tile-positions span[data-tile-id="${tileId}"]`);
  const x = Number(await posEl.getAttribute("data-x"));
  const y = Number(await posEl.getAttribute("data-y"));
  return { x, y };
}

async function clickTile(page: Page, tileId: string): Promise<void> {
  const canvas = page.locator("#game-container canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas has no bounding box");
  const { x, y } = await tilePosition(page, tileId);
  await page.mouse.click(box.x + x, box.y + y);
}

test("shows the match warm-up intro before anything is tappable, and Start reveals the tiles", async ({ page }) => {
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

  // Every tile should have a known clickable position by now.
  for (const tile of matchLevel.tiles) {
    await expect(page.locator(`#match-tile-positions span[data-tile-id="${tile.id}"]`)).toHaveCount(1);
  }
});

test("tapping two halves of different idioms flashes wrong, and both are tappable again afterward", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomA, idiomB] = matchLevel.idiomIds;
  await clickTile(page, `${idiomA}-first`);
  await clickTile(page, `${idiomB}-second`);

  await expect(page.locator("#match-status")).toHaveAttribute("data-outcome", "wrong");
  await expect(page.locator("#match-status")).toHaveText("Not quite — try another pair!");
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "0");

  // Once the wrong-pair flash reverts, both tiles are tappable again —
  // confirmed by successfully matching one of them with its real partner.
  await page.waitForTimeout(700);
  await clickTile(page, `${idiomA}-first`);
  await clickTile(page, `${idiomA}-second`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-outcome", "matched");
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "1");
});

test("tapping the same tile twice deselects it instead of matching it to itself", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomA] = matchLevel.idiomIds;
  await clickTile(page, `${idiomA}-first`);
  await clickTile(page, `${idiomA}-first`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "0");

  // Still selectable/matchable normally afterward.
  await clickTile(page, `${idiomA}-first`);
  await clickTile(page, `${idiomA}-second`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "1");
});

test("joining every idiom's two halves completes the stage and hands off to the first door level's intro", async ({ page }) => {
  test.setTimeout(30000);
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  for (const idiomId of matchLevel.idiomIds) {
    await clickTile(page, `${idiomId}-first`);
    await clickTile(page, `${idiomId}-second`);
  }

  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");
  await expect(page.locator("#match-status")).toHaveText("You joined them all! 🎉");

  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/, { timeout: 5000 });
  await expect(page.locator("#match-ui-layer")).toHaveClass(/stage-hidden/);
});
