import { describe, it, expect } from "vitest";
import { buildMatchLevel } from "./matchLevelContent";
import { idioms } from "../idioms/idioms";

describe("buildMatchLevel", () => {
  it("produces two tiles per idiom, split first-two/last-two", () => {
    const level = buildMatchLevel(["yi-xin-yi-yi", "you-shi-you-zhong"]);
    expect(level.tiles).toHaveLength(4);

    const byId = Object.fromEntries(level.tiles.map((t) => [t.id, t]));
    expect(byId["yi-xin-yi-yi-first"]).toMatchObject({ text: "一心", idiomId: "yi-xin-yi-yi", half: "first" });
    expect(byId["yi-xin-yi-yi-second"]).toMatchObject({ text: "一意", idiomId: "yi-xin-yi-yi", half: "second" });
    expect(byId["you-shi-you-zhong-first"]).toMatchObject({ text: "有始", idiomId: "you-shi-you-zhong", half: "first" });
    expect(byId["you-shi-you-zhong-second"]).toMatchObject({ text: "有终", idiomId: "you-shi-you-zhong", half: "second" });
  });

  it("carries each tile's own pinyin syllables, not the whole idiom's", () => {
    const level = buildMatchLevel(["yi-xin-yi-yi"]);
    const first = level.tiles.find((t) => t.id === "yi-xin-yi-yi-first")!;
    const second = level.tiles.find((t) => t.id === "yi-xin-yi-yi-second")!;
    expect(first.pinyin).toBe("yī xīn");
    expect(second.pinyin).toBe("yī yì");
  });

  it("shuffles deterministically — same idiom set always produces the same order", () => {
    const a = buildMatchLevel(["yi-xin-yi-yi", "you-shi-you-zhong", "ban-tu-er-fei"]);
    const b = buildMatchLevel(["yi-xin-yi-yi", "you-shi-you-zhong", "ban-tu-er-fei"]);
    expect(a.tiles.map((t) => t.id)).toEqual(b.tiles.map((t) => t.id));
  });

  it("throws for an unknown idiom id", () => {
    expect(() => buildMatchLevel(["not-a-real-idiom"])).toThrow(/not found/);
  });

  it("throws if two idioms in the set share the same first half", () => {
    expect(() => buildMatchLevel(["yi-xin-yi-yi", "yi-xin-yi-yi"])).toThrow(/share the same first half/);
  });

  it("has no first-half or last-half collisions across the entire approved idiom pool", () => {
    // The real invariant this mechanic depends on: every idiom's
    // "join the halves" puzzle must have exactly one correct answer,
    // even if every approved idiom were ever used in one match level.
    const allIds = idioms.map((i) => i.id);
    expect(() => buildMatchLevel(allIds)).not.toThrow();
  });
});
