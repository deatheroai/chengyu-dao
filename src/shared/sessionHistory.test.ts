import { describe, it, expect, beforeEach } from "vitest";
import {
  recordCompletedSession,
  hasPriorSession,
  allDiscoveredIdiomIds,
  pickResurfaceIdiomId,
  clearHistory,
  seedFakePriorSession,
  exportForCloud,
  importFromCloud,
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

describe("exportForCloud / importFromCloud", () => {
  it("round-trips local history through an export/import pair unchanged", () => {
    recordCompletedSession(["a", "b", "c"], 1000);
    const exported = exportForCloud();
    clearHistory();
    expect(hasPriorSession()).toBe(false);
    importFromCloud(exported);
    expect(allDiscoveredIdiomIds()).toEqual(["a", "b", "c"]);
  });

  it("merges a remote history into a non-empty local one rather than overwriting it", () => {
    recordCompletedSession(["a", "b", "c"], 1000);
    importFromCloud({ completedSessions: [{ idiomIds: ["d", "e", "f"], completedAt: 2000 }] });
    expect(new Set(allDiscoveredIdiomIds())).toEqual(new Set(["a", "b", "c", "d", "e", "f"]));
  });

  it("deduplicates a session that's identical (same completedAt + idiomIds) on both sides", () => {
    recordCompletedSession(["a", "b", "c"], 1000);
    importFromCloud({ completedSessions: [{ idiomIds: ["a", "b", "c"], completedAt: 1000 }] });
    const data = exportForCloud();
    expect(data.completedSessions).toHaveLength(1);
  });

  it("ignores malformed remote input rather than throwing or corrupting local data", () => {
    recordCompletedSession(["a"], 1000);
    importFromCloud(null);
    importFromCloud("not an object");
    importFromCloud({ completedSessions: "not an array" });
    importFromCloud({ completedSessions: [{ idiomIds: "not an array", completedAt: 1 }, { idiomIds: ["b"] }] });
    expect(allDiscoveredIdiomIds()).toEqual(["a"]);
  });
});
