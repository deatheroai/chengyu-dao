// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { deleteStory, loadLibrary, saveStory, storyText, type SavedStory } from "./library";

const story = (id: string, savedAt = 1): SavedStory => ({
  id,
  adventureId: "beach-day",
  title: "海边的一天",
  savedAt,
  lines: [
    { by: "partner", text: "星期六，小明来到了海边。" },
    { by: "child", text: "蓝蓝的大海哗哗地响。", plain: "大海很大。", senses: ["see", "hear"] },
  ],
});

describe("story library", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty and survives junk data", () => {
    expect(loadLibrary()).toEqual([]);
    localStorage.setItem("chengyu-dao:story-builder:library:v1", "{nope");
    expect(loadLibrary()).toEqual([]);
    localStorage.setItem("chengyu-dao:story-builder:library:v1", JSON.stringify([{ id: 1 }, story("a")]));
    expect(loadLibrary().map((s) => s.id)).toEqual(["a"]);
  });

  it("saves newest first, replaces by id and deletes", () => {
    saveStory(story("a"));
    saveStory(story("b"));
    saveStory({ ...story("a"), title: "改过的" });
    expect(loadLibrary().map((s) => [s.id, s.title])).toEqual([
      ["a", "改过的"],
      ["b", "海边的一天"],
    ]);
    expect(deleteStory("a").map((s) => s.id)).toEqual(["b"]);
  });

  it("keeps at most 30 stories", () => {
    for (let i = 0; i < 35; i++) saveStory(story(`s${i}`));
    expect(loadLibrary()).toHaveLength(30);
    expect(loadLibrary()[0].id).toBe("s34");
  });

  it("joins the lines into one paragraph", () => {
    expect(storyText(story("a").lines)).toBe("星期六，小明来到了海边。蓝蓝的大海哗哗地响。");
  });
});
