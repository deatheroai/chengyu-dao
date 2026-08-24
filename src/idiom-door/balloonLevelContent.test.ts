import { describe, it, expect } from "vitest";
import { balloonLevels, buildBalloonLevel, DISTRACTOR_COUNT, CELL_JITTER_FRACTION } from "./balloonLevelContent";
import { BALLOON_COLORWAYS } from "./balloonColors";

describe("balloonLevels data integrity", () => {
  it("has one level per door-puzzle idiom", () => {
    expect(balloonLevels.length).toBe(3);
  });

  for (const level of balloonLevels) {
    describe(level.idiom.id, () => {
      it(`has exactly ${DISTRACTOR_COUNT + 1} balloons (1 correct + ${DISTRACTOR_COUNT} decoys)`, () => {
        expect(level.balloons.length).toBe(DISTRACTOR_COUNT + 1);
      });

      it("has exactly one correct balloon, matching the idiom's own approved example sentence exactly", () => {
        const correct = level.balloons.filter((b) => b.isCorrect);
        expect(correct.length).toBe(1);
        expect(correct[0].hanzi).toBe(level.idiom.exampleSentence.hanzi);
        expect(correct[0].pinyin).toBe(level.idiom.exampleSentence.pinyin);
      });

      it("every balloon (correct and decoys alike) actually contains the idiom's own characters — decoys are wrong *usage*, not a different idiom entirely", () => {
        for (const balloon of level.balloons) {
          expect(balloon.hanzi).toContain(level.idiom.hanzi);
        }
      });

      it("decoy balloons are genuinely different sentences from the correct one", () => {
        const decoys = level.balloons.filter((b) => !b.isCorrect);
        expect(decoys.length).toBe(DISTRACTOR_COUNT);
        for (const decoy of decoys) {
          expect(decoy.hanzi).not.toBe(level.idiom.exampleSentence.hanzi);
        }
      });

      it("has no duplicate balloon ids", () => {
        const ids = level.balloons.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("slotIndex is a valid permutation of 0..total-1 — every slot used exactly once", () => {
        const slots = level.balloons.map((b) => b.slotIndex).sort((a, b) => a - b);
        expect(slots).toEqual(level.balloons.map((_, i) => i));
      });

      it("every balloon's jitter stays within CELL_JITTER_FRACTION on both axes", () => {
        for (const balloon of level.balloons) {
          expect(Math.abs(balloon.jitterX)).toBeLessThanOrEqual(CELL_JITTER_FRACTION);
          expect(Math.abs(balloon.jitterY)).toBeLessThanOrEqual(CELL_JITTER_FRACTION);
        }
      });

      it("every balloon's drift/string phases are valid radian offsets", () => {
        for (const balloon of level.balloons) {
          for (const phase of [balloon.driftPhaseX, balloon.driftPhaseY, balloon.stringPhase]) {
            expect(phase).toBeGreaterThanOrEqual(0);
            expect(phase).toBeLessThan(Math.PI * 2);
          }
        }
      });

      it("every balloon gets a distinct, valid colorway index — color never repeats within a level and never hints at the answer", () => {
        for (const balloon of level.balloons) {
          expect(balloon.colorIndex).toBeGreaterThanOrEqual(0);
          expect(balloon.colorIndex).toBeLessThan(BALLOON_COLORWAYS.length);
        }
        const colorIndices = level.balloons.map((b) => b.colorIndex);
        expect(new Set(colorIndices).size).toBe(colorIndices.length);
      });
    });
  }
});

describe("buildBalloonLevel determinism", () => {
  it("building the same idiom's level twice produces identical output", () => {
    const a = buildBalloonLevel("ba-miao-zhu-zhang");
    const b = buildBalloonLevel("ba-miao-zhu-zhang");
    expect(a).toEqual(b);
  });

  it("throws a clear error for an unknown idiom id", () => {
    expect(() => buildBalloonLevel("not-a-real-idiom")).toThrow(/not found/);
  });
});
