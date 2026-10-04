import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateScore,
  recordRun,
  describeRunOutcome,
  loadHighScore,
  loadLastRun,
  clearHighScore,
  exportScoresForCloud,
  mergeScoresFromCloud,
  loadRecentRuns,
  buildRunBoard,
  RECENT_RUNS_COUNT,
  APPLE_POINTS,
  CORRECT_ANSWER_POINTS,
  GOLDEN_ATTEMPT_POINTS,
  GOLDEN_CORRECT_POINTS,
  type RunOutcome,
  type ScoreRecord,
} from "./scienceSnakeScore";

beforeEach(() => {
  localStorage.clear();
});

describe("calculateScore", () => {
  it("is apples*5 + questionsCorrect*30", () => {
    expect(calculateScore({ applesEaten: 10, questionsCorrect: 4 })).toBe(10 * APPLE_POINTS + 4 * CORRECT_ANSWER_POINTS);
  });

  it("adds 5 per golden apple eaten and 150 per golden answer typed correctly", () => {
    expect(GOLDEN_CORRECT_POINTS).toBe(5 * CORRECT_ANSWER_POINTS);
    expect(calculateScore({ applesEaten: 2, questionsCorrect: 1, goldenAttempts: 3, goldenCorrect: 1 })).toBe(
      2 * APPLE_POINTS + CORRECT_ANSWER_POINTS + 3 * GOLDEN_ATTEMPT_POINTS + GOLDEN_CORRECT_POINTS,
    );
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

function record(score: number, achievedAt: number): ScoreRecord {
  return { applesEaten: score / APPLE_POINTS, questionsCorrect: 0, score, achievedAt };
}

describe("exportScoresForCloud", () => {
  it("is both-null before any run is recorded", () => {
    expect(exportScoresForCloud()).toEqual({ highScore: null, lastRun: null, recentRuns: [] });
  });

  it("holds the stored high score and last run", () => {
    recordRun({ applesEaten: 10, questionsCorrect: 0 }, 1000);
    recordRun({ applesEaten: 2, questionsCorrect: 0 }, 2000);
    expect(exportScoresForCloud()).toEqual({ highScore: record(50, 1000), lastRun: record(10, 2000), recentRuns: [record(10, 2000), record(50, 1000)] });
  });
});

describe("mergeScoresFromCloud", () => {
  it("fills in both records on a device that has none", () => {
    expect(mergeScoresFromCloud({ highScore: record(80, 1000), lastRun: record(20, 2000) })).toBe(true);
    expect(loadHighScore()).toEqual(record(80, 1000));
    expect(loadLastRun()).toEqual(record(20, 2000));
  });

  it("keeps whichever high score is higher, on either side", () => {
    recordRun({ applesEaten: 10, questionsCorrect: 0 }, 1000); // 50
    mergeScoresFromCloud({ highScore: record(40, 500), lastRun: null });
    expect(loadHighScore()?.score).toBe(50);
    mergeScoresFromCloud({ highScore: record(90, 500), lastRun: null });
    expect(loadHighScore()?.score).toBe(90);
  });

  it("keeps whichever last run happened most recently, on either side", () => {
    recordRun({ applesEaten: 10, questionsCorrect: 0 }, 1000);
    mergeScoresFromCloud({ highScore: null, lastRun: record(5, 500) });
    expect(loadLastRun()?.achievedAt).toBe(1000);
    mergeScoresFromCloud({ highScore: null, lastRun: record(5, 3000) });
    expect(loadLastRun()).toEqual(record(5, 3000));
  });

  it("makes the next run compare against the merged records", () => {
    mergeScoresFromCloud({ highScore: record(100, 1000), lastRun: record(60, 2000) });
    const outcome = recordRun({ applesEaten: 16, questionsCorrect: 0 }, 3000); // 80
    expect(outcome).toMatchObject({ score: 80, previousScore: 60, isNewHighScore: false, highScore: 100 });
  });

  it("returns false and changes nothing for data that isn't a Science Snake save", () => {
    recordRun({ applesEaten: 10, questionsCorrect: 0 }, 1000);
    for (const notASave of [null, "x", {}, { completedSessions: [] }, { highScore: { score: "high" }, lastRun: null }]) {
      expect(mergeScoresFromCloud(notASave)).toBe(false);
    }
    expect(loadHighScore()).toEqual(record(50, 1000));
    expect(loadLastRun()).toEqual(record(50, 1000));
  });
});

describe("recent runs", () => {
  it("keeps the last four runs, newest first", () => {
    for (let i = 1; i <= 6; i++) recordRun({ applesEaten: i, questionsCorrect: 0 }, i * 1000);
    const runs = loadRecentRuns();
    expect(runs).toHaveLength(RECENT_RUNS_COUNT);
    expect(runs.map((r) => r.achievedAt)).toEqual([6000, 5000, 4000, 3000]);
  });

  it("starts from the stored last run on a device that had one before the list existed", () => {
    localStorage.setItem("science-snake-last-run", JSON.stringify(record(30, 1000)));
    expect(loadRecentRuns()).toEqual([record(30, 1000)]);
    recordRun({ applesEaten: 1, questionsCorrect: 0 }, 2000);
    expect(loadRecentRuns().map((r) => r.achievedAt)).toEqual([2000, 1000]);
  });

  it("merges another device's runs in by time, counting the same run once", () => {
    recordRun({ applesEaten: 1, questionsCorrect: 0 }, 1000);
    recordRun({ applesEaten: 3, questionsCorrect: 0 }, 3000);
    expect(mergeScoresFromCloud({ highScore: null, lastRun: record(20, 4000), recentRuns: [record(20, 4000), record(10, 2000), record(5, 1000)] })).toBe(true);
    expect(loadRecentRuns().map((r) => r.achievedAt)).toEqual([4000, 3000, 2000, 1000]);
  });

  it("rejects a save whose recent runs aren't records", () => {
    expect(mergeScoresFromCloud({ highScore: null, lastRun: null, recentRuns: [{ score: "x" }] })).toBe(false);
  });
});

describe("buildRunBoard", () => {
  it("shows correct answers (room + golden), apples and golden apples eaten, and what went up since the run before", () => {
    const rows = buildRunBoard([
      { applesEaten: 12, questionsCorrect: 2, goldenAttempts: 1, goldenCorrect: 1, score: 300, achievedAt: 3000 },
      { applesEaten: 12, questionsCorrect: 1, score: 90, achievedAt: 2000 },
    ]);
    expect(rows[0]).toMatchObject({ score: 300, correct: 3, apples: 12, golden: 1, up: { score: true, correct: true, apples: false, golden: true } });
    expect(rows[1]).toMatchObject({ correct: 1, golden: 0, up: { score: false, correct: false, apples: false, golden: false } });
  });
});
