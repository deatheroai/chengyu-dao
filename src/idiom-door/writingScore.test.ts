import { describe, it, expect } from "vitest";
import { characterTraceAccuracy, idiomTraceAccuracy, startingDoorHp, PERFECT_TRACE_STARTING_HP, MISTAKE_ACCURACY_PENALTY } from "./writingScore";

describe("writing stage scoring", () => {
  it("scores a mistake-free character at full accuracy", () => {
    expect(characterTraceAccuracy(0)).toBe(1);
  });

  it("deducts a fixed slice per mistake", () => {
    expect(characterTraceAccuracy(1)).toBeCloseTo(1 - MISTAKE_ACCURACY_PENALTY);
    expect(characterTraceAccuracy(2)).toBeCloseTo(1 - MISTAKE_ACCURACY_PENALTY * 2);
  });

  it("floors a heavily-mistaken character at 0 rather than going negative", () => {
    expect(characterTraceAccuracy(100)).toBe(0);
  });

  it("averages each character's accuracy for the idiom's overall accuracy", () => {
    const results = [
      { char: "一", totalMistakes: 0 },
      { char: "心", totalMistakes: 0 },
      { char: "一", totalMistakes: 0 },
      { char: "意", totalMistakes: 0 },
    ];
    expect(idiomTraceAccuracy(results)).toBe(1);
  });

  it("a mistake on one character doesn't zero out the whole idiom", () => {
    const results = [
      { char: "一", totalMistakes: 0 },
      { char: "心", totalMistakes: 20 }, // this one character bottoms out at 0
      { char: "一", totalMistakes: 0 },
      { char: "意", totalMistakes: 0 },
    ];
    // 3 perfect (1 each) + 1 zeroed-out = 3/4 overall, not 0.
    expect(idiomTraceAccuracy(results)).toBeCloseTo(0.75);
  });

  it("scores an empty result set (shouldn't happen for a real idiom) as 0, no freebie", () => {
    expect(idiomTraceAccuracy([])).toBe(0);
  });

  it("a perfect trace starts the door stage at the full starting HP", () => {
    const results = [
      { char: "一", totalMistakes: 0 },
      { char: "心", totalMistakes: 0 },
      { char: "一", totalMistakes: 0 },
      { char: "意", totalMistakes: 0 },
    ];
    expect(startingDoorHp(results)).toBe(PERFECT_TRACE_STARTING_HP);
  });

  it("a badly-traced idiom can legitimately start at 0 HP — no baseline freebie", () => {
    const results = [
      { char: "一", totalMistakes: 20 },
      { char: "心", totalMistakes: 20 },
      { char: "一", totalMistakes: 20 },
      { char: "意", totalMistakes: 20 },
    ];
    expect(startingDoorHp(results)).toBe(0);
  });

  it("rounds to a whole HP", () => {
    const results = [
      { char: "一", totalMistakes: 1 }, // 0.85
      { char: "心", totalMistakes: 0 }, // 1
      { char: "一", totalMistakes: 0 }, // 1
      { char: "意", totalMistakes: 0 }, // 1
    ];
    // average = 0.9625 -> 96.25 -> rounds to 96
    expect(startingDoorHp(results)).toBe(96);
    expect(Number.isInteger(startingDoorHp(results))).toBe(true);
  });
});
