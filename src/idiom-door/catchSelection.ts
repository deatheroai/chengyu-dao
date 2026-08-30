/**
 * Which floating tile a frame's movement actually catches (IdiomDoorScene's
 * checkCatches) — split out as a pure function (same "pure logic module +
 * thin Scene wiring" split as orderedCatchProgress.ts/runPhysics.ts) so the
 * selection rule itself is unit-testable without a Phaser harness.
 *
 * 2026-08-30 fix: this used to just take the *first* candidate that fell
 * within catch range, in whatever order the caller's tile list happened to
 * be in (left-to-right by track position) — not the nearest one. With
 * levelContent.ts's tiles only ~110px apart at minimum (MIN_SLOT_GAP) and
 * a ±70px catch radius on each axis, two adjacent tiles' catch zones
 * genuinely overlap by design (the radius is generous on purpose, so a
 * mistimed jump still catches something) — but "first in left-to-right
 * order" then meant a jump aimed at one tile could resolve against its
 * neighbor instead, purely because that neighbor happened to sort earlier
 * in the list, not because it was actually the one the child was jumping
 * toward. Reported live: "the first two and last two characters appearing
 * side by side... very easy to accidentally touch the next character."
 * Picking the *nearest* candidate to the character's actual end-of-frame
 * position fixes that without needing to shrink the catch radius (and
 * therefore without making a well-timed jump any less forgiving).
 */
export interface CatchPoint {
  x: number;
  y: number;
}

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
