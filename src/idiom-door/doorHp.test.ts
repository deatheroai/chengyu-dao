import { describe, it, expect } from "vitest";
import { initialDoorHpState, canJump, spendJumpHp, spendWrongCatchHp, JUMP_HP_COST, WRONG_CATCH_HP_PENALTY } from "./doorHp";

describe("door HP", () => {
  it("starts at whatever the writing stage earned", () => {
    expect(initialDoorHpState(73)).toEqual({ hp: 73 });
  });

  it("clamps a negative starting HP up to 0 rather than storing it negative", () => {
    expect(initialDoorHpState(-5)).toEqual({ hp: 0 });
  });

  it("can jump while HP remains", () => {
    expect(canJump(initialDoorHpState(1))).toBe(true);
  });

  it("cannot jump at 0 HP — the real gate", () => {
    expect(canJump(initialDoorHpState(0))).toBe(false);
  });

  it("a jump costs the flat per-jump amount", () => {
    const state = spendJumpHp(initialDoorHpState(100));
    expect(state.hp).toBe(100 - JUMP_HP_COST);
  });

  it("a wrong catch costs its own penalty on top of, not instead of, the jump cost", () => {
    let state = initialDoorHpState(100);
    state = spendJumpHp(state);
    state = spendWrongCatchHp(state);
    expect(state.hp).toBe(100 - JUMP_HP_COST - WRONG_CATCH_HP_PENALTY);
  });

  it("floors at 0 rather than going negative — no fail state, just a floor", () => {
    let state = initialDoorHpState(10);
    state = spendJumpHp(state);
    state = spendWrongCatchHp(state);
    expect(state.hp).toBe(0);
    expect(canJump(state)).toBe(false);
  });
});
