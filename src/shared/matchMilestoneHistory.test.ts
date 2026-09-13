import { describe, it, expect, beforeEach } from "vitest";
import {
  recordMatchMilestone,
  matchMilestoneHistory,
  highestRecordedMilestoneNumber,
  bestFinalHp,
  previousMilestoneFinalHp,
  clearMatchMilestoneHistory,
  pendingMatchMilestone,
  splitIntoSubRounds,
  MILESTONE_BATCH_SIZE,
  MILESTONE_SUB_ROUNDS,
  IDIOMS_PER_SUB_ROUND,
} from "./matchMilestoneHistory";

beforeEach(() => {
  localStorage.clear();
});

function ids(count: number, prefix = "idiom"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
}

describe("recordMatchMilestone / matchMilestoneHistory", () => {
  it("is empty with no history", () => {
    expect(matchMilestoneHistory()).toEqual([]);
  });

  it("records a finished milestone's final HP", () => {
    recordMatchMilestone(1, 410, 1000);
    expect(matchMilestoneHistory()).toEqual([{ milestoneNumber: 1, finalHp: 410, completedAt: 1000 }]);
  });

  it("survives malformed localStorage content rather than throwing", () => {
    localStorage.setItem("idiom-match-milestone-history", "{ not valid json");
    expect(matchMilestoneHistory()).toEqual([]);
  });
});

describe("highestRecordedMilestoneNumber", () => {
  it("is 0 with no history", () => {
    expect(highestRecordedMilestoneNumber()).toBe(0);
  });

  it("is the highest milestone number recorded, regardless of recording order", () => {
    recordMatchMilestone(1, 410);
    recordMatchMilestone(3, 380);
    recordMatchMilestone(2, 450);
    expect(highestRecordedMilestoneNumber()).toBe(3);
  });
});

describe("bestFinalHp / previousMilestoneFinalHp", () => {
  it("both return null before any milestone has finished", () => {
    expect(bestFinalHp(1)).toBeNull();
    expect(previousMilestoneFinalHp(1)).toBeNull();
  });

  it("bestFinalHp is the max across every milestone strictly before the given one", () => {
    recordMatchMilestone(1, 410);
    recordMatchMilestone(2, 480);
    expect(bestFinalHp(3)).toBe(480);
    // Never counts the milestone currently in progress against itself.
    expect(bestFinalHp(2)).toBe(410);
  });

  it("previousMilestoneFinalHp is just the immediately-preceding milestone's HP", () => {
    recordMatchMilestone(1, 410);
    recordMatchMilestone(2, 480);
    expect(previousMilestoneFinalHp(3)).toBe(480);
    expect(previousMilestoneFinalHp(2)).toBe(410);
    expect(previousMilestoneFinalHp(1)).toBeNull();
  });
});

describe("clearMatchMilestoneHistory", () => {
  it("resets back to a fresh, no-history state", () => {
    recordMatchMilestone(1, 410);
    clearMatchMilestoneHistory();
    expect(matchMilestoneHistory()).toEqual([]);
    expect(highestRecordedMilestoneNumber()).toBe(0);
  });
});

describe("pendingMatchMilestone", () => {
  it("is null before the discovered count reaches the first batch size", () => {
    expect(pendingMatchMilestone(ids(MILESTONE_BATCH_SIZE - 1), 0)).toBeNull();
  });

  it("returns milestone 1, the first MILESTONE_BATCH_SIZE discovered ids, right when the count reaches it", () => {
    const discovered = ids(MILESTONE_BATCH_SIZE);
    const pending = pendingMatchMilestone(discovered, 0);
    expect(pending).toEqual({ milestoneNumber: 1, idiomIds: discovered });
  });

  it("is null again once milestone 1 has already been recorded, even though the count is still only one batch", () => {
    expect(pendingMatchMilestone(ids(MILESTONE_BATCH_SIZE), 1)).toBeNull();
  });

  it("returns milestone 2, the *next* batch of ids, once the count reaches two batches", () => {
    const discovered = ids(MILESTONE_BATCH_SIZE * 2);
    const pending = pendingMatchMilestone(discovered, 1);
    expect(pending).toEqual({
      milestoneNumber: 2,
      idiomIds: discovered.slice(MILESTONE_BATCH_SIZE, MILESTONE_BATCH_SIZE * 2),
    });
  });

  it("only ever returns the single next milestone, even if the count jumped past more than one threshold at once", () => {
    const discovered = ids(MILESTONE_BATCH_SIZE * 3);
    const pending = pendingMatchMilestone(discovered, 0);
    expect(pending?.milestoneNumber).toBe(1);
    expect(pending?.idiomIds).toEqual(discovered.slice(0, MILESTONE_BATCH_SIZE));
  });

  it("stays null with extra discovered ids that don't yet fill out one more full batch", () => {
    expect(pendingMatchMilestone(ids(MILESTONE_BATCH_SIZE + 3), 1)).toBeNull();
  });
});

describe("splitIntoSubRounds", () => {
  it(`splits a full batch into ${MILESTONE_SUB_ROUNDS} equal, in-order chunks of ${IDIOMS_PER_SUB_ROUND}`, () => {
    const batch = ids(MILESTONE_BATCH_SIZE);
    const rounds = splitIntoSubRounds(batch);
    expect(rounds).toHaveLength(MILESTONE_SUB_ROUNDS);
    for (const round of rounds) expect(round).toHaveLength(IDIOMS_PER_SUB_ROUND);
    expect(rounds.flat()).toEqual(batch);
  });
});
