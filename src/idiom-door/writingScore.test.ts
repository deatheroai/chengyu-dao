import { describe, it, expect } from "vitest";
import {
  characterTraceAccuracy,
  idiomTraceAccuracy,
  startingDoorHp,
  PERFECT_TRACE_STARTING_HP,
  MISTAKE_ACCURACY_PENALTY,
  shouldSkipStrokeDemo,
  SESSIONS_BEFORE_SKIPPING_STROKE_DEMO,
  traceRatingForAccuracy,
  TRACE_RATING_MAX_STARS,
} from "./writingScore";

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

describe("shouldSkipStrokeDemo", () => {
  it("does not skip for a brand-new device (0 completed sessions)", () => {
    expect(shouldSkipStrokeDemo(0)).toBe(false);
  });

  it("does not skip right up until the threshold", () => {
    expect(shouldSkipStrokeDemo(SESSIONS_BEFORE_SKIPPING_STROKE_DEMO - 1)).toBe(false);
  });

  it("skips once the threshold is reached", () => {
    expect(shouldSkipStrokeDemo(SESSIONS_BEFORE_SKIPPING_STROKE_DEMO)).toBe(true);
  });

  it("keeps skipping well past the threshold", () => {
    expect(shouldSkipStrokeDemo(SESSIONS_BEFORE_SKIPPING_STROKE_DEMO + 50)).toBe(true);
  });
});

describe("traceRatingForAccuracy", () => {
  it("rates a perfect trace at the max stars, with an encouraging label", () => {
    const rating = traceRatingForAccuracy(1);
    expect(rating.stars).toBe(TRACE_RATING_MAX_STARS);
    expect(rating.label.length).toBeGreaterThan(0);
  });

  it("still rates a near-perfect trace (one small mistake) at the top tier", () => {
    // characterTraceAccuracy(1) = 1 - MISTAKE_ACCURACY_PENALTY = 0.85
    expect(traceRatingForAccuracy(0.85).stars).toBe(3);
  });

  it("rates a middling trace lower, but never at 0 stars until it's genuinely poor", () => {
    expect(traceRatingForAccuracy(0.6).stars).toBe(2);
    expect(traceRatingForAccuracy(0.3).stars).toBe(1);
  });

  it("rates a hopeless trace (0 accuracy) at 0 stars, still with a non-empty (encouraging, not scolding) label", () => {
    const rating = traceRatingForAccuracy(0);
    expect(rating.stars).toBe(0);
    expect(rating.label.length).toBeGreaterThan(0);
    expect(rating.label.toLowerCase()).not.toMatch(/fail|bad|wrong|poor/);
  });

  it("stars only ever fall within 0..TRACE_RATING_MAX_STARS", () => {
    for (const accuracy of [0, 0.1, 0.19, 0.2, 0.4, 0.49, 0.5, 0.7, 0.84, 0.85, 0.99, 1]) {
      const { stars } = traceRatingForAccuracy(accuracy);
      expect(stars).toBeGreaterThanOrEqual(0);
      expect(stars).toBeLessThanOrEqual(TRACE_RATING_MAX_STARS);
    }
  });
});
