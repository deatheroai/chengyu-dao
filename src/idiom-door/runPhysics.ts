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
