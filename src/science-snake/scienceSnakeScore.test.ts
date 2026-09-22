import { describe, it, expect, beforeEach } from "vitest";
import { calculateScore, recordRun, describeRunOutcome, loadHighScore, loadLastRun, clearHighScore, APPLE_POINTS, CORRECT_ANSWER_POINTS, type RunOutcome } from "./scienceSnakeScore";

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

describe("loadHighScore / loadLastRun", () => {
  it("are both null before any run is recorded", () => {
    expect(loadHighScore()).toBeNull();
    expect(loadLastRun()).toBeNull();
  });

  it("are null (not thrown) if localStorage holds corrupt JSON under either key", () => {
    localStorage.setItem("science-snake-high-score", "{not json");
    localStorage.setItem("science-snake-last-run", "{not json");
    expect(loadHighScore()).toBeNull();
    expect(loadLastRun()).toBeNull();
  });
});

describe("recordRun", () => {
  it("records the first run ever as both the last run and the high score, with no previous score to compare against", () => {
    const outcome = recordRun({ applesEaten: 10, questionsCorrect: 5 }, 1000);
    const score = calculateScore({ applesEaten: 10, questionsCorrect: 5 });
    expect(outcome).toEqual({ score, previousScore: null, isNewHighScore: true, highScore: score });
    expect(loadHighScore()?.score).toBe(score);
    expect(loadLastRun()?.score).toBe(score);
  });

  it("reports previousScore from the immediately-prior run, win or lose alike", () => {
    recordRun({ applesEaten: 4, questionsCorrect: 1 }, 1000); // score 50
    const outcome = recordRun({ applesEaten: 2, questionsCorrect: 0 }, 2000); // score 10
    expect(outcome.previousScore).toBe(50);
    expect(outcome.score).toBe(10);
  });

  it("keeps the high score when a new run scores lower, but still updates the last run", () => {
    recordRun({ applesEaten: 20, questionsCorrect: 10 }, 1000); // score 400
    const outcome = recordRun({ applesEaten: 1, questionsCorrect: 0 }, 2000); // score 5
    expect(outcome.isNewHighScore).toBe(false);
    expect(outcome.highScore).toBe(400);
    expect(loadHighScore()?.score).toBe(400);
    expect(loadLastRun()?.score).toBe(5);
  });

  it("overwrites the high score when a new run scores higher", () => {
    recordRun({ applesEaten: 1, questionsCorrect: 0 }, 1000); // score 5
    const outcome = recordRun({ applesEaten: 20, questionsCorrect: 10 }, 2000); // score 400
    expect(outcome.isNewHighScore).toBe(true);
    expect(outcome.highScore).toBe(400);
    expect(loadHighScore()?.score).toBe(400);
  });

  it("a tie is not a new high score", () => {
    recordRun({ applesEaten: 10, questionsCorrect: 5 }, 1000);
    const outcome = recordRun({ applesEaten: 10, questionsCorrect: 5 }, 2000);
    expect(outcome.isNewHighScore).toBe(false);
  });

  it("a losing run that still outscores the prior best is recorded as the new high score", () => {
    recordRun({ applesEaten: 5, questionsCorrect: 1 }, 1000); // score 55, imagine this was a win
    const outcome = recordRun({ applesEaten: 3, questionsCorrect: 3 }, 2000); // score 105, imagine this run suffocated
    expect(outcome.isNewHighScore).toBe(true);
    expect(loadHighScore()?.score).toBe(105);
  });
});

describe("describeRunOutcome", () => {
  it("calls out the very first run as a new high score with no comparison possible", () => {
    const outcome: RunOutcome = { score: 55, previousScore: null, isNewHighScore: true, highScore: 55 };
    expect(describeRunOutcome(outcome)).toBe("🏆 New high score — your first run!");
  });

  it("shows the +delta alongside a new high score", () => {
    const outcome: RunOutcome = { score: 105, previousScore: 55, isNewHighScore: true, highScore: 105 };
    expect(describeRunOutcome(outcome)).toBe("🏆 New high score! (+50 vs your last run)");
  });

  it("shows an up arrow with the positive delta when not a new high score", () => {
    const outcome: RunOutcome = { score: 80, previousScore: 50, isNewHighScore: false, highScore: 400 };
    expect(describeRunOutcome(outcome)).toBe("📈 +30 vs your last run (best: 400)");
  });

  it("shows a down arrow with the (negative) delta on a worse run", () => {
    const outcome: RunOutcome = { score: 20, previousScore: 50, isNewHighScore: false, highScore: 400 };
    expect(describeRunOutcome(outcome)).toBe("📉 -30 vs your last run (best: 400)");
  });

  it("calls out a tie with the immediately-prior run", () => {
    const outcome: RunOutcome = { score: 50, previousScore: 50, isNewHighScore: false, highScore: 400 };
    expect(describeRunOutcome(outcome)).toBe("Same as your last run (best: 400)");
  });

  it("matches what recordRun actually returns end to end (a losing run beating an old high score)", () => {
    recordRun({ applesEaten: 5, questionsCorrect: 1 }, 1000); // score 55
    const outcome = recordRun({ applesEaten: 3, questionsCorrect: 3 }, 2000); // score 105
    expect(describeRunOutcome(outcome)).toBe("🏆 New high score! (+50 vs your last run)");
  });
});

describe("clearHighScore", () => {
  it("removes both the stored high score and the last run", () => {
    recordRun({ applesEaten: 5, questionsCorrect: 1 });
    clearHighScore();
    expect(loadHighScore()).toBeNull();
    expect(loadLastRun()).toBeNull();
  });
});
