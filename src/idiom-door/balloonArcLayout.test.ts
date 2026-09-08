import { describe, it, expect } from "vitest";
import { computeArcSlots } from "./balloonArcLayout";

function minPairDistance(slots: { dx: number; dy: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      min = Math.min(min, Math.hypot(slots[i].dx - slots[j].dx, slots[i].dy - slots[j].dy));
    }
  }
  return min;
}

describe("computeArcSlots", () => {
  it("returns nothing for a non-positive count", () => {
    expect(computeArcSlots(0, { minSpacing: 100 })).toEqual([]);
    expect(computeArcSlots(-1, { minSpacing: 100 })).toEqual([]);
  });

  it("places a single slot at the center", () => {
    expect(computeArcSlots(1, { minSpacing: 100 })).toEqual([{ dx: 0, dy: 0 }]);
  });

  // The actual invariant this module exists for: whatever count/minSpacing
  // combination a real balloon level throws at it (BalloonSentenceScene's
  // DISTRACTOR_COUNT + 1 = 4 today, but this stays general), no two slots
  // ever end up closer than the caller's requested minSpacing — the
  // correction pass in computeArcSlots is what's supposed to guarantee
  // this by construction rather than by tuning the default fractions to
  // "happen" to work for one specific count.
  it("never places two slots closer than minSpacing, across a range of counts and spacings", () => {
    for (const count of [2, 3, 4, 5, 6, 8]) {
      for (const minSpacing of [40, 120, 260]) {
        const slots = computeArcSlots(count, { minSpacing });
        expect(slots).toHaveLength(count);
        const actualMin = minPairDistance(slots);
        // A little floating-point slack, not a real tolerance for
        // encroachment — the correction pass targets exactly minSpacing.
        expect(actualMin).toBeGreaterThanOrEqual(minSpacing - 1e-6);
      }
    }
  });

  it("still guarantees the spacing invariant with non-default fractions, including ones that undershoot before correction", () => {
    // A tiny rowOffsetFraction/curveDepthFraction means the raw curve
    // (before the corrective scale-up) is nearly a flat row — the case
    // most likely to start out under minSpacing and actually exercise
    // the correction path, not just confirm it was a no-op.
    const slots = computeArcSlots(5, { minSpacing: 200, stepXFraction: 0.15, rowOffsetFraction: 0.05, curveDepthFraction: 0.05 });
    expect(minPairDistance(slots)).toBeGreaterThanOrEqual(200 - 1e-6);
  });

  // The actual point of curving instead of gridding: for a realistic
  // candidate count (BalloonSentenceScene's usual 1 correct + 3 decoys),
  // the horizontal footprint should come in well under what laying the
  // same count out in a single flat row at the same minSpacing would need
  // — otherwise this module isn't actually buying anything over the old
  // grid layout's column spacing.
  it("uses meaningfully less horizontal space than a flat row of the same count", () => {
    const count = 4;
    const minSpacing = 180;
    const slots = computeArcSlots(count, { minSpacing });
    const xs = slots.map((s) => s.dx);
    const span = Math.max(...xs) - Math.min(...xs);
    const flatRowSpan = (count - 1) * minSpacing;
    expect(span).toBeLessThan(flatRowSpan * 0.85);
  });
});
