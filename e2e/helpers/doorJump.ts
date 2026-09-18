import { type Page } from "@playwright/test";
import { RUN_SPEED, JUMP_GRAVITY, JUMP_VELOCITY, FALL_GRAVITY_MULTIPLIER } from "../../src/idiom-door/runPhysics";
import { CATCH_RADIUS_X } from "../../src/idiom-door/catchSelection";
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

/**
 * Total real time (ms) a jump spends airborne, start to landing — the
 * rise to apex (`-JUMP_VELOCITY / JUMP_GRAVITY`) plus the (steeper,
 * `FALL_GRAVITY_MULTIPLIER`) fall back down from that same apex height,
 * independent of which tile (if any) it actually catches along the way
 * — `stepRun`'s own trajectory only cares about `grounded`/`vy`, never
 * what got caught. IdiomDoorScene only accepts a jump input while
 * `grounded` (see its own `jumpExecuting` check) — a press while still
 * airborne from a *previous* jump is silently swallowed, not queued.
 * `jumpForTile` below waits out this whole duration after its own press
 * before returning, so a caller chaining several aimed jumps back to
 * back (catchCharacter, jumpForFirstReachableWrongTile) never fires a
 * second press before the runner has actually landed from the first —
 * discovered 2026-09-10 as the real cause of an intermittent "pressed
 * but nothing happened" miss on a level whose tiles happened to sit
 * close enough together that the old fixed ~150ms settle wait wasn't
 * long enough for the *previous* jump to land before this helper judged
 * it time to press the next one.
 */
const JUMP_FLIGHT_DURATION_MS = (() => {
  const apexTimeS = -JUMP_VELOCITY / JUMP_GRAVITY;
  const apexHeight = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * JUMP_GRAVITY);
  const fallTimeS = Math.sqrt((2 * apexHeight) / (JUMP_GRAVITY * FALL_GRAVITY_MULTIPLIER));
  return (apexTimeS + fallTimeS) * 1000;
})();
/** Small buffer on top of `JUMP_FLIGHT_DURATION_MS` for real frame
 * timing/polling slop, so this helper doesn't race the game's own
 * landing frame. */
const LANDING_SETTLE_BUFFER_MS = 80;

/**
 * Total horizontal distance one jump's own arc covers, start (takeoff)
 * to landing — `JUMP_FLIGHT_DURATION_MS` converted to world px at
 * `RUN_SPEED`. `jumpForFirstReachableWrongTile` below uses this,
 * combined with each candidate's own `takeoffXForTile`, to work out
 * that jump's real swept range: `checkCatches` runs every frame of a
 * jump's *whole* arc, not just at the one candidate tile it was aimed
 * at (see this file's own top doc comment and IdiomDoorScene's
 * matching comment on `checkCatches`) — so a "wrong" candidate whose
 * own arc sweeps close to the *excluded* (the actually-needed) tile
 * risks chain-catching that excluded tile too, especially when both
 * tiles sit near the jump's own apex height (where the character
 * lingers longest, covering the most horizontal ground before landing
 * — see runPhysics.ts's own `FALL_GRAVITY_MULTIPLIER` doc comment on
 * this "touch and go" effect). That turns a deliberate wrong catch
 * into an accidental *correct* one — the opposite of what a caller
 * asking for a guaranteed wrong catch needs. Found 2026-09-11 as a
 * genuine, 100%-reproducible gap for a level layout that happened to
 * pack a non-matching tile this close ahead of the next-needed one.
 */
const JUMP_FOOTPRINT_X = (JUMP_FLIGHT_DURATION_MS / 1000) * RUN_SPEED;

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
 *
 * After a real press, waits out the jump's own full airborne duration
 * (`JUMP_FLIGHT_DURATION_MS` + a settle buffer) before resolving —
 * IdiomDoorScene only accepts a jump input while grounded, so a caller
 * that chains another `jumpForTile` call immediately after this one
 * returns is guaranteed the runner has actually landed by then, not
 * still mid-arc from *this* press (see `JUMP_FLIGHT_DURATION_MS`'s own
 * doc comment for how that silent "pressed but nothing happened" miss
 * was found).
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
      await page.waitForTimeout(JUMP_FLIGHT_DURATION_MS + LANDING_SETTLE_BUFFER_MS);
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

