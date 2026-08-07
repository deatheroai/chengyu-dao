import { describe, it, expect } from "vitest";
import { computeReveal } from "./revealProgress";

describe("computeReveal", () => {
  it("reveals nothing before the first threshold", () => {
    expect(computeReveal(0, 4, 2)).toEqual({ revealedCount: 0, isComplete: false });
    expect(computeReveal(1, 4, 2)).toEqual({ revealedCount: 0, isComplete: false });
  });

  it("reveals one character per tapsPerCharacter taps", () => {
    expect(computeReveal(2, 4, 2)).toEqual({ revealedCount: 1, isComplete: false });
    expect(computeReveal(3, 4, 2)).toEqual({ revealedCount: 1, isComplete: false });
    expect(computeReveal(4, 4, 2)).toEqual({ revealedCount: 2, isComplete: false });
  });

  it("marks complete once every character is revealed", () => {
    expect(computeReveal(8, 4, 2)).toEqual({ revealedCount: 4, isComplete: true });
  });

  it("never reveals more than totalCharacters, even with excess taps", () => {
    expect(computeReveal(100, 4, 2)).toEqual({ revealedCount: 4, isComplete: true });
  });

  it("treats zero characters as immediately complete", () => {
    expect(computeReveal(0, 0, 2)).toEqual({ revealedCount: 0, isComplete: true });
  });

  it("works with a tapsPerCharacter of 1 (one tap reveals one character)", () => {
    expect(computeReveal(3, 4, 1)).toEqual({ revealedCount: 3, isComplete: false });
    expect(computeReveal(4, 4, 1)).toEqual({ revealedCount: 4, isComplete: true });
  });

  it("throws for a non-positive tapsPerCharacter", () => {
    expect(() => computeReveal(1, 4, 0)).toThrow();
    expect(() => computeReveal(1, 4, -1)).toThrow();
  });
});
