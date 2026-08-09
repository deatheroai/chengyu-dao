import { describe, it, expect } from "vitest";
import {
  createSession,
  currentIdiomId,
  completeReveal,
  completeMeaningCheck,
  pickSessionIdioms,
  SESSION_LENGTH,
} from "./sessionState";
import { idioms } from "../idioms/idioms";

const IDS = ["a", "b", "c"];

function fixedRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("createSession", () => {
  it("throws unless given exactly SESSION_LENGTH idiom ids", () => {
    expect(() => createSession(["a", "b"])).toThrow();
    expect(() => createSession(["a", "b", "c", "d"])).toThrow();
    expect(() => createSession(IDS)).not.toThrow();
  });

  it("starts at index 0, reveal phase, nothing discovered yet", () => {
    const state = createSession(IDS);
    expect(state.currentIndex).toBe(0);
    expect(state.phase).toBe("reveal");
    expect(state.discoveredIds).toEqual([]);
  });
});

describe("currentIdiomId", () => {
  it("returns the id at the current index", () => {
    const state = createSession(IDS);
    expect(currentIdiomId(state)).toBe("a");
  });
});

describe("completeReveal", () => {
  it("moves reveal -> meaning-check for the same idiom", () => {
    const state = createSession(IDS);
    const next = completeReveal(state);
    expect(next.phase).toBe("meaning-check");
    expect(next.currentIndex).toBe(0);
    expect(currentIdiomId(next)).toBe("a");
  });

  it("is a no-op if not currently in the reveal phase", () => {
    const state = { ...createSession(IDS), phase: "meaning-check" as const };
    expect(completeReveal(state)).toBe(state);
  });
});

describe("completeMeaningCheck", () => {
  it("advances to the next idiom's reveal phase and records the discovery", () => {
    const state = completeReveal(createSession(IDS));
    const next = completeMeaningCheck(state);
    expect(next.phase).toBe("reveal");
    expect(next.currentIndex).toBe(1);
    expect(currentIdiomId(next)).toBe("b");
    expect(next.discoveredIds).toEqual(["a"]);
  });

  it("is a no-op if not currently in the meaning-check phase", () => {
    const state = createSession(IDS); // phase: "reveal"
    expect(completeMeaningCheck(state)).toBe(state);
  });

  it("completes the session after the last idiom, keeping all discoveries", () => {
    let state = createSession(IDS);
    for (let i = 0; i < SESSION_LENGTH; i++) {
      state = completeReveal(state);
      state = completeMeaningCheck(state);
    }
    expect(state.phase).toBe("complete");
    expect(state.discoveredIds).toEqual(IDS);
  });

  it("never grows the session past SESSION_LENGTH idioms even if driven further", () => {
    let state = createSession(IDS);
    for (let i = 0; i < SESSION_LENGTH; i++) {
      state = completeReveal(state);
      state = completeMeaningCheck(state);
    }
    // Once complete, phase is neither "reveal" nor "meaning-check", so
    // both transitions are no-ops - there's no path back into the cycle.
    const stuck1 = completeReveal(state);
    const stuck2 = completeMeaningCheck(state);
    expect(stuck1).toBe(state);
    expect(stuck2).toBe(state);
  });
});

describe("pickSessionIdioms", () => {
  it("returns exactly SESSION_LENGTH distinct idioms from the real content set", () => {
    const picked = pickSessionIdioms(idioms, fixedRng([0.1, 0.4, 0.7, 0.9, 0.2]));
    expect(picked).toHaveLength(SESSION_LENGTH);
    expect(new Set(picked.map((i) => i.id)).size).toBe(SESSION_LENGTH);
  });

  it("throws if the pool has fewer than SESSION_LENGTH idioms", () => {
    expect(() => pickSessionIdioms(idioms.slice(0, 2))).toThrow();
  });
});
