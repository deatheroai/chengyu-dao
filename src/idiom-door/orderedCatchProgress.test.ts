import { describe, it, expect } from "vitest";
import { attemptGrab, initialOrderedCatchState } from "./orderedCatchProgress";

describe("attemptGrab", () => {
  it("starts expecting index 0, not complete", () => {
    expect(initialOrderedCatchState()).toEqual({ nextIndex: 0, isComplete: false });
  });

  it("advances on the correct next index", () => {
    const { state, outcome } = attemptGrab(initialOrderedCatchState(), 0, 4);
    expect(outcome).toBe("advanced");
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
  });

  it("marks complete once the last index is grabbed", () => {
    const { state, outcome } = attemptGrab({ nextIndex: 3, isComplete: false }, 3, 4);
    expect(outcome).toBe("advanced");
    expect(state).toEqual({ nextIndex: 4, isComplete: true });
  });

  it("does not advance on a decoy (undefined index)", () => {
    const { state, outcome } = attemptGrab({ nextIndex: 1, isComplete: false }, undefined, 4);
    expect(outcome).toBe("wrong");
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
  });

  it("does not advance on the idiom's own character grabbed out of order", () => {
    // Index 2 belongs to this idiom, but index 1 hasn't been found yet.
    const { state, outcome } = attemptGrab({ nextIndex: 1, isComplete: false }, 2, 4);
    expect(outcome).toBe("wrong");
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
  });

  it("does not advance on an already-grabbed earlier index", () => {
    const { state, outcome } = attemptGrab({ nextIndex: 2, isComplete: false }, 0, 4);
    expect(outcome).toBe("wrong");
    expect(state).toEqual({ nextIndex: 2, isComplete: false });
  });

  it("reports already-complete and leaves state untouched once done", () => {
    const done = { nextIndex: 4, isComplete: true };
    const { state, outcome } = attemptGrab(done, 0, 4);
    expect(outcome).toBe("already-complete");
    expect(state).toBe(done);
  });
});
