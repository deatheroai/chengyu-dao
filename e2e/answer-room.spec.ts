import { test, expect, type Page } from "@playwright/test";
import { buildSteps } from "../src/science-snake/answerRoom";
import { steerRoomTo } from "./helpers/answerRoom";
import { answerRoomContent } from "../src/science-snake/answerRoomContent";

/**
 * Plays the answer-room prototype (answer-room.html) for real: real
 * ticks, real eating rules, steered by helpers/answerRoom.ts.
 */

const ice = answerRoomContent["aishas-melting-ice"];

async function enter(page: Page, buttonId: string): Promise<void> {
  await page.click(`#${buttonId}`);
  await expect(page.locator("#countdown")).toHaveText("3");
}

const iceSteps = buildSteps(ice);
const choiceStep = iceSteps.findIndex((step) => step.kind === "choice");

test.beforeEach(async ({ page }) => {
  await page.goto("/answer-room.html?q=aishas-melting-ice&seed=3");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
});

test("eating the words one by one, the right blue apple, then the ladder finishes the sentence", async ({ page }) => {
  await enter(page, "start-btn");
  await steerRoomTo(page, "right");
  // One word at a time; two blue apples only at the choice.
  await expect(page.locator("#room-apples span")).toHaveCount(1);
  await expect(page.locator("#choice-box")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#room-apples span[data-kind=option]")).toHaveCount(2);
  await expect(page.locator("#choice-box")).toContainText("it warmed up");
  await expect(page.locator("#choice-box")).toContainText("it cooled down");

  await expect(page.locator("#room-hint")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(iceSteps.length);
  await expect(page.locator("#complete-card")).toHaveClass(/visible/, { timeout: 30_000 });
  await expect(page.locator("#complete-sentence")).toHaveText(ice.phrases.join(" "));
});

test("the wrong blue apple kills the snake, and the sentence is practised again from the first word", async ({ page }) => {
  await enter(page, "start-btn");
  await steerRoomTo(page, "wrong");
  await expect(page.locator("#thrown-out-card")).toHaveClass(/visible/, { timeout: 90_000 });
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(0);

  await enter(page, "retry-btn");
  await expect(page.locator("#room-status")).toHaveAttribute("data-step", "0");
  await expect(page.locator("#room-apples span[data-kind=word]")).toHaveCount(1);
});

test("the QUESTION door goes back to reread, keeping the words eaten so far", async ({ page }) => {
  await enter(page, "start-btn");
  await steerRoomTo(page, "right");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(2, { timeout: 60_000 });
  await steerRoomTo(page, "door");
  // It asks first, so an accidental bump doesn't lose the child's place.
  await expect(page.locator("#door-confirm-card")).toHaveClass(/visible/, { timeout: 60_000 });
  // The snake can eat one more word before the door steering takes
  // over, so compare against what's actually eaten at the door.
  const eatenAtDoor = await page.locator("#sentence-strip .word-chip:not(.upcoming)").count();
  expect(eatenAtDoor).toBeGreaterThanOrEqual(2);
  await page.click("#door-reread-btn");
  await expect(page.locator("#question-card")).toHaveClass(/visible/);
  await expect(page.locator("#question-card .question-parts p")).toHaveCount(3);

  await enter(page, "back-in-btn");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(eatenAtDoor);
  expect(choiceStep).toBeGreaterThan(2);
});

test("after a finished sentence, Next question moves on to a fresh one", async ({ page }) => {
  await enter(page, "start-btn");
  await steerRoomTo(page, "right");
  await expect(page.locator("#complete-card")).toHaveClass(/visible/, { timeout: 120_000 });
  await page.click("#next-question-btn");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
  await expect(page.locator("#start-card .question-parts")).not.toContainText("Aisha");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(0);
});

test("the board shrinks to make room for the A/B box, never covering it", async ({ page }) => {
  // The whale question's choice is its very first step, so the A/B box
  // appears the moment the room opens.
  await page.goto("/answer-room.html?q=kais-whale-is-not-a-fish&seed=2");
  await page.click("#start-btn");
  await expect(page.locator("#choice-box")).toBeVisible();
  await expect
    .poll(async () => {
      const box = await page.locator("#choice-box").boundingBox();
      const canvas = await page.locator("#game-container canvas").boundingBox();
      const joystick = await page.locator("#joystick").boundingBox();
      if (!box || !canvas || !joystick) return false;
      return canvas.y >= box.y + box.height && canvas.y + canvas.height <= joystick.y + 1;
    })
    .toBe(true);
});

test("at the A/B choice the snake stays put until the joystick or a key is held", async ({ page }) => {
  // The whale question's choice is its first step.
  await page.goto("/answer-room.html?q=kais-whale-is-not-a-fish&seed=2");
  await page.click("#start-btn");
  await expect(page.locator("#choice-box")).toContainText("Hold the joystick");
  await expect(page.locator("#countdown")).toHaveText("", { timeout: 5_000 });

  const head = async (): Promise<string> =>
    `${await page.locator("#room-status").getAttribute("data-head-x")},${await page.locator("#room-status").getAttribute("data-head-y")}`;
  const still = await head();
  await page.waitForTimeout(1500);
  expect(await head()).toBe(still);

  // Holding a key moves it; letting go stops it again.
  await page.keyboard.down("ArrowUp");
  await expect.poll(head, { timeout: 3_000 }).not.toBe(still);
  await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(700);
  const stopped = await head();
  await page.waitForTimeout(1500);
  expect(await head()).toBe(stopped);
});

test("holding the on-screen joystick at the A/B choice moves the snake; lifting the finger stops it", async ({ page }) => {
  await page.goto("/answer-room.html?q=kais-whale-is-not-a-fish&seed=2");
  await page.click("#start-btn");
  await expect(page.locator("#countdown")).toHaveText("", { timeout: 5_000 });
  const head = async (): Promise<string> =>
    `${await page.locator("#room-status").getAttribute("data-head-x")},${await page.locator("#room-status").getAttribute("data-head-y")}`;
  const still = await head();

  const disc = (await page.locator("#joystick").boundingBox())!;
  // Press on the top edge of the disc ("up") and keep holding.
  await page.mouse.move(disc.x + disc.width / 2, disc.y + 6);
  await page.mouse.down();
  await expect.poll(head, { timeout: 3_000 }).not.toBe(still);
  await page.mouse.up();
  await page.waitForTimeout(700);
  const stopped = await head();
  await page.waitForTimeout(1500);
  expect(await head()).toBe(stopped);
});

test("bumping into the Q door by accident: Keep building goes straight back in, words kept", async ({ page }) => {
  await enter(page, "start-btn");
  await steerRoomTo(page, "right");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(2, { timeout: 60_000 });
  await steerRoomTo(page, "door");
  await expect(page.locator("#door-confirm-card")).toHaveClass(/visible/, { timeout: 60_000 });
  // Same as above: compare against what's actually eaten at the door.
  const eatenAtDoor = await page.locator("#sentence-strip .word-chip:not(.upcoming)").count();
  expect(eatenAtDoor).toBeGreaterThanOrEqual(2);
  await enter(page, "door-stay-btn");
  await expect(page.locator("#question-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(eatenAtDoor);
});

test("a tap anywhere in the strip under the board steers — even well outside the joystick disc", async ({ page }) => {
  await page.click("#start-btn");
  await expect(page.locator("#countdown")).toHaveText("", { timeout: 5_000 });
  await expect(page.locator("#room-status")).toHaveAttribute("data-direction", "right");

  const strip = (await page.locator("#room-controls").boundingBox())!;
  const disc = (await page.locator("#joystick").boundingBox())!;
  const discCentreY = disc.y + disc.height / 2;
  // Far left of the strip, level with the disc's centre, well outside
  // the disc itself: "left" — a backwards tap, which turns the snake round.
  const outsideLeft = strip.x + 4;
  expect(outsideLeft).toBeLessThan(disc.x);
  await page.mouse.click(outsideLeft, discCentreY);
  await expect(page.locator("#room-status")).toHaveAttribute("data-direction", "left", { timeout: 3_000 });
});
