import { describe, expect, it } from "vitest";
import {
  starsForFreeWriting, targetMsFor, recordStars, recordTime, recordTest, emptyProgress,
  loadProgress, saveProgress, clearProgress, formatSeconds,
} from "./progress";

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe("stars", () => {
  it("gives 3 stars only for flawless free writing within the target time", () => {
    expect(starsForFreeWriting(0, 9000, 12000)).toBe(3);
    expect(starsForFreeWriting(0, 12000, 12000)).toBe(3);
    expect(starsForFreeWriting(0, 12001, 12000)).toBe(2);
    expect(starsForFreeWriting(1, 5000, 12000)).toBe(2);
    expect(starsForFreeWriting(4, 5000, 12000)).toBe(1);
  });
  it("doesn't hold an untimed attempt against her", () => {
    expect(starsForFreeWriting(0, null, 12000)).toBe(3);
  });
  it("allows 1.5 seconds per stroke, rounded up to whole seconds", () => {
    expect(targetMsFor(8)).toBe(12000);
    expect(targetMsFor(7)).toBe(11000);
    expect(targetMsFor(11)).toBe(17000);
  });
  it("keeps the best stars ever earned", () => {
    const p = emptyProgress();
    expect(recordStars(p, "借", 3)).toBe(true);
    expect(recordStars(p, "借", 1)).toBe(false);
    expect(p.stars["借"]).toBe(3);
  });
});

describe("best time", () => {
  it("only replaces a time with a faster one", () => {
    const p = emptyProgress();
    expect(recordTime(p, "借", 9000)).toBe(true);
    expect(recordTime(p, "借", 9500)).toBe(false);
    expect(recordTime(p, "借", 7000)).toBe(true);
    expect(p.bestMs["借"]).toBe(7000);
  });
  it("formats seconds to one decimal", () => {
    expect(formatSeconds(8340)).toBe("8.3 秒");
  });
});

describe("memory test", () => {
  it("records last results and the best score", () => {
    const p = emptyProgress();
    recordTest(p, [{ char: "忽", result: "correct" }, { char: "馆", result: "revealed" }]);
    recordTest(p, [{ char: "忽", result: "shaky" }, { char: "馆", result: "revealed" }]);
    expect(p.lastTest).toEqual({ 忽: "shaky", 馆: "revealed" });
    expect(p.bestTestScore).toBe(1);
  });
});

describe("saving", () => {
  it("round-trips through storage, per story", () => {
    const store = memoryStore();
    const p = emptyProgress();
    recordStars(p, "借", 2);
    recordTime(p, "借", 6100);
    saveProgress("a", p, store);
    expect(loadProgress("a", store)).toEqual(p);
    expect(loadProgress("b", store)).toEqual(emptyProgress());
  });
  it("ignores corrupt or out-of-range saved data", () => {
    const store = memoryStore();
    store.setItem("story-writer:v1:a", "{not json");
    expect(loadProgress("a", store)).toEqual(emptyProgress());
    store.setItem("story-writer:v1:a", JSON.stringify({ stars: { 借: 9, 馆: 2 }, bestMs: { 借: -1 }, lastTest: { 借: "??" } }));
    expect(loadProgress("a", store)).toEqual({ stars: { 馆: 2 }, bestMs: {}, lastTest: {}, bestTestScore: 0 });
  });
  it("works with no storage at all", () => {
    expect(loadProgress("a", null)).toEqual(emptyProgress());
    expect(() => saveProgress("a", emptyProgress(), null)).not.toThrow();
  });
  it("clears one story's progress", () => {
    const store = memoryStore();
    saveProgress("a", emptyProgress(), store);
    clearProgress("a", store);
    expect(store.raw.size).toBe(0);
  });
});
