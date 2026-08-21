/**
 * Hand-rolled platformer physics (Phase 2, CATCH_MECHANIC_PLAN.md) —
 * deliberately not a full physics engine (no Arcade/Matter plugin, no
 * multi-body collision resolution): one character, gravity, a jump
 * arc, and landing on flat surfaces. That's the whole scope Phase 2
 * needs, and keeping it a plain pure function (rather than reaching for
 * Phaser's physics plugin) means it's fully unit-testable without a
 * canvas, same "pure logic + thin view" split as every prior snippet.
 */

/** A flat landable surface (the ground, or a platform top). `y` is a
 * screen coordinate — smaller values are higher up, matching Phaser's
 * (and every browser canvas's) y-axis. */
export interface Surface {
  xMin: number;
  xMax: number;
  y: number;
}

export interface PhysicsState {
  x: number;
  /** The character's "feet" position. */
  y: number;
  vy: number;
  grounded: boolean;
}

export interface PhysicsInput {
  moveDir: -1 | 0 | 1;
  jumpPressed: boolean;
}

export interface PhysicsConfig {
  gravity: number;
  moveSpeed: number;
  /** Negative — an upward jump launch velocity. */
  jumpVelocity: number;
  minX: number;
  maxX: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Is `x` within a surface's horizontal span at exactly its height `y`? */
function supportedAt(x: number, y: number, surfaces: Surface[]): boolean {
  return surfaces.some((s) => s.y === y && x >= s.xMin && x <= s.xMax);
}

export function stepPhysics(state: PhysicsState, input: PhysicsInput, surfaces: Surface[], dt: number, cfg: PhysicsConfig): PhysicsState {
  const nextX = clamp(state.x + input.moveDir * cfg.moveSpeed * dt, cfg.minX, cfg.maxX);

  let vy = state.vy;
  let grounded = state.grounded;

  if (grounded && input.jumpPressed) {
    vy = cfg.jumpVelocity;
    grounded = false;
  } else if (grounded && supportedAt(nextX, state.y, surfaces)) {
    // Still standing on whatever was underfoot — including walking
    // across a platform's own span — so vertical velocity stays at rest.
    vy = 0;
  } else {
    // Either wasn't grounded already, or just walked off a platform's
    // edge this frame: either way, falling starts now.
    grounded = false;
    vy += cfg.gravity * dt;
  }

  const prevY = state.y;
  const nextY = prevY + vy * dt;

  // Landing: a swept check (did this frame's fall path cross a
  // surface's height), not "is the position currently at that height" —
  // the same fix CatchScene needed for its falling icons, for the same
  // reason: a big-enough per-frame step could otherwise skip clean over
  // a thin surface between one frame and the next.
  if (vy >= 0) {
    for (const s of surfaces) {
      if (nextX < s.xMin || nextX > s.xMax) continue;
      if (prevY <= s.y && nextY >= s.y) {
        return { x: nextX, y: s.y, vy: 0, grounded: true };
      }
    }
  }

  return { x: nextX, y: nextY, vy, grounded };
}
