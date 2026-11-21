// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteGrown, loadGarden, saveGrown, type GrownSentence } from "./garden";

const KEY = "chengyu-dao:sentence-grower:garden:v1";

const grown = (id: string, savedAt = 1): GrownSentence => ({
  id,
  seedId: "puppy",
  emoji: "🐶🌳",
  title: "草地上的小狗",
  plain: "小狗在跑。",
  layers: [{ sense: "see", text: "白白的小狗在跑。", done: true }],
  final: "白白的小狗在跑。",
  savedAt,
});

describe("我的好句子", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => history.replaceState(null, "", "/"));

  it("starts empty and survives junk data", () => {
    expect(loadGarden()).toEqual([]);
    localStorage.setItem(KEY, "{nope");
    expect(loadGarden()).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify([{ id: 1 }, { ...grown("bad"), layers: [{ sense: "taste", text: "" }] }, grown("a")]));
    expect(loadGarden().map((s) => s.id)).toEqual(["a"]);
  });

  it("saves newest first, replaces by id and deletes", () => {
    saveGrown(grown("a"));
    saveGrown(grown("b"));
    saveGrown({ ...grown("a"), final: "白白的小狗快快地跑。" });
    expect(loadGarden().map((s) => s.id)).toEqual(["a", "b"]);
    expect(loadGarden()[0].final).toBe("白白的小狗快快地跑。");
    deleteGrown("a");
    expect(loadGarden().map((s) => s.id)).toEqual(["b"]);
  });

  it("keeps at most 50", () => {
    for (let i = 0; i < 55; i++) saveGrown(grown(`s${i}`, i));
    expect(loadGarden()).toHaveLength(50);
    expect(loadGarden()[0].id).toBe("s54");
  });

  it("uses a separate list in ?test mode", () => {
    saveGrown(grown("real"));
    history.replaceState(null, "", "/?test");
    expect(loadGarden()).toEqual([]);
    saveGrown(grown("trial"));
    history.replaceState(null, "", "/");
    expect(loadGarden().map((s) => s.id)).toEqual(["real"]);
  });
});
