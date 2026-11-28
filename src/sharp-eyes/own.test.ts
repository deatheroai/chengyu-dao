import { describe, expect, it } from "vitest";
import type { SavedStory } from "../story-builder/library";
import { nextSlip, slipNote, slipsFromLibrary, withOwnSeen } from "./own";
import { choices, correctText, parseNote, writtenText } from "./round";

const story = (lines: SavedStory["lines"]): SavedStory => ({ id: "s", adventureId: "a", title: "t", savedAt: 1, lines });
const bazaar = { wrong: "芭莎", right: "巴刹", why: "巴刹是卖菜、卖鱼、卖肉的市场。" };
const already = { wrong: "以经", right: "已经", why: "“已经”的“已”，口是开着的。" };

describe("her own slips", () => {
  const stories = [
    story([
      { by: "partner", text: "团团去巴刹。" },
      { by: "child", text: "我和妈妈去巴刹买鱼。", fixes: [bazaar] },
      { by: "child", text: "鱼已经卖完了，我们只好买了很多很多很多的虾回家煮汤喝。", fixes: [already] },
      { by: "child", text: "改过了的句子。", fixes: [{ wrong: "x", right: "不在里面", why: "" }] },
    ]),
  ];

  it("come from her own lines that 团团 corrected, cut to the part around the word", () => {
    const slips = slipsFromLibrary(stories);
    expect(slips.map((s) => s.sentence)).toEqual(["我和妈妈去巴刹买鱼。", "鱼已经卖完了，"]);
    expect(new Set(slips.map((s) => s.id)).size).toBe(2);
    expect(slipsFromLibrary([...stories, ...stories])).toHaveLength(2);
  });

  it("become ⚡ sentences with each changed character to find, choosing between hers and the right one", () => {
    const [b, a] = slipsFromLibrary(stories);
    const p = parseNote(slipNote(b, 3));
    expect(writtenText(p)).toBe("我和妈妈去芭莎买鱼。");
    expect(correctText(p)).toBe("我和妈妈去巴刹买鱼。");
    expect(p.mistakes.map((m) => [m.wrong, m.right])).toEqual([
      ["芭", "巴"],
      ["莎", "刹"],
    ]);
    expect(choices(p, 0).sort()).toEqual(["巴", "芭"].sort());
    expect(p.mistakes[0].oops).toContain("你以前也写过“芭莎”");
    const one = parseNote(slipNote(a, 4));
    expect(one.mistakes.map((m) => [m.wrong, m.right])).toEqual([["以", "已"]]);
    expect(one.note.kind).toBe("quick");
  });

  it("show a new one first, then the one shown longest ago", () => {
    const slips = slipsFromLibrary(stories);
    let p = withOwnSeen({ stamps: {} }, slips[0].id);
    expect(nextSlip(p, slips)!.id).toBe(slips[1].id);
    p = withOwnSeen(p, slips[1].id);
    expect(nextSlip(p, slips)!.id).toBe(slips[0].id);
    expect(nextSlip(p, [])).toBeUndefined();
  });
});
