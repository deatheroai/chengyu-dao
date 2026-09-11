/**
 * Auto-runner physics for the idiom-door puzzle's 2026-08-23 redesign
 * (see CATCH_MECHANIC_PLAN.md): the child no longer steers left/right
 * or presses a grab button — the character runs forward on its own,
 * and jumping (the one remaining action) is what lets it reach the
 * floating characters along the track. Deliberately simpler than
 * `platform-catch/platformPhysics.ts` (no move direction, no multiple
 * landable surfaces) since there's nothing left to stand on here —
 * every collectible floats above the single ground line.
 */
export interface RunState {
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
}

export interface RunConfig {
  runSpeed: number;
  gravity: number;
  jumpVelocity: number;
  groundY: number;
  /**
   * 2026-09-04 feedback ("land vertical instead of curved or slow"):
   * multiplies `gravity` only while falling (vy >= 0) — rising still
   * uses `gravity` alone. >1 makes the descent measurably steeper and
   * quicker than the rise, without changing jump height (still
   * governed by `jumpVelocity`/`gravity` alone) or run speed at all —
   * the classic "float up, drop like a rock" platformer trick (Mario,
   * Celeste). A shorter fall means less time — so less horizontal
   * distance, at the same runSpeed — spent drifting sideways during
   * exactly the phase that lands on (or beside) a tile. 1 = symmetric,
   * the original behavior.
   */
  fallGravityMultiplier: number;
}

// The door stage's actual tuned physics numbers — moved here from
// IdiomDoorScene.ts 2026-09-09 (which now just imports them) so they
// can be used without pulling Phaser itself along: this module, unlike
// IdiomDoorScene.ts, is plain logic with no browser dependency, safe to
// import from a Node context that never touches a DOM. That's exactly
// what e2e/helpers/doorJump.ts needs — doorHp.ts's real per-jump HP
// cost made blind, untimed jump-spamming too HP-expensive for e2e
// coverage to keep relying on, so that helper works out precisely when
// to press jump from these same numbers instead of guessing (see its
// own doc comment).
//
// Each tile floats at its own height (levelContent.ts's HEIGHT_MIN..
// HEIGHT_MAX, ≈90-160px) rather than one uniform line — per your
// 2026-08-23 feedback that a single fixed height felt too neatly
// arranged. That whole range stays comfortably inside the jump arc's
// max height (jumpVelocity²/(2·gravity) ≈ 175px with the physics
// constants below). CATCH_RADIUS_X/Y themselves live in
// catchSelection.ts (2026-09-04) — sized from real tile/player extents
// rather than picked independently, see that file's doc comment.
// 2026-08-24 feedback: 200px/s read as "way too slow." Bumped 60% —
// the jump arc's shape (and therefore how forgiving catching is)
// doesn't depend on run speed at all, since gravity/jumpVelocity are
// unchanged; a faster run just covers more ground per second, both
// approaching a tile and during the jump arc itself.
export const RUN_SPEED = 320;
// 2026-08-31 feedback ("touch and go" — after the nearest-tile catch
// fix (2026-08-30) still left too many side-catches): the remaining
// problem wasn't just catch-zone overlap between adjacent tiles (that
// fix still stands), it was how *long* the character lingers near a
// given height. Near a parabola's apex, vertical speed is close to
// zero, so the character drifts sideways for a while while staying
// inside CATCH_RADIUS_Y of whatever height it peaked at — sweeping
// through several tiles at similar heights during one "floaty" jump.
// Scaling gravity and jumpVelocity up together by the same factor
// keeps the arc's *max height* — and therefore which tiles it can
// reach — essentially unchanged (jumpVelocity²/(2·gravity) ≈ 175px
// either way, same as the CATCH_RADIUS_Y comment above still
// describes), but shrinks the arc's *duration*: a steeper rise and
// fall means less time (so less horizontal distance, at the same
// runSpeed) spent hovering near any one height band. Time-to-apex
// drops from 0.5s to ≈0.35s (jumpVelocity/gravity), about 30% snappier.
export const JUMP_GRAVITY = 2850;
export const JUMP_VELOCITY = -1000;
// 2026-09-04 feedback ("land vertical instead of curved or slow" — the
// touch-and-go tuning above and the real-sized catch hitboxes
// (catchSelection.ts) still weren't quite enough): rather than freezing
// horizontal movement mid-jump (a bigger change to the auto-runner's
// core feel — the character always advances, jump timing and catching
// aside), the fall itself now uses stronger gravity than the rise does
// (this file's own fallGravityMultiplier) — the classic "float up, drop
// like a rock" platformer trick. Jump *height* is untouched (still
// governed by JUMP_VELOCITY/JUMP_GRAVITY alone, same ≈175px apex as
// before) — only how quickly it comes back down.
// 2026-09-11 follow-up ("the jump should come down much faster
// vertically instead of like a curve slowly... increase the downward
// motion of the jump speed"): 2x still read as a curve, not a drop —
// bumped to 4x. The descent now takes only ≈50% (1/√4) as long as the
// rise that preceded it, down from 2x's ≈71% (1/√2) — noticeably closer
// to a straight vertical fall, same "rise is a gentle arc, fall is a
// drop" shape, just leaned into harder. Still doesn't touch jump height
// or run speed, and still can't make a jump land on an *adjacent* tile:
// that's a separate, physics-independent guarantee — catchSelection.ts's
// CATCH_RADIUS_X is sized (and asserted, catchSelection.test.ts) to
// always be less than half of levelContent.ts's own MIN_SLOT_GAP, so two
// neighboring tiles' catch zones can't overlap at all, regardless of how
// fast or slow the fall between them is. What a steeper fall *does* still
// help with is the same thing 2x already did, just more of it: less time
// (so less horizontal drift, at the same runSpeed) spent descending
// through any one tile's height band, which is what actually cuts down
// on catching a wrong neighbor's zone in the first place.
export const FALL_GRAVITY_MULTIPLIER = 4;

export function stepRun(state: RunState, jumpPressed: boolean, dt: number, cfg: RunConfig): RunState {
  const nextX = state.x + cfg.runSpeed * dt;

  let vy = state.vy;
  if (state.grounded && jumpPressed) {
    vy = cfg.jumpVelocity;
  } else if (!state.grounded) {
    // Which gravity applies is decided once per frame, from this
    // frame's starting vy — the same frame-granularity every other
    // per-frame decision in this file already accepts (see the landing
    // swept-check below), not a precision concern in practice.
    const gravity = vy >= 0 ? cfg.gravity * cfg.fallGravityMultiplier : cfg.gravity;
    vy += gravity * dt;
  }

  const nextY = state.y + vy * dt;

  // Landing is a swept check (did this frame's fall path cross the
  // ground line), not "is the position currently at ground level" — the
  // same fix needed elsewhere in this project (platformPhysics.ts,
  // PlatformCatchScene's catch check) for the same reason: a big enough
  // per-frame step could otherwise skip clean over the ground between
  // one frame and the next.
  if (vy >= 0 && nextY >= cfg.groundY) {
    return { x: nextX, y: cfg.groundY, vy: 0, grounded: true };
  }
  return { x: nextX, y: nextY, vy, grounded: false };
}
