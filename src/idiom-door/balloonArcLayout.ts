/**
 * Arranges a small set of balloon "slots" along a real circular arc — a
 * rainbow shape — rather than the old grid, per "curve the balloon so
 * they don't take up so much horizontal space... it should curve like a
 * rainbow" (2026-09-08).
 *
 * 2026-09-08 (later): the first version of this file used a zigzag
 * (alternating slots above/below a shared curve) to try to shrink the
 * horizontal step below what a flat row needs, on top of an overly
 * conservative "sum both axes" safe-distance. That combination inflated
 * the world far past what the balloons actually needed, scattering 3 of
 * 4 candidates outside the camera's starting view and not reading as a
 * curve at all — reported live as "balloons are missing." Replaced with
 * a plain, honest circular arc: every slot sits at an equal angular step
 * around one circle, radius chosen so that step is exactly `minSpacing`
 * apart (a rainbow's shape *is* the safety margin here — no separate
 * zigzag trick layered on top).
 *
 * Returns offsets relative to the circle's own center (0, 0); the caller
 * (BalloonSentenceScene.layoutBalloons) translates these into actual
 * world-space positions once it knows where that center sits.
 */
export interface ArcLayoutOptions {
  /** Minimum center-to-center distance any two *angularly-adjacent*
   * slots must end up at least this far apart. The caller sizes this
   * to already include room for whatever gets layered on top afterward
   * (jitter, wind drift) — this function only guarantees the *base*
   * slot centers clear it. */
  minSpacing: number;
  /** Angular step between adjacent slots, in degrees. Also controls the
   * overall silhouette: a wider step reads as a tighter curl, a
   * narrower one as a flatter, wider rainbow. */
  angleStepDeg?: number;
}

export interface ArcSlot {
  dx: number;
  dy: number;
}

const DEFAULT_ANGLE_STEP_DEG = 26;
// Chord length between two points on a circle is a monotonically
// increasing function of their angular separation only up to 180° — past
// that it starts shrinking again, which would silently break the "every
// pair is at least minSpacing apart" guarantee for a large enough count.
// Capping the *total* span well under 180° keeps every pair (not just
// angularly-adjacent ones) safely governed by the adjacent-pair spacing
// below, for any realistic candidate count this game ever hands it.
const MAX_TOTAL_SPAN_DEG = 150;

export function computeArcSlots(count: number, options: ArcLayoutOptions): ArcSlot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ dx: 0, dy: 0 }];

  const { minSpacing, angleStepDeg = DEFAULT_ANGLE_STEP_DEG } = options;
  const maxIndex = count - 1;
  const stepDeg = Math.min(angleStepDeg, MAX_TOTAL_SPAN_DEG / maxIndex);
  const stepRad = (stepDeg * Math.PI) / 180;

  // Chord length for two points stepRad apart on a circle of radius R is
  // 2R·sin(stepRad/2) — solved for R so that equals minSpacing exactly,
  // same "the formula that determines the shape *is* the proof," not a
  // hand-tuned constant checked afterward.
  const radius = minSpacing / (2 * Math.sin(stepRad / 2));
  const startRad = -((maxIndex * stepRad) / 2);

  return Array.from({ length: count }, (_, i) => {
    const angle = startRad + i * stepRad;
    // angle = 0 (the middle of the arc) sits at the top — dy = -radius,
    // the smallest (highest) value — with the two ends settling back
    // down toward the baseline, the actual rainbow silhouette.
    return { dx: radius * Math.sin(angle), dy: -radius * Math.cos(angle) };
  });
}
