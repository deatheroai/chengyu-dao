// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { firstFindToday, loadProgress, notesDone, saveProgress, today, withStamp } from "./progress";

const KEY = "chengyu-dao:sharp-eyes:progress:v1";

describe("火眼金睛 progress", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => history.replaceState(null, "", "/"));

  it("starts empty and survives junk", () => {
    expect(loadProgress()).toEqual({ stamps: {} });
    localStorage.setItem(KEY, "{nope");
    expect(loadProgress()).toEqual({ stamps: {} });
    localStorage.setItem(KEY, JSON.stringify({ stamps: { "p3-play": "优", "p3-lift": "满分", gone: "优" }, lastFindDay: 3 }));
    expect(loadProgress()).toEqual({ stamps: { "p3-play": "优" } });
  });

  it("saves, and keeps test mode separate", () => {
    saveProgress(withStamp({ stamps: {} }, "p3-play", "良"));
    expect(loadProgress().stamps).toEqual({ "p3-play": "良" });
    history.replaceState(null, "", "/?test");
    expect(loadProgress()).toEqual({ stamps: {} });
  });

  it("keeps the better stamp", () => {
    let p = withStamp({ stamps: {} }, "a", "良");
    p = withStamp(p, "a", "加油");
    expect(p.stamps.a).toBe("良");
    p = withStamp(p, "a", "优");
    expect(p.stamps.a).toBe("优");
    expect(notesDone(p)).toBe(1);
  });

  it("knows her first find of the day", () => {
    const d = new Date(2026, 10, 25, 9);
    expect(today(d)).toBe("2026-11-25");
    const a = firstFindToday({ stamps: {} }, d);
    expect(a.first).toBe(true);
    expect(firstFindToday(a.progress, d).first).toBe(false);
    expect(firstFindToday(a.progress, new Date(2026, 10, 26, 9)).first).toBe(true);
  });
});
