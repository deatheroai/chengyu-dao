import { describe, expect, it } from "vitest";
import { stories, getStory, currentStoryId } from "./stories";
import { storyStrokeData } from "./storyStrokeData";
import { segmentStory, blankSentence } from "./storyText";
import { gradeAttempt, summarize, shuffled } from "./memoryTest";

describe("story content", () => {
  it("current story exists", () => {
    expect(getStory(currentStoryId).id).toBe(currentStoryId);
  });

  for (const story of stories) {
    describe(story.id, () => {
      it("has unique target characters", () => {
        const chars = story.targets.map((t) => t.char);
        expect(new Set(chars).size).toBe(chars.length);
      });

      for (const t of story.targets) {
        it(`${t.char}: word contains char and appears in the text`, () => {
          expect(t.word).toContain(t.char);
          expect(story.text).toContain(t.word);
        });
        it(`${t.char}: has bundled stroke data (else run npm run gen:story-strokes)`, () => {
          expect(storyStrokeData[t.char]?.strokes.length).toBeGreaterThan(0);
        });
      }

      it("highlights every target word exactly once and keeps the text intact", () => {
        const segs = segmentStory(story);
        expect(segs.map((s) => s.text).join("")).toBe(story.text);
        const hit = segs.flatMap((s) => (s.kind === "target" ? [s.target.char] : []));
        expect(hit.sort()).toEqual(story.targets.map((t) => t.char).sort());
      });
    });
  }
});

describe("blankSentence", () => {
  const story = getStory("rainy-day-umbrella");
  it("blanks the target char inside its own sentence", () => {
    const t = story.targets.find((x) => x.char === "附")!;
    expect(blankSentence(story, t)).toEqual({ before: "她笑着说：“我家就在", after: "近，你们先用吧！”" });
  });
  it("handles a char that is not the first in its word", () => {
    const t = story.targets.find((x) => x.char === "馆")!;
    const { before, after } = blankSentence(story, t);
    expect(before.endsWith("图书")).toBe(true);
    expect(after.startsWith("门口")).toBe(true);
  });
});

describe("memory test grading", () => {
  it("grades attempts", () => {
    expect(gradeAttempt(0, false)).toBe("correct");
    expect(gradeAttempt(1, false)).toBe("correct");
    expect(gradeAttempt(2, false)).toBe("shaky");
    expect(gradeAttempt(0, true)).toBe("revealed");
  });
  it("summarizes", () => {
    expect(
      summarize([
        { char: "忽", result: "correct" },
        { char: "馆", result: "shaky" },
        { char: "借", result: "revealed" },
      ]),
    ).toEqual({ correct: 1, total: 3, toReview: ["馆", "借"] });
  });
  it("shuffles without losing items", () => {
    const out = shuffled([1, 2, 3, 4, 5], () => 0);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
