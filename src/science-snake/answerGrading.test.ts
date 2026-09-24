import { describe, it, expect } from "vitest";
import { satisfiesRequiredKeywords, isMalformed, gradeAnswer, resolveAttempt } from "./answerGrading";

const SAMPLE_QUESTION = {
  minWords: 6,
  requiredKeywords: [
    ["grow", "grows", "growing", "bigger"],
    ["reproduce", "have babies", "give birth"],
  ],
};

describe("satisfiesRequiredKeywords", () => {
  it("is true only when every OR-group has at least one match", () => {
    expect(satisfiesRequiredKeywords("it can grow bigger and reproduce", SAMPLE_QUESTION.requiredKeywords)).toBe(true);
  });

  it("is false when one group has no match", () => {
    expect(satisfiesRequiredKeywords("it can grow bigger", SAMPLE_QUESTION.requiredKeywords)).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(satisfiesRequiredKeywords("It Can GROW Bigger And REPRODUCE", SAMPLE_QUESTION.requiredKeywords)).toBe(true);
  });

  it("treats hyphens and spaces as the same, both ways", () => {
    expect(satisfiesRequiredKeywords("nylon is water resistant", [["water-resistant"]])).toBe(true);
    expect(satisfiesRequiredKeywords("paper is non-magnetic", [["non magnetic"]])).toBe(true);
  });

  it("treats curly (phone keyboard) apostrophes as straight ones", () => {
    expect(satisfiesRequiredKeywords("nylon doesn’t absorb water", [["doesn't absorb water"]])).toBe(true);
  });

  it("ignores extra whitespace between words", () => {
    expect(satisfiesRequiredKeywords("it  can grow and\nreproduce", SAMPLE_QUESTION.requiredKeywords)).toBe(true);
  });

  it("matches a leading-space whole-word keyword at the very start of an answer", () => {
    expect(satisfiesRequiredKeywords("N and N repel", [[" n and n"]])).toBe(true);
    expect(satisfiesRequiredKeywords("the fan and nets", [[" n and n"]])).toBe(false);
  });

  it("is false for a completely unrelated answer", () => {
    expect(satisfiesRequiredKeywords("magnets attract iron", SAMPLE_QUESTION.requiredKeywords)).toBe(false);
  });
});

describe("isMalformed", () => {
  it("is true for an empty answer", () => {
    expect(isMalformed("", 6)).toBe(true);
    expect(isMalformed("   ", 6)).toBe(true);
  });

  it("is true when the answer is shorter than minWords", () => {
    expect(isMalformed("it can grow", 6)).toBe(true);
  });

  it("is true for a bare keyword fragment with no sentence-shaped word, even past minWords", () => {
    expect(isMalformed("grow bigger reproduce offspring seeds now", 6)).toBe(true);
  });

  it("is false for a real sentence at or past minWords", () => {
    expect(isMalformed("it can grow bigger and reproduce", 6)).toBe(false);
  });
});

describe("gradeAnswer", () => {
  it("grades a well-formed, fully-matching answer as correct", () => {
    expect(gradeAnswer("it can grow bigger and it can reproduce too", SAMPLE_QUESTION)).toBe("correct");
  });

  it("grades a too-short answer as malformed even if it happens to contain both keywords", () => {
    expect(gradeAnswer("grow reproduce", SAMPLE_QUESTION)).toBe("malformed");
  });

  it("grades a well-formed answer missing a required concept as incorrect", () => {
    expect(gradeAnswer("it can grow bigger because it eats food", SAMPLE_QUESTION)).toBe("incorrect");
  });

  it("malformed takes priority over incorrect", () => {
    expect(gradeAnswer("magnets iron steel", SAMPLE_QUESTION)).toBe("malformed");
  });
});

describe("resolveAttempt", () => {
  it("resolves to correct on try 1 regardless of try number semantics", () => {
    expect(resolveAttempt(SAMPLE_QUESTION, "it can grow bigger and reproduce", 1)).toEqual({ outcome: "correct" });
  });

  it("resolves to correct on try 2 too", () => {
    expect(resolveAttempt(SAMPLE_QUESTION, "it can grow bigger and reproduce", 2)).toEqual({ outcome: "correct" });
  });

  it("resolves to retry when try 1 is wrong (incorrect verdict)", () => {
    expect(resolveAttempt(SAMPLE_QUESTION, "it can grow a lot bigger", 1)).toEqual({ outcome: "retry", verdict: "incorrect" });
  });

  it("resolves to retry when try 1 is wrong (malformed verdict)", () => {
    expect(resolveAttempt(SAMPLE_QUESTION, "grow", 1)).toEqual({ outcome: "retry", verdict: "malformed" });
  });

  it("resolves to reveal when try 2 is wrong", () => {
    expect(resolveAttempt(SAMPLE_QUESTION, "it can grow a lot bigger", 2)).toEqual({ outcome: "reveal", verdict: "incorrect" });
  });
});
