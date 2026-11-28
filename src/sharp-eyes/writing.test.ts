import { describe, expect, it } from "vitest";
import type { Progress } from "./progress";
import { GAP_MS, afterDictation, dueNow, isComplex, timesWritten, waiting, withToWrite, withWrite, writeAfterFix } from "./writing";

const none: Progress = { stamps: {} };
const beach0 = { noteId: "p3-beach", mistake: 0 }; // 晴, 12 strokes
const play0 = { noteId: "p3-play", mistake: 0 }; // 场, 6 strokes
const weekend0 = { noteId: "p3-e-weekend", mistake: 0 }; // 晴 again
const cat = { noteId: "p3-q-cat", mistake: 0 }; // 睛

describe("which characters get written", () => {
  it("only harder ones: 场 is just picked, 晴 is written", () => {
    expect(isComplex("场")).toBe(false);
    expect(isComplex("在")).toBe(false);
    expect(isComplex("晴")).toBe(true);
    expect(writeAfterFix(none, "场")).toBe(false);
    expect(writeAfterFix(none, "晴")).toBe(true);
  });

  it("right after the first fix only; a counted write is remembered", () => {
    const p = withWrite(none, "晴", 1000);
    expect(timesWritten(p, "晴")).toBe(1);
    expect(writeAfterFix(p, "晴")).toBe(false);
    expect(timesWritten(withWrite(p, "晴", 2000, false), "晴")).toBe(1);
  });
});

describe("默写 later", () => {
  it("lists harder characters once each, never simple ones or ones written twice", () => {
    let p = withToWrite(none, play0);
    expect(p.toWrite).toBeUndefined();
    p = withToWrite(p, beach0);
    p = withToWrite(p, weekend0);
    expect(p.toWrite).toEqual([beach0]);
    const twice = withWrite(withWrite(none, "睛", 0), "睛", 0);
    expect(withToWrite(twice, cat).toWrite).toBeUndefined();
  });

  it("waits at least 3 minutes after writing it", () => {
    const t = 10_000_000;
    const p = withToWrite(withWrite(none, "晴", t), beach0);
    expect(dueNow(p, t + 60_000)).toEqual([]);
    expect(waiting(p, t + 60_000)).toBe(1);
    expect(dueNow(p, t + GAP_MS)).toEqual([beach0]);
    // From 快手改 (never written): due straight away.
    expect(dueNow(withToWrite(none, cat), t)).toEqual([cat]);
  });

  it("is done once written twice; a miss waits for another try later", () => {
    const t = 10_000_000;
    let p = withToWrite(withWrite(none, "晴", t), beach0);
    p = afterDictation(p, [{ item: beach0, ok: false }], t + GAP_MS);
    expect(p.toWrite).toEqual([beach0]);
    expect(dueNow(p, t + GAP_MS + 1000)).toEqual([]);
    p = afterDictation(p, [{ item: beach0, ok: true }], t + 3 * GAP_MS);
    expect(timesWritten(p, "晴")).toBe(2);
    expect(p.toWrite).toBeUndefined();
  });
});
