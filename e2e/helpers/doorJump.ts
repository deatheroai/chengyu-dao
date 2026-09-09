import { type Page } from "@playwright/test";
import { RUN_SPEED, JUMP_GRAVITY, JUMP_VELOCITY } from "../../src/idiom-door/runPhysics";
import type { DoorLevel, LevelCharacterTile } from "../../src/idiom-door/levelContent";

/**
 * The door stage's own doorHp.ts real HP gate (2026-09-09) made this
 * project's earlier, blind "just spam jump on an interval" e2e strategy
 * (idiom-door.spec.ts's original `spamJumpUntil`) too HP-expensive to
 * rely on — most blind presses land on nothing at all, and each one
 * still costs `JUMP_HP_COST`, easily draining a level's whole starting
 * HP pool before every character is caught. This module replaces it
 * with *aimed* jumps: given a tile's own known world position
 * (levelContent.ts's already-authored, deterministic layout — no
 * screen reading involved), it works out exactly when the runner needs
 * to leave the ground for that tile's own jump arc (IdiomDoorScene's
 * exported RUN_SPEED/JUMP_GRAVITY/JUMP_VELOCITY — the same physics
 * `stepRun`/`checkCatches` actually use) to cross the tile's height
 * right where the tile sits, then presses jump at that moment. One
 * correctly-timed press reliably lands within catchSelection.ts's own
 * CATCH_RADIUS_X/Y window — no per-frame reading of the game's real
 * position needed to *aim*, only #player-position to know when "now" is.
 */

/** Time (s) from takeoff until the jump's *rising* side first reaches
 * `height` px above the ground — the smaller root of the arc's own
 * parabola (`0.5·g·t² - v·t + h = 0`, `v = -JUMP_VELOCITY`). Targeting
 * the rise (not the fall, which uses IdiomDoorScene's steeper
 * `FALL_GRAVITY_MULTIPLIER`) mirrors `HEIGHT_MAX` sitting comfortably
 * under the arc's apex (`v²/(2·JUMP_GRAVITY)` ≈ 175px, per
 * IdiomDoorScene's own doc comment) either way. */
function timeToReachHeight(height: number): number {
  const v = -JUMP_VELOCITY;
  const discriminant = v * v - 2 * JUMP_GRAVITY * height;
  if (discriminant < 0) {
    throw new Error(`height ${height} is above this jump's own apex (${((v * v) / (2 * JUMP_GRAVITY)).toFixed(1)}px) — can never be reached`);
  }
  return (v - Math.sqrt(discriminant)) / JUMP_GRAVITY;
}

/** The world-space x a jump needs to be *initiated* at for its rising
 * arc to cross `tile.height` right at `tile.x` — see
 * `timeToReachHeight` above. */
export function takeoffXForTile(tile: Pick<LevelCharacterTile, "x" | "height">): number {
  return tile.x - RUN_SPEED * timeToReachHeight(tile.height);
}

/** How close (world px) to the ideal takeoff point a press needs to
 * land — comfortably inside catchSelection.ts's own CATCH_RADIUS_X
 * (45px), so a press's own timing slop doesn't eat into the real catch
 * mechanic's already-tight tolerance. At RUN_SPEED, 15px is ≈47ms —
 * well within this helper's own polling cadence below. */
const TAKEOFF_TOLERANCE_X = 15;
/** If the runner's already run this far past the ideal takeoff point
 * without a press landing (polling lag, or the tile's simply already
 * behind us), give up on this tile rather than pressing hopelessly
 * late — the caller tries this character's next repeat instead. */
const GIVE_UP_PAST_TAKEOFF_X = 60;

async function playerX(page: Page): Promise<number> {
  return Number(await page.locator("#player-position").getAttribute("data-x"));
}

/** How a jump is actually triggered — the real keyboard `down`/`up`
 * idiom-door.spec.ts's original `tapJump` already used (a `JustDown`
 * edge Phaser's input system picks up the next frame) by default, or
 * `pressJumpButton` below for exercising the on-screen JUMP button's
 * own separate input path (`main.ts`'s `requestJump` wiring) instead. */
export type JumpPresser = (page: Page) => Promise<void>;

export async function pressSpaceKey(page: Page): Promise<void> {
  await page.keyboard.down("Space");
  await page.waitForTimeout(60);
  await page.keyboard.up("Space");
}

export async function pressJumpButton(page: Page): Promise<void> {
  await page.locator("#jump-btn").dispatchEvent("pointerdown");
}

/**
 * Presses jump at the moment the runner reaches `tile`'s own computed
 * takeoff point. Polls `#player-position` tightly (not a fixed sleep —
 * see this project's other position-polling test helpers) until it's
 * within `TAKEOFF_TOLERANCE_X`, then presses once via `press` (defaults
 * to `pressSpaceKey`; pass `pressJumpButton` to exercise the on-screen
 * control's own input path instead), timed instead of blind. Resolves
 * "missed" without ever pressing if the runner's already past the
 * window (or the deadline elapses) — no jump means no HP spent chasing
 * a tile the timing already missed.
 */
export async function jumpForTile(
  page: Page,
  tile: Pick<LevelCharacterTile, "x" | "height">,
  maxWaitMs = 30000,
  press: JumpPresser = pressSpaceKey,
): Promise<"pressed" | "missed"> {
  const takeoffX = takeoffXForTile(tile);
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const px = await playerX(page);
    if (px > takeoffX + GIVE_UP_PAST_TAKEOFF_X) return "missed";
    if (px >= takeoffX - TAKEOFF_TOLERANCE_X) {
      await press(page);
      return "pressed";
    }
    await page.waitForTimeout(20);
  }
  return "missed";
}

/**
 * Catches the door puzzle's current next-needed character
 * (`#door-status`'s `data-next-index`) by trying each of its own tiles
 * — a level has several (levelContent.ts's MIN/MAX_REPEATS_PER_CHARACTER)
 * — in track order, skipping straight past any already behind the
 * runner. Throws if the runner reaches the last one without ever
 * advancing, since that's a real bug worth failing loudly on (a
 * correctly-aimed jump should land every time — see this file's own
 * doc comment and writingScore.ts's `PERFECT_TRACE_STARTING_HP`, the
 * HP a caller that's traced perfectly first opens the door stage with).
 */
export async function catchCharacter(page: Page, level: DoorLevel, charIndex: number, press: JumpPresser = pressSpaceKey): Promise<void> {
  const char = Array.from(level.idiom.hanzi)[charIndex];
  const tiles = level.tiles.filter((t) => t.char === char).sort((a, b) => a.x - b.x);

  for (const tile of tiles) {
    if (Number(await page.locator("#door-status").getAttribute("data-next-index")) > charIndex) return;
    const result = await jumpForTile(page, tile, 30000, press);
    if (result === "missed") continue;
    // Give the frame(s) right after the press a moment to actually
    // resolve the catch check before reading the outcome.
    await page.waitForTimeout(150);
    if (Number(await page.locator("#door-status").getAttribute("data-next-index")) > charIndex) return;
  }
  throw new Error(`catchCharacter: never advanced past character ${charIndex} ("${char}") across all ${tiles.length} of its tiles`);
}

/** Catches every one of a door level's characters in order — see
 * `catchCharacter` above. */
export async function solveDoorLevel(page: Page, level: DoorLevel, press: JumpPresser = pressSpaceKey): Promise<void> {
  const chars = Array.from(level.idiom.hanzi);
  for (let i = 0; i < chars.length; i++) {
    await catchCharacter(page, level, i, press);
  }
}
