import { describe, expect, it } from "vitest";
import { stories, currentStoryId, type Story } from "./stories";
import { storyGroups, isComplete, reviewItems, pageFor, storyHref, reviewHref, starTotal, reviewName } from "./library";
import { emptyProgress } from "./progress";

const fake = (n: number): Story[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    title: `故事${i + 1}`,
    text: "",
    targets: [{ char: String.fromCharCode(0x4e00 + i), pinyin: "", word: "", meaning: "" }],
  }));

describe("story sets", () => {
  it("groups stories in threes, in order, with a short last set", () => {
    const groups = storyGroups(fake(7));
    expect(groups.map((g) => g.stories.map((s) => s.id))).toEqual([["s1", "s2", "s3"], ["s4", "s5", "s6"], ["s7"]]);
    expect(groups.map(isComplete)).toEqual([true, true, false]);
    expect(groups.map((g) => g.id)).toEqual(["review-1", "review-2", "review-3"]);
  });

  it("a revision tests every character of its three stories, each with its own story", () => {
    const [g] = storyGroups();
    const items = reviewItems(g);
    expect(items).toHaveLength(g.stories.reduce((n, s) => n + s.targets.length, 0));
    for (const { story, target } of items) expect(story.targets).toContain(target);
  });

  it("no character is a target in two stories, so a revision never repeats one", () => {
    const chars = stories.flatMap((s) => s.targets.map((t) => t.char));
    expect(new Set(chars).size).toBe(chars.length);
  });

  it("story ids are unique", () => {
    expect(new Set(stories.map((s) => s.id)).size).toBe(stories.length);
  });
});

describe("pageFor", () => {
  it("defaults to the current story", () => {
    expect(pageFor("")).toMatchObject({ kind: "story", story: { id: currentStoryId }, practise: [] });
  });
  it("opens an earlier story, and the characters to practise in it", () => {
    const st = stories[0];
    const p = pageFor(storyHref(st, [st.targets[1].char, "不"]));
    expect(p).toMatchObject({ kind: "story", story: { id: st.id }, practise: [st.targets[1].char] });
  });
  it("falls back to the current story for an unknown id", () => {
    expect(pageFor("?story=nope")).toMatchObject({ kind: "story", story: { id: currentStoryId } });
  });
  it("opens a full revision set, but not a short one", () => {
    const groups = storyGroups(fake(4));
    expect(pageFor(reviewHref(groups[0]), fake(4))).toMatchObject({ kind: "review", group: { number: 1 } });
    expect(pageFor(reviewHref(groups[1]), fake(4))).toMatchObject({ kind: "story" });
  });
});

describe("labels", () => {
  it("totals a story's stars", () => {
    const st = stories[0];
    const p = emptyProgress();
    p.stars[st.targets[0].char] = 3;
    p.stars[st.targets[1].char] = 1;
    expect(starTotal(st, p)).toEqual({ earned: 4, max: st.targets.length * 3 });
  });
  it("names revisions in Chinese numerals", () => {
    const [a, b] = storyGroups(fake(6));
    expect([reviewName(a), reviewName(b)]).toEqual(["复习一", "复习二"]);
  });
});
