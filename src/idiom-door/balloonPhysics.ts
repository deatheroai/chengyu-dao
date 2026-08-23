/**
 * Free 2D "floaty" movement for the balloon-sentence stage (per your
 * 2026-08-25 request: a stage after each idiom where the child catches
 * balloons floating in the sky). Deliberately not the door puzzle's
 * auto-run + jump — you chose free-drift movement here, closer to
 * actually steering around a sky than running along a track, so this
 * is its own small physics module rather than a reuse of `runPhysics.ts`.
 *
 * Acceleration + drag (rather than instant velocity) is what gives the
 * "floaty" feel: input nudges the avatar's velocity, drag gradually
 * bleeds it off, so movement has a bit of weight/momentum instead of
 * snapping to a fixed speed the way the door puzzle's run does.
 */
export interface FlightState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface FlightBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface FlightConfig {
  accel: number;
  maxSpeed: number;
  /** Fraction of velocity removed per second (0-1); higher = snappier stop. */
  drag: number;
  bounds: FlightBounds;
}

/**
 * A continuous direction, not four booleans — per your 2026-08-26
 * feedback, movement is driven by dragging the avatar directly (or
 * steering toward wherever the pointer is) rather than pressing
 * discrete up/down/left/right buttons, so the input itself needs to
 * support any angle, not just the 8 a button-based scheme allows.
 * Keyboard arrows/WASD still work too — the Scene just maps them to
 * `ax`/`ay` of exactly -1, 0, or 1. Each axis should stay within
 * [-1, 1]; `stepFlight` defensively re-normalizes if the combined
 * magnitude exceeds 1 (e.g. an unnormalized "toward the pointer"
 * vector), so callers don't have to get that exactly right themselves.
 */
export interface FlightInput {
  ax: number;
  ay: number;
}

export function stepFlight(state: FlightState, input: FlightInput, dt: number, cfg: FlightConfig): FlightState {
  let ax = input.ax;
  let ay = input.ay;
  const inputMagnitude = Math.hypot(ax, ay);
  if (inputMagnitude > 1) {
    ax /= inputMagnitude;
    ay /= inputMagnitude;
  }

  let vx = state.vx + ax * cfg.accel * dt;
  let vy = state.vy + ay * cfg.accel * dt;

  const dragFactor = Math.max(0, 1 - cfg.drag * dt);
  vx *= dragFactor;
  vy *= dragFactor;

  const speed = Math.hypot(vx, vy);
  if (speed > cfg.maxSpeed) {
    const scale = cfg.maxSpeed / speed;
    vx *= scale;
    vy *= scale;
  }

  let x = state.x + vx * dt;
  let y = state.y + vy * dt;

  // Clamp to the sky area rather than letting the avatar fly off
  // screen — and zero the offending velocity component so it doesn't
  // feel like hitting a wall of glue (still stops, just doesn't fight
  // the clamp every subsequent frame).
  if (x < cfg.bounds.minX) {
    x = cfg.bounds.minX;
    vx = 0;
  } else if (x > cfg.bounds.maxX) {
    x = cfg.bounds.maxX;
    vx = 0;
  }
  if (y < cfg.bounds.minY) {
    y = cfg.bounds.minY;
    vy = 0;
  } else if (y > cfg.bounds.maxY) {
    y = cfg.bounds.maxY;
    vy = 0;
  }

  return { x, y, vx, vy };
}
