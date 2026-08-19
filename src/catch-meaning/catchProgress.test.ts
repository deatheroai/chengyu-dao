import { describe, it, expect } from "vitest";
import { applyCatch, initialCatchState } from "./catchProgress";

describe("applyCatch", () => {
  it("starts with nothing caught or revealed", () => {
    expect(initialCatchState()).toEqual({ correctCatches: 0, revealedCount: 0, isComplete: false });
  });

  it("reveals the next character on each correct catch", () => {
    let state = initialCatchState();
    state = applyCatch(state, "correct", 4);
    expect(state).toEqual({ correctCatches: 1, revealedCount: 1, isComplete: false });

    state = applyCatch(state, "correct", 4);
    expect(state).toEqual({ correctCatches: 2, revealedCount: 2, isComplete: false });
  });

  it("marks complete once correct catches reach totalCharacters", () => {
    let state = initialCatchState();
    for (let i = 0; i < 4; i++) state = applyCatch(state, "correct", 4);
    expect(state).toEqual({ correctCatches: 4, revealedCount: 4, isComplete: true });
  });

  it("leaves state unchanged on a decoy catch", () => {
    const state = applyCatch({ correctCatches: 2, revealedCount: 2, isComplete: false }, "decoy", 4);
    expect(state).toEqual({ correctCatches: 2, revealedCount: 2, isComplete: false });
  });

  it("never reveals more than totalCharacters, even with excess correct catches", () => {
    let state = initialCatchState();
    for (let i = 0; i < 10; i++) state = applyCatch(state, "correct", 4);
    expect(state).toEqual({ correctCatches: 10, revealedCount: 4, isComplete: true });
  });

  it("treats zero characters as immediately complete on the first correct catch", () => {
    const state = applyCatch(initialCatchState(), "correct", 0);
    expect(state).toEqual({ correctCatches: 1, revealedCount: 0, isComplete: true });
  });
});
