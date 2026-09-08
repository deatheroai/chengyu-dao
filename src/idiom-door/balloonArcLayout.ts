/**
 * Arranges a small set of balloon "slots" along a gentle arc rather than
 * the old grid — per your "curve the balloons so they don't take up so
 * much horizontal space" feedback (2026-09-08). A flat row (or a wide
 * grid column) needs each adjacent pair's *entire* clearance to come from
 * horizontal spacing alone; this instead alternates every other slot
 * slightly above/below a shared "bouquet" curve, so an adjacent pair's
 * clearance comes from both axes at once, letting the horizontal step
 * shrink well below what a flat row would need for the same minimum
 * spacing — the same balloon count reads taller and narrower.
 *
 * Returns offsets relative to an arbitrary center (0, 0); the caller
 * (BalloonSentenceScene.layoutBalloons) translates these into actual
 * world-space positions once it knows where that center sits.
 *
 * Safety is enforced by construction, not by hand-tuning the constants
 * below: the raw curve is laid out once, every pairwise distance is
 * checked, and if the tightest pair falls short of `minSpacing`, every
 * offset is scaled up by exactly the ratio needed to fix that — a single
 * corrective pass (distances scale linearly with a uniform scale of the
 * offsets, so no iteration/fiddling is needed), not a hopeful guess. See
 * balloonArcLayout.test.ts for the invariant check against this game's
 * real jitter/drift ranges.
 */
export interface ArcLayoutOptions {
  /** Minimum center-to-center distance any two slots must end up at
   * least this far apart. The caller sizes this to already include
   * room for whatever gets layered on top afterward (jitter, wind
   * drift) — this function only guarantees the *base* slot centers
   * clear it. */
  minSpacing: number;
  /** Base horizontal step between adjacent slots, as a fraction of
   * minSpacing — deliberately less than 1 (a flat row's requirement),
   * since the alternating vertical offset below supplies the rest of
   * each adjacent pair's clearance. */
  stepXFraction?: number;
  /** Vertical offset applied to alternating slots, as a fraction of
   * minSpacing. */
  rowOffsetFraction?: number;
  /** Extra whole-arc "bouquet" depth (independent of the alternating
   * per-slot offset above) — the middle slots sit this much higher than
   * the outer ones, as a fraction of minSpacing. Purely cosmetic (the
   * safety correction pass scales it along with everything else, so it
   * never fights the min-spacing guarantee). */
  curveDepthFraction?: number;
}

export interface ArcSlot {
  dx: number;
  dy: number;
}

const DEFAULT_STEP_X_FRACTION = 0.5;
const DEFAULT_ROW_OFFSET_FRACTION = 0.55;
const DEFAULT_CURVE_DEPTH_FRACTION = 0.4;

function layoutAtScale(count: number, maxT: number, stepX: number, rowOffset: number, curveDepth: number, scale: number): ArcSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i - maxT;
    const normalized = maxT === 0 ? 0 : t / maxT;
    // Middle slots (normalized ≈ 0) sit highest; outer slots settle back
    // toward the baseline — a gentle "bouquet" silhouette, not a sharp V.
    const bouquet = -curveDepth * scale * (1 - normalized * normalized);
    // Alternates every other slot above/below that bouquet curve — this
    // is what actually earns the horizontal compression (see doc comment
    // above), not the bouquet shape itself.
    const alt = (i % 2 === 0 ? -1 : 1) * rowOffset * scale;
    return { dx: t * stepX * scale, dy: bouquet + alt };
  });
}

function minPairDistance(slots: ArcSlot[]): number {
  let min = Infinity;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const dx = slots[i].dx - slots[j].dx;
      const dy = slots[i].dy - slots[j].dy;
      min = Math.min(min, Math.hypot(dx, dy));
    }
  }
  return min;
}

export function computeArcSlots(count: number, options: ArcLayoutOptions): ArcSlot[] {
  if (count <= 0) return [];
  if (count === 1) return [{ dx: 0, dy: 0 }];

  const { minSpacing, stepXFraction = DEFAULT_STEP_X_FRACTION, rowOffsetFraction = DEFAULT_ROW_OFFSET_FRACTION, curveDepthFraction = DEFAULT_CURVE_DEPTH_FRACTION } = options;
  const stepX = minSpacing * stepXFraction;
  const rowOffset = minSpacing * rowOffsetFraction;
  const curveDepth = minSpacing * curveDepthFraction;
  const maxT = (count - 1) / 2;

  const initial = layoutAtScale(count, maxT, stepX, rowOffset, curveDepth, 1);
  const initialMin = minPairDistance(initial);
  if (initialMin >= minSpacing) return initial;

  // Every offset above scales linearly with `scale`, so pairwise
  // distances do too — one corrective multiply gets the tightest pair to
  // exactly minSpacing, whatever `count` and the fractions above happen
  // to produce.
  const correction = minSpacing / initialMin;
  return layoutAtScale(count, maxT, stepX, rowOffset, curveDepth, correction);
}
