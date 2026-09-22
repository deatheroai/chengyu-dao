import { describe, it, expect } from "vitest";
import { createRng } from "./seededRandom";

describe("createRng", () => {
  it("is deterministic: the same seed always produces the same sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds produce different sequences", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("always returns values in [0, 1)", () => {
    const rng = createRng(12345);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("doesn't just repeat the same value forever", () => {
    const rng = createRng(7);
    const values = new Set(Array.from({ length: 30 }, () => rng()));
    expect(values.size).toBeGreaterThan(1);
  });
});
