import { describe, it, expect } from "vitest";
import { buildApplicationCheck } from "./applicationCheck";
import type { IdiomContent } from "../idioms/types";

function stubIdiom(overrides: Partial<IdiomContent> & Pick<IdiomContent, "id" | "theme">): IdiomContent {
  return {
    hanzi: "測試測試",
    pinyin: "cè shì",
    literalMeaning: "test",
    meaning: "test meaning",
    dailyLifeScenario: "a long scenario",
    scenarioShort: { hanzi: `短句-${overrides.id}`, pinyin: `duǎnjù-${overrides.id}` },
    exampleSentence: { hanzi: "測試", pinyin: "cè shì", english: "test" },
    ageBand: "lower-primary",
    sourceNotes: "",
    ...overrides,
  };
}

// Deterministic rng: cycles through a fixed sequence instead of Math.random.
function fixedRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("buildApplicationCheck", () => {
  const target = stubIdiom({ id: "target", theme: "focus" });
  const pool = [
    target,
    stubIdiom({ id: "other-focus-1", theme: "focus" }),
    stubIdiom({ id: "honesty-1", theme: "honesty" }),
    stubIdiom({ id: "kindness-1", theme: "kindness" }),
    stubIdiom({ id: "wisdom-1", theme: "wisdom" }),
  ];

  it("returns exactly one correct option plus the requested number of distractors", () => {
    const options = buildApplicationCheck(target, pool, 2, fixedRng([0, 0.5, 0.99]));
    expect(options).toHaveLength(3);
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(options.find((o) => o.isCorrect)?.fromIdiomId).toBe("target");
  });

  it("never includes the target idiom as a distractor (no duplicate idiom ids)", () => {
    const options = buildApplicationCheck(target, pool, 2, fixedRng([0, 0.5, 0.99]));
    const ids = options.map((o) => o.fromIdiomId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefers distractors from a different theme than the target when enough exist", () => {
    const options = buildApplicationCheck(target, pool, 2, fixedRng([0, 0.5, 0.99]));
    const distractors = options.filter((o) => !o.isCorrect);
    for (const d of distractors) {
      const idiom = pool.find((i) => i.id === d.fromIdiomId)!;
      expect(idiom.theme, `distractor ${d.fromIdiomId}`).not.toBe("focus");
    }
  });

  it("falls back to same-theme distractors when there aren't enough different-theme options", () => {
    const smallPool = [target, stubIdiom({ id: "other-focus-1", theme: "focus" }), stubIdiom({ id: "honesty-1", theme: "honesty" })];
    const options = buildApplicationCheck(target, smallPool, 2, fixedRng([0, 0.5, 0.99]));
    expect(options).toHaveLength(3);
    const distractorIds = options.filter((o) => !o.isCorrect).map((o) => o.fromIdiomId);
    expect(distractorIds.sort()).toEqual(["honesty-1", "other-focus-1"]);
  });

  it("returns the correct option's hanzi/pinyin matching the target's scenarioShort", () => {
    const options = buildApplicationCheck(target, pool, 2, fixedRng([0, 0.5, 0.99]));
    const correct = options.find((o) => o.isCorrect)!;
    expect(correct.hanzi).toBe(target.scenarioShort.hanzi);
    expect(correct.pinyin).toBe(target.scenarioShort.pinyin);
  });
});
