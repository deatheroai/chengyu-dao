import { describe, it, expect } from "vitest";
import { balloonLevels, buildBalloonLevel, DISTRACTOR_COUNT, CELL_JITTER_FRACTION } from "./balloonLevelContent";
import { BALLOON_COLORWAYS } from "./balloonColors";
import { idioms } from "../idioms/idioms";

describe("balloonLevels data integrity", () => {
  it("has one level per door-puzzle idiom", () => {
    expect(balloonLevels.length).toBe(3);
  });

  for (const level of balloonLevels) {
    describe(level.idiom.id, () => {
      it(`has exactly ${DISTRACTOR_COUNT + 1} balloons (1 correct + ${DISTRACTOR_COUNT} decoys)`, () => {
        expect(level.balloons.length).toBe(DISTRACTOR_COUNT + 1);
      });

      it("has exactly one correct balloon, whose idiom is exactly the target idiom itself", () => {
        const correct = level.balloons.filter((b) => b.isCorrect);
        expect(correct.length).toBe(1);
        expect(correct[0].hanzi).toBe(level.idiom.hanzi);
        expect(correct[0].pinyin).toBe(level.idiom.pinyin);
        expect(correct[0].sourceIdiomId).toBe(level.idiom.id);
      });

      it("decoy balloons are genuinely different idioms, each a real entry in idioms.ts", () => {
        const decoys = level.balloons.filter((b) => !b.isCorrect);
        expect(decoys.length).toBe(DISTRACTOR_COUNT);
        const idiomIds = new Set(idioms.map((i) => i.id));
        for (const decoy of decoys) {
          expect(decoy.hanzi).not.toBe(level.idiom.hanzi);
          expect(decoy.sourceIdiomId).not.toBe(level.idiom.id);
          expect(idiomIds.has(decoy.sourceIdiomId)).toBe(true);
        }
      });

      it("no two balloons in the same level are the same idiom", () => {
        const sourceIds = level.balloons.map((b) => b.sourceIdiomId);
        expect(new Set(sourceIds).size).toBe(sourceIds.length);
      });

      it("the masked sentence blanks out exactly the idiom's own characters, and no longer contains them", () => {
        const idiomLength = Array.from(level.idiom.hanzi).length;
        expect(level.maskedSentence.hanzi).not.toContain(level.idiom.hanzi);
        expect(level.maskedSentence.hanzi).toContain("○".repeat(idiomLength));
        // Same length as the original sentence — only the idiom's own
        // run was replaced, nothing added/removed around it.
        expect(Array.from(level.maskedSentence.hanzi).length).toBe(Array.from(level.idiom.exampleSentence.hanzi).length);
      });

      it("the masked sentence's charPinyin has exactly one entry per hanzi character, empty for the blanked-out run", () => {
        const chars = Array.from(level.maskedSentence.hanzi);
        expect(level.maskedSentence.charPinyin.length).toBe(chars.length);
        chars.forEach((char, i) => {
          if (char === "○") expect(level.maskedSentence.charPinyin[i]).toBe("");
        });
      });

      it("has no duplicate balloon ids", () => {
        const ids = level.balloons.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("slotIndex is a valid permutation of 0..total-1 — every slot used exactly once", () => {
        const slots = level.balloons.map((b) => b.slotIndex).sort((a, b) => a - b);
        expect(slots).toEqual(level.balloons.map((_, i) => i));
      });

      it("every balloon's charPinyin has exactly one entry per hanzi character (ruby-annotation alignment)", () => {
        for (const balloon of level.balloons) {
          expect(balloon.charPinyin.length, balloon.id).toBe(Array.from(balloon.hanzi).length);
        }
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
