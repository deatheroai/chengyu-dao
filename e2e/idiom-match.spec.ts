import { test, expect, type Page, type Locator } from "@playwright/test";
import { matchLevel } from "../src/idiom-door/matchLevelContent";
import { idiomsById } from "../src/idioms/idioms";
import { buildHintMaskedIdiom } from "../src/idiom-door/matchHintStatus";
import { dragMatchTile, tapMatchTile } from "./helpers/idiomMatch";

/** Strips ruby `<rt>` pinyin annotations from a clone, recovering just
 * the base hanzi text — same approach as idiom-door.spec.ts's
 * rubyBaseText, needed here too since the hint card's hanzi line is
 * ruby-annotated the same way. */
async function rubyBaseText(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("rt").forEach((rt) => rt.remove());
    return clone.textContent ?? "";
  });
}

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

/**
 * 2026-08-27 regression: pressing down anywhere within a tile's card
 * used to only register near its top-left corner (a Phaser Container
 * hit-area gotcha — see IdiomMatchScene.spawnTiles's fix comment).
 * Every other test here presses exactly at a tile's own mathematical
 * center (tilePagePosition/dragMatchTile), which sat right on the
 * boundary of the broken hit area and so still worked — masking the
 * bug for anything but a pixel-perfect touch. This deliberately offsets
 * well off-center (toward the bottom-right, the exact quadrant that was
 * unresponsive) to catch a regression a center-only press wouldn't.
 */
test("pressing down anywhere within a tile's card starts a drag, not just its exact center", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomA] = matchLevel.idiomIds;
  const fromCenter = await tilePagePosition(page, `${idiomA}-first`);
  const toCenter = await tilePagePosition(page, `${idiomA}-second`);
  // Every tile card is comfortably larger than this offset on both
  // axes (two hanzi + pinyin plus padding) - well within the card, but
  // far enough from center to have landed in the broken quadrant.
  const OFFSET = 30;

  await page.mouse.move(fromCenter.x + OFFSET, fromCenter.y + OFFSET);
  await page.mouse.down();
  await page.mouse.move(toCenter.x + OFFSET, toCenter.y + OFFSET, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator("#match-status")).toHaveAttribute("data-outcome", "matched");
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "1");
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

/**
 * 2026-08-28: a hint for a child who doesn't recognize a left-column
 * tile — tapping it (pressing and releasing without ever dragging)
 * shows its idiom's first two characters, its last two blanked out,
 * then its plain-English meaning. Deliberately keyed to a *plain tap*,
 * not a drag that happens to miss its target — see the next few tests.
 */
test("tapping (not dragging) a first-half tile shows a hint with its meaning, first two characters revealed and the rest blanked", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomId] = matchLevel.idiomIds;
  const idiom = idiomsById[idiomId];
  const { hanzi } = buildHintMaskedIdiom(idiom);

  await expect(page.locator("#match-hint-card")).not.toHaveClass(/visible/);
  await tapMatchTile(page, `${idiomId}-first`);

  const card = page.locator("#match-hint-card");
  await expect(card).toHaveClass(/visible/);
  await expect.poll(() => rubyBaseText(card.locator("[data-hint-hanzi]"))).toBe(hanzi);
  await expect(card.locator("[data-hint-meaning]")).toHaveText(idiom.meaning);

  // The tapped tile itself is untouched — no pair was attempted, so no
  // match/wrong outcome, same "nothing lost" ethos as a missed drag.
  await expect(page.locator("#match-status")).not.toHaveAttribute("data-outcome", /.+/);

  // Dismissing hides the card and leaves the stage exactly as it was —
  // the same tile can still be matched normally afterward.
  await page.click("#match-hint-dismiss-btn");
  await expect(card).not.toHaveClass(/visible/);
  await dragMatchTile(page, `${idiomId}-first`, `${idiomId}-second`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-matched-pairs", "1");
});

test("tapping a second-half tile never shows a hint", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomId] = matchLevel.idiomIds;
  await tapMatchTile(page, `${idiomId}-second`);

  await expect(page.locator("#match-hint-card")).not.toHaveClass(/visible/);
});

test("dragging a first-half tile and missing its target does not show a hint", async ({ page }) => {
  await page.goto("/idiom-door.html");
  await page.click("#start-match-btn");

  const [idiomId] = matchLevel.idiomIds;
  const from = await tilePagePosition(page, `${idiomId}-first`);
  const box = await canvasBox(page);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // A real drag (well past TAP_MOVE_THRESHOLD), released on empty space
  // below both columns — a genuine, if unlanded, match attempt, not a
  // request for help.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10, { steps: 5 });
  await page.mouse.up();

  await expect(page.locator("#match-hint-card")).not.toHaveClass(/visible/);
});
