import { test, expect, type Page } from "@playwright/test";

// The on-screen joystick (joystickControl.ts), driven the way a finger
// would: real pointer input at real positions on the disc, checking
// #snake-status's data-direction (the scene's live direction). The
// snake starts moving right (SnakeGameScene.ts).

async function startGame(page: Page): Promise<{ cx: number; cy: number; radius: number }> {
  await page.goto("/science-snake.html");
  await page.click("#start-btn");
  await expect(page.locator("#start-card")).not.toHaveClass(/visible/);
  const box = await page.locator("#joystick").boundingBox();
  if (!box) throw new Error("#joystick isn't on the page");
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, radius: box.width / 2 };
}

const direction = (page: Page) => page.locator("#snake-status").getAttribute("data-direction");

test("sliding the knob up, then over to the left, steers the snake up and then left", async ({ page }) => {
  const { cx, cy, radius } = await startGame(page);

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Resting on the knob in the middle does nothing.
  await expect.poll(() => direction(page)).toBe("right");

  await page.mouse.move(cx, cy - radius * 0.7, { steps: 5 });
  await expect.poll(() => direction(page)).toBe("up");
  await expect(page.locator("#joystick")).toHaveClass(/active/);

  // Same touch, keep sliding round to the left.
  await page.mouse.move(cx - radius * 0.7, cy, { steps: 5 });
  await expect.poll(() => direction(page)).toBe("left");

  await page.mouse.up();
  await expect(page.locator("#joystick")).not.toHaveClass(/active/);
});

test("a plain tap on one side of the disc turns the snake that way", async ({ page }) => {
  const { cx, cy, radius } = await startGame(page);
  await page.mouse.click(cx, cy + radius * 0.8);
  await expect.poll(() => direction(page)).toBe("down");
});

test("a tap near the disc's edge, where the gaps between the old buttons were, still counts", async ({ page }) => {
  const { cx, cy, radius } = await startGame(page);
  // Up and to the right of centre — on the old D-pad this was the empty
  // corner between the up and right buttons. Further up than right, so
  // it's "up".
  await page.mouse.click(cx + radius * 0.45, cy - radius * 0.6);
  await expect.poll(() => direction(page)).toBe("up");
});

test("a real finger slide (touch events, not a mouse) steers too", async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== "mobile", "touch input is the mobile project's job");
  const { cx, cy, radius } = await startGame(page);
  // Playwright's touchscreen API only taps, so the slide goes through
  // Chromium's own touch input directly — the same events a phone sends.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });

  await touch("touchStart", cx, cy);
  for (let i = 1; i <= 5; i++) await touch("touchMove", cx, cy + (radius * 0.7 * i) / 5);
  await expect.poll(() => direction(page)).toBe("down");
  for (let i = 1; i <= 5; i++) await touch("touchMove", cx - (radius * 0.7 * i) / 5, cy + radius * 0.7 * (1 - i / 5));
  await expect.poll(() => direction(page)).toBe("left");
  await touch("touchEnd", cx - radius * 0.7, cy);
  await expect(page.locator("#joystick")).not.toHaveClass(/active/);
});