/**
 * Jumps for the first still-reachable tile whose char *isn't*
 * `excludeChar` — guaranteed "wrong" per orderedCatchProgress.ts's
 * strict ordering, whichever character it actually belongs to (used by
 * idiom-door.spec.ts's deliberate-wrong-catch HP tests). Also excludes
 * any candidate within one jump's own footprint (`JUMP_FOOTPRINT_X`) of
 * an *excluded*-char tile — see that constant's own doc comment for why
 * a candidate too close to the actually-needed tile risks chain-catching
 * it instead, defeating the whole point of a *deliberate* wrong catch.
 * Tries each remaining candidate in track order rather than trusting a
 * single caller-computed one's timing margin, same "skip a miss and try
 * the next one" shape as `catchCharacter` above and for the same
 * reason: the async round-trip to read the runner's position and pick a
 * candidate can itself eat into whatever margin looked safe at
 * selection time — especially under load — so a genuine miss on the
 * nearest candidate shouldn't fail the whole test when a later,
 * still-reachable one would have worked. Throws if every candidate
 * before the level's own end is missed, since that's a real bug worth
 * failing loudly on (see `jumpForTile`'s own doc comment).
 *
 * A candidate's own real danger zone is its actual jump arc — from its
 * `takeoffXForTile` through to that same point plus `JUMP_FOOTPRINT_X`
 * — not a flat margin around its landing x. That distinction matters
 * because takeoff sits *behind* a tile's own x by an amount that grows
 * with the tile's height (`timeToReachHeight` is larger for a taller
 * tile — up to ~79px behind at `HEIGHT_MAX`, vs. ~34px at `HEIGHT_MIN`).
 * A previous version of this filter used one flat back-margin (60px)
 * for every candidate regardless of height, which was simultaneously
 * too narrow for taller candidates (their real takeoff sat further
 * back than the margin covered, letting an excluded tile just behind
 * that point slip through and get chain-caught for real — confirmed
 * 2026-09-14 on a 明察秋毫 level, mobile: a "wrong" catch aimed away
 * from 明 also caught a real 明 tile ~70px behind it) and too wide for
 * shorter ones (over-excluding candidates that were never actually at
 * risk, confirmed the same day, desktop: every remaining candidate on
 * a 明-heavy level got excluded, leaving none to jump for at all).
 * Computing each candidate's own arc directly, with a small
 * `CATCH_RADIUS_X` pad on both ends (the same real hitbox
 * `checkCatches` itself hit-tests against, not a guessed number), gets
 * both cases right without trading one off against the other.
 */
export async function jumpForFirstReachableWrongTile(
  page: Page,
  tiles: LevelCharacterTile[],
  excludeChar: string,
  press: JumpPresser = pressSpaceKey,
): Promise<LevelCharacterTile> {
  const excludedTiles = tiles.filter((t) => t.char === excludeChar);
  const candidates = tiles
    .filter((t) => t.char !== excludeChar)
    .filter((t) => {
      const arcStart = takeoffXForTile(t) - CATCH_RADIUS_X;
      const arcEnd = takeoffXForTile(t) + JUMP_FOOTPRINT_X + CATCH_RADIUS_X;
      return !excludedTiles.some((ex) => ex.x > arcStart && ex.x < arcEnd);
    })
    .sort((a, b) => a.x - b.x);
  for (const tile of candidates) {
    const result = await jumpForTile(page, tile, 30000, press);
    if (result === "pressed") return tile;
  }
  throw new Error(`jumpForFirstReachableWrongTile: no reachable tile (excluding "${excludeChar}", and far enough from it to avoid a chain-catch) could be caught before the level ended`);
}
