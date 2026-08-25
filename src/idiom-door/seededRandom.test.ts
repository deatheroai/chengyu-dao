import { describe, it, expect } from "vitest";
import { createRng, seedFromString, randRange, randInt } from "./seededRandom";

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

describe("seedFromString", () => {
  it("is deterministic: the same string always produces the same seed", () => {
    expect(seedFromString("ba-miao-zhu-zhang")).toBe(seedFromString("ba-miao-zhu-zhang"));
  });

  it("different strings (usually) produce different seeds", () => {
    expect(seedFromString("ba-miao-zhu-zhang")).not.toBe(seedFromString("shu-neng-sheng-qiao"));
    expect(seedFromString("ba-miao-zhu-zhang")).not.toBe(seedFromString("zhi-cuo-jiu-gai"));
  });

  it("always returns a non-negative 32-bit integer", () => {
    const h = seedFromString("some fairly long idiom id string");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("randRange", () => {
  it("stays within [min, max)", () => {
    const rng = createRng(99);
    for (let i = 0; i < 200; i++) {
      const v = randRange(rng, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it("covers a spread of values across the range, not just one corner", () => {
    const rng = createRng(5);
    const values = Array.from({ length: 200 }, () => randRange(rng, 0, 100));
    expect(Math.min(...values)).toBeLessThan(25);
    expect(Math.max(...values)).toBeGreaterThan(75);
  });
});

describe("randInt", () => {
  it("stays within [min, max] inclusive and always returns an integer", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(rng, 1, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    // With 500 draws over a 5-value range, every value should show up —
    // guards against an off-by-one that silently excludes an endpoint.
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});
