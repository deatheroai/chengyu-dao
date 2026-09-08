import { describe, it, expect } from "vitest";
import { initialBalloonHpState, applyWrongCatchPenalty, STARTING_BALLOON_HP, WRONG_CATCH_HP_PENALTY } from "./balloonHp";

describe("balloon HP", () => {
  it("starts at the full amount", () => {
    expect(initialBalloonHpState()).toEqual({ hp: STARTING_BALLOON_HP });
  });

  it("deducts the penalty on a wrong catch", () => {
    const state = applyWrongCatchPenalty(initialBalloonHpState());
    expect(state.hp).toBe(STARTING_BALLOON_HP - WRONG_CATCH_HP_PENALTY);
  });

  it("floors at 0 rather than going negative — no fail state, just a floor", () => {
    let state = initialBalloonHpState();
    for (let i = 0; i < 20; i++) state = applyWrongCatchPenalty(state);
    expect(state.hp).toBe(0);
  });
});
