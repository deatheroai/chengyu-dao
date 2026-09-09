import { describe, it, expect } from "vitest";
import { attemptGrab, initialOrderedCatchState } from "./orderedCatchProgress";

const CHARS = Array.from("拔苗助长");

describe("attemptGrab", () => {
  it("starts expecting index 0, not complete", () => {
    expect(initialOrderedCatchState()).toEqual({ nextIndex: 0, isComplete: false });
  });

  it("advances on the correct next glyph", () => {
    const { state, outcome } = attemptGrab(initialOrderedCatchState(), CHARS[0], CHARS);
    expect(outcome).toBe("advanced");
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
  });

  it("marks complete once the last glyph is grabbed", () => {
    const { state, outcome } = attemptGrab({ nextIndex: 3, isComplete: false }, CHARS[3], CHARS);
    expect(outcome).toBe("advanced");
    expect(state).toEqual({ nextIndex: 4, isComplete: true });
  });

  it("does not advance on a decoy (undefined glyph)", () => {
    const { state, outcome } = attemptGrab({ nextIndex: 1, isComplete: false }, undefined, CHARS);
    expect(outcome).toBe("wrong");
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
  });

  it("does not advance on the idiom's own character grabbed out of order", () => {
    // CHARS[2] belongs to this idiom, but CHARS[1] hasn't been found yet.
    const { state, outcome } = attemptGrab({ nextIndex: 1, isComplete: false }, CHARS[2], CHARS);
    expect(outcome).toBe("wrong");
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
  });

  it("does not advance on an already-grabbed earlier glyph", () => {
    const { state, outcome } = attemptGrab({ nextIndex: 2, isComplete: false }, CHARS[0], CHARS);
    expect(outcome).toBe("wrong");
    expect(state).toEqual({ nextIndex: 2, isComplete: false });
  });

  it("reports already-complete and leaves state untouched once done", () => {
    const done = { nextIndex: 4, isComplete: true };
    const { state, outcome } = attemptGrab(done, CHARS[0], CHARS);
    expect(outcome).toBe("already-complete");
    expect(state).toBe(done);
  });

  it("a repeated glyph satisfies whichever occurrence is still outstanding, in either order", () => {
    // 一心一意: index 0 and index 2 are both 一 — grabbing *any* 一 tile
    // while either position is next should advance, since what the
    // child actually grabbed is exactly the glyph asked for.
    const chars = Array.from("一心一意");
    let state = initialOrderedCatchState();
    state = attemptGrab(state, chars[0], chars).state; // 一 -> advances to index 1
    expect(state).toEqual({ nextIndex: 1, isComplete: false });
    state = attemptGrab(state, chars[1], chars).state; // 心 -> advances to index 2
    expect(state).toEqual({ nextIndex: 2, isComplete: false });
    // Now expecting the second 一 — a tile tagged for the *first* 一's
    // position, but showing the same glyph, still satisfies it.
    const { state: finalState, outcome } = attemptGrab(state, chars[0], chars);
    expect(outcome).toBe("advanced");
    expect(finalState).toEqual({ nextIndex: 3, isComplete: false });
  });
});
