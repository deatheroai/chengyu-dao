// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NOTES, starterNote } from "./notes";
import { firstFindToday, loadProgress, nextNote, notesDone, saveProgress, today, withStamp } from "./progress";

const KEY = "chengyu-dao:sharp-eyes:progress:v1";
const finds = NOTES.filter((n) => n.kind === "find");

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

  it("offers the starter first, then notes without a stamp, then ones not yet 优", () => {
    expect(nextNote({ stamps: {} }).id).toBe(starterNote().id);
    let p = withStamp({ stamps: {} }, starterNote().id, "加油");
    expect(nextNote(p).id).toBe(finds.find((n) => !n.starter)!.id);
    for (const n of finds) p = withStamp(p, n.id, "优");
    p = { stamps: { ...p.stamps, [finds[2].id]: "良" } };
    expect(nextNote(p).id).toBe(finds[2].id);
    p = withStamp(p, finds[2].id, "优");
    expect(nextNote(p).id).toBe(finds[0].id);
  });

  it("offers P3 notes before P4 and P5", () => {
    let p = { stamps: {} } as ReturnType<typeof loadProgress>;
    const levels: number[] = [];
    for (let i = 0; i < finds.length; i++) {
      const n = nextNote(p);
      levels.push(n.level);
      p = withStamp(p, n.id, "优");
    }
    expect(levels).toEqual([...levels].sort());
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
