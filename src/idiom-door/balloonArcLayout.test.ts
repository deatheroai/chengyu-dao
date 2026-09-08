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

  // The actual invariant this module exists for: whatever count/spacing
  // a real balloon level throws at it (BalloonSentenceScene's
  // DISTRACTOR_COUNT + 1 = 4 today, but this stays general), no two
  // slots ever end up closer than the caller's requested minSpacing.
  it("never places two slots closer than minSpacing, across a range of counts and spacings", () => {
    for (const count of [2, 3, 4, 5, 6, 8]) {
      for (const minSpacing of [40, 120, 260]) {
        const slots = computeArcSlots(count, { minSpacing });
        expect(slots).toHaveLength(count);
        const actualMin = minPairDistance(slots);
        expect(actualMin).toBeGreaterThanOrEqual(minSpacing - 1e-6);
      }
    }
  });

  // A large enough count at the default angle step would push the total
  // span past 180°, where chord length stops increasing with angular
  // separation and non-adjacent pairs could end up *closer* than
  // adjacent ones — the span cap exists specifically to keep this from
  // ever mattering. Exercise a count large enough to actually trigger
  // that cap, not just ones comfortably under it.
  it("keeps the min-spacing guarantee even for a count large enough to hit the span cap", () => {
    const slots = computeArcSlots(20, { minSpacing: 100 });
    expect(minPairDistance(slots)).toBeGreaterThanOrEqual(100 - 1e-6);
  });

  // The actual point of this shape: a real rainbow silhouette, not just
  // a safe scatter of points — the middle of the arc should sit visibly
  // higher (smaller dy) than either end.
  it("curves like a rainbow: the middle sits higher than both ends", () => {
    const slots = computeArcSlots(5, { minSpacing: 150 });
    const middle = slots[2].dy;
    const left = slots[0].dy;
    const right = slots[4].dy;
    expect(middle).toBeLessThan(left);
    expect(middle).toBeLessThan(right);
    // Symmetric around the center, since the slots are evenly spaced by
    // angle around one circle.
    expect(left).toBeCloseTo(right, 6);
    expect(slots[1].dy).toBeCloseTo(slots[3].dy, 6);
  });

  it("respects a custom angle step (a wider step reads as a tighter curl)", () => {
    const narrow = computeArcSlots(4, { minSpacing: 150, angleStepDeg: 15 });
    const wide = computeArcSlots(4, { minSpacing: 150, angleStepDeg: 35 });
    const span = (slots: { dx: number }[]) => Math.max(...slots.map((s) => s.dx)) - Math.min(...slots.map((s) => s.dx));
    // Same minSpacing, but a wider angle step curls the same count into
    // a tighter arc — less horizontal span for the same safe spacing.
    expect(span(wide)).toBeLessThan(span(narrow));
  });
});
