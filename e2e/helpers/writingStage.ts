import { expect, type Page } from "@playwright/test";
import { writingStrokeData } from "../../src/idiom-door/writingData/writingStrokeData";
import { WRITER_SIZE, WRITER_PADDING } from "../../src/idiom-door/writingStage";

/**
 * Replicates hanzi-writer's own internal `Positioner` transform (see
 * its `dist/index.esm.js` — not exported, so re-derived here rather
 * than imported) to turn a character's bundled *median* stroke points
 * (writingStrokeData.ts, the same character-space coordinates
 * hanzi-writer's own quiz grading compares a drawn stroke against) into
 * actual on-screen pixels within `#writing-target`. `WRITER_SIZE`/
 * `WRITER_PADDING` are imported directly from writingStage.ts (not
 * re-guessed here) since that's the one place that actually configures
 * hanzi-writer with them — see its own doc comment for why they're
 * fixed constants rather than left to CSS/container sizing.
 *
 * `CHARACTER_BOUNDS`/`preScaledWidth`/`preScaledHeight` below are
 * hanzi-writer's own hardcoded constants ("All makemeahanzi characters
 * have the same bounding box"), copied from its source rather than
 * derived — there's nothing project-specific to compute them from.
 */
const CHARACTER_BOUNDS_FROM = { x: 0, y: -124 };
const CHARACTER_BOUNDS_TO = { x: 1024, y: 900 };
const PRE_SCALED_WIDTH = CHARACTER_BOUNDS_TO.x - CHARACTER_BOUNDS_FROM.x;
const PRE_SCALED_HEIGHT = CHARACTER_BOUNDS_TO.y - CHARACTER_BOUNDS_FROM.y;

function characterToScreenPoint(ix: number, iy: number): { x: number; y: number } {
  const effectiveWidth = WRITER_SIZE - 2 * WRITER_PADDING;
  const effectiveHeight = WRITER_SIZE - 2 * WRITER_PADDING;
  const scale = Math.min(effectiveWidth / PRE_SCALED_WIDTH, effectiveHeight / PRE_SCALED_HEIGHT);
  const xCenteringBuffer = WRITER_PADDING + (effectiveWidth - scale * PRE_SCALED_WIDTH) / 2;
  const yCenteringBuffer = WRITER_PADDING + (effectiveHeight - scale * PRE_SCALED_HEIGHT) / 2;
  const xOffset = -1 * CHARACTER_BOUNDS_FROM.x * scale + xCenteringBuffer;
  const yOffset = -1 * CHARACTER_BOUNDS_FROM.y * scale + yCenteringBuffer;
  return {
    x: ix * scale + xOffset,
    y: WRITER_SIZE - yOffset - iy * scale,
  };
}

/**
 * Traces whichever character `#writing-status` currently shows in its
 * "trace" phase — a *real* freehand pointer drag along each of that
 * character's own bundled median stroke points (writingStrokeData.ts),
 * converted to on-screen pixels via `characterToScreenPoint` above, one
 * mouse down/move.../up per stroke in order. This is genuine input
 * through hanzi-writer's own stroke-matching (not a test-only bypass —
 * there is none), and lands with 0 mistakes: a stroke drawn along its
 * own exact median trivially satisfies hanzi-writer's shape/direction
 * matching. Confirmed against the real page during development (every
 * stroke of every character in this project's idiom set advances
 * cleanly, see writingScore.ts's `characterTraceAccuracy(0) === 1`) —
 * not just assumed from the math.
 */
export async function traceCurrentCharacterPerfectly(page: Page): Promise<void> {
  await expect.poll(() => page.locator("#writing-status").getAttribute("data-phase"), { timeout: 15000 }).toBe("trace");
  const char = await page.locator("#writing-status").getAttribute("data-char");
  if (!char) throw new Error("#writing-status has no data-char while in the trace phase");
  const data = writingStrokeData[char];
  if (!data) throw new Error(`writingStrokeData has no bundled stroke data for "${char}"`);

  const targetBox = await page.locator("#writing-target").boundingBox();
  if (!targetBox) throw new Error("#writing-target has no bounding box");

  for (const median of data.medians) {
    const points = median.map(([ix, iy]) => {
      const p = characterToScreenPoint(ix, iy);
      return { x: targetBox.x + p.x, y: targetBox.y + p.y };
    });
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (let i = 1; i < points.length; i++) {
      await page.mouse.move(points[i].x, points[i].y, { steps: 3 });
    }
    await page.mouse.up();
  }
}

/**
 * Traces every one of an idiom's characters in turn — the writing/
 * tracing stage that now runs before every door level (main.ts's
 * beginWritingStage), landed here with 0 mistakes each time so the
 * door stage that follows always opens at the full starting HP
 * (writingScore.ts's `PERFECT_TRACE_STARTING_HP`). Every existing test
 * that reaches a door level needs this called first, right after
 * dismissing that level's intro card — see idiom-door.spec.ts.
 */
export async function traceWholeIdiomPerfectly(page: Page, characterCount: number): Promise<void> {
  for (let i = 0; i < characterCount; i++) {
    await traceCurrentCharacterPerfectly(page);
  }
}
