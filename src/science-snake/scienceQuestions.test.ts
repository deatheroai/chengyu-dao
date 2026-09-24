import { describe, it, expect } from "vitest";
import { scienceQuestions, scienceQuestionsById } from "./scienceQuestions";
import { gradeAnswer, satisfiesRequiredKeywords } from "./answerGrading";

const VALID_TOPICS = new Set([
  "diversity-living-nonliving",
  "life-cycles",
  "states-of-matter",
  "magnets",
  "plant-systems",
  "materials",
  "water-cycle",
  "light-and-shadows",
  "human-digestive-system",
  "fungi",
  "heat",
  "classifying-animals",
]);
const REQUIRED_TEXT_FIELDS = ["icon", "prompt", "hint", "modelAnswer", "sourceNotes"] as const;

describe("science-snake question content integrity", () => {
  it("has at least the batch 1-4 count, growing in batches of 5", () => {
    expect(scienceQuestions.length).toBeGreaterThanOrEqual(20);
  });

  it("every question's id matches its registry key", () => {
    for (const [key, question] of Object.entries(scienceQuestionsById)) {
      expect(question.id).toBe(key);
    }
  });

  it("every question id is unique", () => {
    const ids = scienceQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every required text field is non-empty", () => {
    for (const question of scienceQuestions) {
      for (const field of REQUIRED_TEXT_FIELDS) {
        expect(question[field].trim().length, `${question.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("every question has a valid topic", () => {
    for (const question of scienceQuestions) {
      expect(VALID_TOPICS.has(question.topic), `${question.id} has unknown topic "${question.topic}"`).toBe(true);
    }
  });

  it("every question has at least one requiredKeywords group, each non-empty", () => {
    for (const question of scienceQuestions) {
      expect(question.requiredKeywords.length, `${question.id}.requiredKeywords`).toBeGreaterThan(0);
      for (const group of question.requiredKeywords) {
        expect(group.length, `${question.id}.requiredKeywords group`).toBeGreaterThan(0);
        for (const keyword of group) {
          expect(keyword.trim().length, `${question.id} keyword`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("minWords is a positive integer", () => {
    for (const question of scienceQuestions) {
      expect(Number.isInteger(question.minWords), `${question.id}.minWords`).toBe(true);
      expect(question.minWords, `${question.id}.minWords`).toBeGreaterThan(0);
    }
  });

  it("modelAnswer would itself grade as correct, run through the real grading function", () => {
    for (const question of scienceQuestions) {
      expect(gradeAnswer(question.modelAnswer, question), `${question.id}'s modelAnswer`).toBe("correct");
    }
  });

  it("modelAnswer meets the question's own minWords floor", () => {
    for (const question of scienceQuestions) {
      const wordCount = question.modelAnswer.trim().split(/\s+/).length;
      expect(wordCount, `${question.id}.modelAnswer word count`).toBeGreaterThanOrEqual(question.minWords);
    }
  });

  it("hint never gives away the modelAnswer verbatim", () => {
    for (const question of scienceQuestions) {
      expect(
        satisfiesRequiredKeywords(question.hint, question.requiredKeywords),
        `${question.id}'s hint already satisfies its own requiredKeywords — it's giving away the answer`,
      ).toBe(false);
    }
  });
});
