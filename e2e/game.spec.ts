import { test, expect, type Page } from "@playwright/test";

/**
 * Hotspots are drawn on a Phaser canvas, not as DOM elements, so we click
 * by normalized position (matching src/rooms/castle.ts) scaled to the
 * current viewport rather than by locator.
 */
async function tapHotspot(page: Page, rect: { x: number; y: number; width: number; height: number }) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport not set");
  const x = (rect.x + rect.width / 2) * viewport.width;
  const y = (rect.y + rect.height / 2) * viewport.height;
  await page.mouse.click(x, y);
}

const TORCH_SCONCE = { x: 0.12, y: 0.35, width: 0.14, height: 0.3 };
const STONE_DIAL = { x: 0.42, y: 0.4, width: 0.18, height: 0.22 };
const HEAVY_DOOR = { x: 0.72, y: 0.18, width: 0.22, height: 0.62 };

test("solving the Great Hall puzzle unlocks the door and persists across reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-container canvas")).toBeVisible();

  await tapHotspot(page, TORCH_SCONCE);
  await expect(page.locator("#clue-text")).toContainText("Sun. Moon. Star.");

  await tapHotspot(page, STONE_DIAL);
  const dials = page.locator(".puzzle-dial");
  await expect(dials).toHaveCount(3);
  await dials.nth(0).selectOption({ label: "☀ Sun" });
  await dials.nth(1).selectOption({ label: "🌙 Moon" });
  await dials.nth(2).selectOption({ label: "★ Star" });
  await page.click("#puzzle-confirm");

  await expect(page.locator(".puzzle-feedback")).toHaveClass(/success/);
  await expect(page.locator("#puzzle-overlay")).toHaveClass(/hidden/);
  await expect(page.locator("#inventory-bar")).toContainText("Iron Key");

  await tapHotspot(page, HEAVY_DOOR);
  await expect(page.locator("#clue-text")).toContainText("The iron key turns");

  await page.reload();
  await expect(page.locator("#inventory-bar")).toContainText("Iron Key");
});

test("the dial puzzle rejects a wrong combination and stays open", async ({ page }) => {
  await page.goto("/");
  await tapHotspot(page, STONE_DIAL);

  const dials = page.locator(".puzzle-dial");
  await dials.nth(0).selectOption({ label: "★ Star" });
  await dials.nth(1).selectOption({ label: "☀ Sun" });
  await dials.nth(2).selectOption({ label: "🌙 Moon" });
  await page.click("#puzzle-confirm");

  await expect(page.locator(".puzzle-feedback")).toHaveClass(/error/);
  await expect(page.locator("#puzzle-overlay")).not.toHaveClass(/hidden/);
  await expect(page.locator("#inventory-bar")).not.toContainText("Iron Key");
});

test("the heavy door stays locked until the dial puzzle is solved", async ({ page }) => {
  await page.goto("/");
  // The door hotspot is gated behind the `dial-solved` flag, so before
  // solving the puzzle a click at its position should hit nothing.
  await tapHotspot(page, HEAVY_DOOR);
  await expect(page.locator("#clue-text")).toBeEmpty();
});
