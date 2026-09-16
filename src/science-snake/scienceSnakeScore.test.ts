import { describe, it, expect, beforeEach } from "vitest";
import { calculateScore, recordHighScoreIfBetter, loadHighScore, clearHighScore, APPLE_POINTS, CORRECT_ANSWER_POINTS } from "./scienceSnakeScore";

beforeEach(() => {
  localStorage.clear();
});

describe("calculateScore", () => {
  it("is apples*5 + questionsCorrect*30", () => {
    expect(calculateScore({ applesEaten: 10, questionsCorrect: 4 })).toBe(10 * APPLE_POINTS + 4 * CORRECT_ANSWER_POINTS);
  });

  it("is 0 for a run with nothing eaten", () => {
    expect(calculateScore({ applesEaten: 0, questionsCorrect: 0 })).toBe(0);
  });
});

describe("loadHighScore", () => {
  it("is null before any high score is recorded", () => {
    expect(loadHighScore()).toBeNull();
  });

  it("is null (not thrown) if localStorage holds corrupt JSON under the key", () => {
    localStorage.setItem("science-snake-high-score", "{not json");
    expect(loadHighScore()).toBeNull();
  });
});

describe("recordHighScoreIfBetter", () => {
  it("records the first win's score", () => {
    const record = recordHighScoreIfBetter({ applesEaten: 10, questionsCorrect: 5 }, 1000);
    expect(record.score).toBe(calculateScore({ applesEaten: 10, questionsCorrect: 5 }));
    expect(loadHighScore()).toEqual(record);
  });

  it("keeps the existing record when a new run scores lower", () => {
    recordHighScoreIfBetter({ applesEaten: 20, questionsCorrect: 10 }, 1000);
    const after = recordHighScoreIfBetter({ applesEaten: 1, questionsCorrect: 0 }, 2000);
    expect(after.applesEaten).toBe(20);
    expect(loadHighScore()?.applesEaten).toBe(20);
  });

  it("overwrites when a new run scores higher", () => {
    recordHighScoreIfBetter({ applesEaten: 1, questionsCorrect: 0 }, 1000);
    const after = recordHighScoreIfBetter({ applesEaten: 20, questionsCorrect: 10 }, 2000);
    expect(after.applesEaten).toBe(20);
    expect(loadHighScore()).toEqual(after);
  });

  it("keeps the existing record on a tie", () => {
    const first = recordHighScoreIfBetter({ applesEaten: 10, questionsCorrect: 5 }, 1000);
    const after = recordHighScoreIfBetter({ applesEaten: 10, questionsCorrect: 5 }, 2000);
    expect(after).toEqual(first);
  });
});

describe("clearHighScore", () => {
  it("removes any stored record", () => {
    recordHighScoreIfBetter({ applesEaten: 5, questionsCorrect: 1 });
    clearHighScore();
    expect(loadHighScore()).toBeNull();
  });
});
