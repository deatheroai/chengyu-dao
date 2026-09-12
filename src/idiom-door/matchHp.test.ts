import { describe, it, expect } from "vitest";
import { initialMatchHpState, applyWrongPairPenalty, STARTING_MATCH_HP, WRONG_PAIR_HP_PENALTY } from "./matchHp";

describe("match-milestone HP", () => {
  it("starts at the full amount when no carry-over is given (a milestone's first sub-round)", () => {
    expect(initialMatchHpState()).toEqual({ hp: STARTING_MATCH_HP });
  });

  it("starts at whatever the previous sub-round carried over", () => {
    expect(initialMatchHpState(240)).toEqual({ hp: 240 });
  });

  it("clamps a negative carry-over up to 0 rather than storing it negative", () => {
    expect(initialMatchHpState(-5)).toEqual({ hp: 0 });
  });

  it("deducts the penalty on a wrong pair", () => {
    const state = applyWrongPairPenalty(initialMatchHpState());
    expect(state.hp).toBe(STARTING_MATCH_HP - WRONG_PAIR_HP_PENALTY);
  });

  it("floors at 0 rather than going negative — no fail state, just a floor", () => {
    let state = initialMatchHpState(10);
    state = applyWrongPairPenalty(state);
    expect(state.hp).toBe(0);
  });
});
