/**
 * Which floating tile a frame's movement actually catches (IdiomDoorScene's
 * checkCatches) — split out as a pure function (same "pure logic module +
 * thin Scene wiring" split as orderedCatchProgress.ts/runPhysics.ts) so the
 * selection rule itself is unit-testable without a Phaser harness.
 *
 * 2026-08-30 fix: this used to just take the *first* candidate that fell
 * within catch range, in whatever order the caller's tile list happened to
 * be in (left-to-right by track position) — not the nearest one. Picking
 * the *nearest* candidate to the character's actual end-of-frame position
 * fixed that (see git history), but reported live afterward: still
 * catching a tile beside the intended one. The touch-and-go jump-arc
 * tuning (IdiomDoorScene's JUMP_GRAVITY/JUMP_VELOCITY, 2026-08-31) helped
 * but didn't fully close it either.
 *
 * 2026-09-04 fix ("how does Mario do it?"): the actual remaining cause —
 * CATCH_RADIUS_X/Y below used to be a flat, generous "forgiveness" radius
 * (±70px/±80px) chosen independent of anything's real rendered size, on
 * top of an already-forgiving jump arc. Two problems with that: (1) with
 * tiles only ~110px apart at minimum (levelContent.ts's MIN_SLOT_GAP), a
 * ±70px X radius meant two adjacent tiles' catch zones could still overlap
 * (2*70=140 > 110) even after the nearest-candidate fix — "nearest" only
 * helps once both zones are already competing for the same frame; (2)
 * ±80px on the Y axis is wider than the *entire* height range tiles are
 * drawn from (levelContent.ts's HEIGHT_MIN..HEIGHT_MAX spans only 70px),
 * so height essentially never disqualified anything — every tile within
 * X range was also always within Y range, regardless of how different its
 * actual height was.
 *
 * Real platformers (Mario included) don't catch/hit-test with an
 * independent "forgiveness blob" like that — they overlap-test each
 * object's own actual collision box against the player's, sized close to
 * their real rendered footprint. Doing the same here: CATCH_RADIUS_X/Y are
 * now sized from an assumed player hitbox half-extent plus each tile's own
 * half-extent (tiles render at 60x60 — IdiomDoorScene's TILE_SIZE — so a
 * 30px half-extent), not a number picked independently of either. That
 * change does two things at once: (1) on X, it's now provably impossible
 * for two minimum-gap tiles' catch zones to overlap at all (see the
 * MIN_SLOT_GAP invariant test in catchSelection.test.ts) — no more "which
 * one wins" question to even ask; (2) on Y, height differences between
 * tiles now actually discriminate — a jump timed for one tile's height no
 * longer automatically also qualifies for a same-x neighbor sitting
 * 60-70px higher or lower, the way it used to. The touch-and-go arc
 * tuning still matters too — it's what makes a *well-aimed* jump land
 * inside this tighter window reliably instead of sailing past it.
 */
export interface CatchPoint {
  x: number;
  y: number;
}

// Tiles render at 60x60 (IdiomDoorScene's TILE_SIZE) — 30px half-extent.
// The assumed player hitbox half-extent (24px) is deliberately a bit
// smaller than the character's own rendered size (IdiomDoorScene's
// CHAR_SIZE=64, i.e. a 32px half-extent) — standard platformer practice:
// a collision box a little tighter than the visible sprite reads as fair
// ("I was clearly still touching it") rather than a hitbox that extends
// past what's actually drawn.
const TILE_HALF_EXTENT = 30;
const PLAYER_HITBOX_HALF_EXTENT_X = 15;
const PLAYER_HITBOX_HALF_EXTENT_Y = 20;
export const CATCH_RADIUS_X = TILE_HALF_EXTENT + PLAYER_HITBOX_HALF_EXTENT_X;
export const CATCH_RADIUS_Y = TILE_HALF_EXTENT + PLAYER_HITBOX_HALF_EXTENT_Y;

/**
 * `prev`/`current` bound the frame's whole movement segment, not just the
 * end position — same swept-check reasoning as runPhysics.ts's landing
 * check: a big enough per-frame step could otherwise let the character's
 * arc skip clean past a tile between one frame and the next.
 */
export function pickCatchCandidate<T extends CatchPoint>(
  candidates: readonly T[],
  prev: CatchPoint,
  current: CatchPoint,
  catchRadiusX: number,
  catchRadiusY: number,
): T | undefined {
  const minX = Math.min(prev.x, current.x) - catchRadiusX;
  const maxX = Math.max(prev.x, current.x) + catchRadiusX;
  const minY = Math.min(prev.y, current.y) - catchRadiusY;
  const maxY = Math.max(prev.y, current.y) + catchRadiusY;

  let nearest: T | undefined;
  let nearestDistSq = Infinity;
  for (const candidate of candidates) {
    if (candidate.x < minX || candidate.x > maxX || candidate.y < minY || candidate.y > maxY) continue;
    // Distance to where the character actually ended up this frame —
    // "whichever tile you're really closest to right now," not
    // "whichever tile happened to come first in the list."
    const dx = candidate.x - current.x;
    const dy = candidate.y - current.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = candidate;
    }
  }
  return nearest;
}
