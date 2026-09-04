import { describe, it, expect } from "vitest";
import { pickCatchCandidate, CATCH_RADIUS_X, CATCH_RADIUS_Y } from "./catchSelection";
import { MIN_SLOT_GAP, HEIGHT_MIN, HEIGHT_MAX } from "./levelContent";

// These tests exercise pickCatchCandidate's own selection rule against
// fixed, arbitrary radii — not the real production CATCH_RADIUS_X/Y
// (asserted separately below) — so they stay meaningful regardless of
// how those get tuned.
const RADIUS_X = 70;
const RADIUS_Y = 80;

describe("pickCatchCandidate", () => {
  it("returns undefined when nothing is in range", () => {
    const candidates = [{ x: 1000, y: 100 }];
    const picked = pickCatchCandidate(candidates, { x: 0, y: 100 }, { x: 10, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBeUndefined();
  });

  it("picks the single in-range candidate", () => {
    const candidates = [{ x: 200, y: 100 }];
    const picked = pickCatchCandidate(candidates, { x: 150, y: 100 }, { x: 195, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBe(candidates[0]);
  });

  // The exact scenario reported live: two tiles close enough (this
  // repo's real minimum gap, levelContent.ts's MIN_SLOT_GAP = 110px)
  // that both fall within the catch radius (70px) of the character's
  // position at once — the nearer one must win, regardless of which
  // one comes first in the candidates array.
  it("picks the nearer of two candidates both in range, not just the first in the array", () => {
    const near = { x: 210, y: 100 };
    const far = { x: 320, y: 100 };
    // far listed first — if this passed by accident of array order
    // rather than genuine distance comparison, this test would catch it.
    const candidates = [far, near];
    const picked = pickCatchCandidate(candidates, { x: 180, y: 100 }, { x: 205, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBe(near);
  });

  it("picks the nearer candidate even when the nearer one is listed last", () => {
    const near = { x: 210, y: 100 };
    const far = { x: 320, y: 100 };
    const candidates = [near, far];
    const picked = pickCatchCandidate(candidates, { x: 180, y: 100 }, { x: 205, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBe(near);
  });

  it("uses distance to the end-of-frame position, not the start-of-frame one", () => {
    const behind = { x: 50, y: 100 };
    const ahead = { x: 150, y: 100 };
    const candidates = [behind, ahead];
    // Character started right next to "behind" but ended right next to
    // "ahead" — "ahead" is who the frame's movement actually reached.
    const picked = pickCatchCandidate(candidates, { x: 55, y: 100 }, { x: 145, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBe(ahead);
  });

  it("catches a candidate the swept segment passed through even if neither endpoint is that close (big frame delta)", () => {
    const candidates = [{ x: 500, y: 100 }];
    // A big single-frame jump from x=400 to x=600 sweeps straight
    // through x=500 — same "don't skip past a tile between frames"
    // reasoning as runPhysics.ts's landing check.
    const picked = pickCatchCandidate(candidates, { x: 400, y: 100 }, { x: 600, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBe(candidates[0]);
  });

  it("respects the y-axis radius independently of x", () => {
    const tooHigh = { x: 200, y: -100 };
    const candidates = [tooHigh];
    const picked = pickCatchCandidate(candidates, { x: 180, y: 100 }, { x: 205, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked).toBeUndefined();
  });

  it("preserves extra properties on the winning candidate (real caller shape)", () => {
    const tile = { id: "tile-1", x: 200, y: 100 };
    const candidates = [tile];
    const picked = pickCatchCandidate(candidates, { x: 180, y: 100 }, { x: 205, y: 100 }, RADIUS_X, RADIUS_Y);
    expect(picked?.id).toBe("tile-1");
  });
});

// 2026-09-04 ("how does Mario do it?"): these guard the actual production
// CATCH_RADIUS_X/Y against ever drifting back into "generous forgiveness
// blob, independent of anything real" territory — see catchSelection.ts's
// doc comment for the full reasoning.
describe("CATCH_RADIUS_X/Y against real level geometry", () => {
  it("makes it provably impossible for two minimum-gap tiles' catch zones to overlap on the x-axis", () => {
    // Two catch zones (each spanning a tile's x +-CATCH_RADIUS_X) can only
    // touch or overlap if the tiles' centers are within 2*CATCH_RADIUS_X
    // of each other. levelContent.ts guarantees every real pair of tiles
    // is at least MIN_SLOT_GAP apart, so this must stay strictly smaller.
    expect(2 * CATCH_RADIUS_X).toBeLessThan(MIN_SLOT_GAP);
  });

  it("makes height actually discriminate between two same-x tiles at opposite ends of the height range", () => {
    // Before this fix, CATCH_RADIUS_Y (80) exceeded the whole HEIGHT_MIN..
    // HEIGHT_MAX span (70), so a jump timed for one tile's height was
    // *always* also within range of a same-x tile at the opposite extreme
    // of the height range — height differences never actually mattered.
    const heightSpan = HEIGHT_MAX - HEIGHT_MIN;
    expect(CATCH_RADIUS_Y).toBeLessThan(heightSpan);
  });
});
