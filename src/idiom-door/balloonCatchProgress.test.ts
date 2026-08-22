import { describe, it, expect } from "vitest";
import { initialBalloonCatchState, attemptBalloonCatch } from "./balloonCatchProgress";

describe("attemptBalloonCatch", () => {
  it("starts unresolved", () => {
    expect(initialBalloonCatchState()).toEqual({ resolved: false });
  });

  it("catching the correct balloon resolves the stage", () => {
    const { state, outcome } = attemptBalloonCatch(initialBalloonCatchState(), true);
    expect(outcome).toBe("correct");
    expect(state.resolved).toBe(true);
  });

  it("catching a decoy is a no-op — stays unresolved, no penalty", () => {
    const before = initialBalloonCatchState();
    const { state, outcome } = attemptBalloonCatch(before, false);
    expect(outcome).toBe("wrong");
    expect(state).toEqual(before);
  });

  it("once resolved, further catches (even the correct one again) report already-resolved and don't change state", () => {
    const resolved = attemptBalloonCatch(initialBalloonCatchState(), true).state;
    const again = attemptBalloonCatch(resolved, true);
    expect(again.outcome).toBe("already-resolved");
    expect(again.state).toEqual(resolved);

    const wrongAfterResolved = attemptBalloonCatch(resolved, false);
    expect(wrongAfterResolved.outcome).toBe("already-resolved");
    expect(wrongAfterResolved.state).toEqual(resolved);
  });
});
