import { describe, it, expect } from "vitest";
import { computeGlyphArc } from "./balloonGlyphArc";

describe("computeGlyphArc", () => {
  it("returns nothing for a non-positive count", () => {
    expect(computeGlyphArc(0, { radius: 100 })).toEqual([]);
    expect(computeGlyphArc(-1, { radius: 100 })).toEqual([]);
  });

  it("places a single character dead center, unrotated", () => {
    expect(computeGlyphArc(1, { radius: 100 })).toEqual([{ x: 0, y: 0, angleDeg: 0 }]);
  });

  it("is symmetric around the middle for an even count (every idiom here is 4 characters)", () => {
    const slots = computeGlyphArc(4, { radius: 100, angleStepDeg: 10 });
    expect(slots).toHaveLength(4);
    // x and angle are mirrored left/right; y (height) matches between
    // mirrored pairs — the actual rainbow shape, not a lopsided one.
    expect(slots[0].x).toBeCloseTo(-slots[3].x, 6);
    expect(slots[1].x).toBeCloseTo(-slots[2].x, 6);
    expect(slots[0].angleDeg).toBeCloseTo(-slots[3].angleDeg, 6);
    expect(slots[1].angleDeg).toBeCloseTo(-slots[2].angleDeg, 6);
    expect(slots[0].y).toBeCloseTo(slots[3].y, 6);
    expect(slots[1].y).toBeCloseTo(slots[2].y, 6);
  });

  it("curves like a rainbow: characters nearer the middle sit higher than ones nearer the ends", () => {
    const slots = computeGlyphArc(4, { radius: 100, angleStepDeg: 10 });
    // Index 1 and 2 are the inner pair, 0 and 3 the outer pair — inner
    // should be strictly higher (smaller y) than outer.
    expect(slots[1].y).toBeLessThan(slots[0].y);
    expect(slots[2].y).toBeLessThan(slots[3].y);
  });

  it("x position and rotation both increase monotonically left to right", () => {
    const slots = computeGlyphArc(4, { radius: 100, angleStepDeg: 10 });
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].x).toBeGreaterThan(slots[i - 1].x);
      expect(slots[i].angleDeg).toBeGreaterThan(slots[i - 1].angleDeg);
    }
  });

  it("a smaller radius curls the same angular step into a tighter (shorter, taller) arc", () => {
    const tight = computeGlyphArc(4, { radius: 40, angleStepDeg: 10 });
    const wide = computeGlyphArc(4, { radius: 200, angleStepDeg: 10 });
    const span = (slots: { x: number }[]) => Math.max(...slots.map((s) => s.x)) - Math.min(...slots.map((s) => s.x));
    expect(span(tight)).toBeLessThan(span(wide));
  });
});
