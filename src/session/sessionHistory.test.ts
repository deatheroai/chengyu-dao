import { describe, it, expect, beforeEach } from "vitest";
import {
  recordCompletedSession,
  hasPriorSession,
  allDiscoveredIdiomIds,
  pickResurfaceIdiomId,
  clearHistory,
  seedFakePriorSession,
} from "./sessionHistory";

beforeEach(() => {
  localStorage.clear();
});

describe("hasPriorSession", () => {
  it("is false before any session has completed", () => {
    expect(hasPriorSession()).toBe(false);
  });

  it("is true after recording a completed session", () => {
    recordCompletedSession(["a", "b", "c"]);
    expect(hasPriorSession()).toBe(true);
  });
});

describe("allDiscoveredIdiomIds", () => {
  it("is empty with no history", () => {
    expect(allDiscoveredIdiomIds()).toEqual([]);
  });

  it("collects ids across multiple sessions, deduplicated", () => {
    recordCompletedSession(["a", "b", "c"]);
    recordCompletedSession(["c", "d", "e"]);
    const ids = allDiscoveredIdiomIds();
    expect(new Set(ids)).toEqual(new Set(["a", "b", "c", "d", "e"]));
    expect(ids).toHaveLength(5);
  });

  it("survives malformed localStorage content rather than throwing", () => {
    localStorage.setItem("idiom-session-history", "{ not valid json");
    expect(allDiscoveredIdiomIds()).toEqual([]);
  });
});

describe("pickResurfaceIdiomId", () => {
  it("returns null when there's no prior session (first-ever visit)", () => {
    expect(pickResurfaceIdiomId()).toBeNull();
  });

  it("returns one of the previously-discovered ids", () => {
    recordCompletedSession(["a", "b", "c"]);
    const picked = pickResurfaceIdiomId(() => 0.5);
    expect(["a", "b", "c"]).toContain(picked);
  });

  it("is deterministic for a given rng", () => {
    recordCompletedSession(["a", "b", "c"]);
    expect(pickResurfaceIdiomId(() => 0)).toBe("a");
    expect(pickResurfaceIdiomId(() => 0.99)).toBe("c");
  });
});

describe("clearHistory", () => {
  it("resets back to a fresh, no-prior-session state", () => {
    recordCompletedSession(["a", "b", "c"]);
    expect(hasPriorSession()).toBe(true);
    clearHistory();
    expect(hasPriorSession()).toBe(false);
    expect(allDiscoveredIdiomIds()).toEqual([]);
  });
});

describe("seedFakePriorSession", () => {
  it("makes it look like exactly one prior session happened", () => {
    seedFakePriorSession("wen-gu-zhi-xin");
    expect(hasPriorSession()).toBe(true);
    expect(allDiscoveredIdiomIds()).toEqual(["wen-gu-zhi-xin"]);
    expect(pickResurfaceIdiomId()).toBe("wen-gu-zhi-xin");
  });
});
