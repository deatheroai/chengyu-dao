import { describe, expect, it } from "vitest";
import { countHanzi, finishSentence, insertWord, isUsableSentence, sensesUsed, turnStars, usesWord, wordsFor } from "./expansion";
import { ADVENTURES } from "./adventures";

const beat = ADVENTURES[0].beats[1]; // 咪咪 in the yard

describe("countHanzi / isUsableSentence", () => {
  it("counts only Chinese characters", () => {
    expect(countHanzi("咪咪跳水坑。 ok")).toBe(5);
  });
  it("needs a few characters and no unfilled gap", () => {
    expect(isUsableSentence("跳")).toBe(false);
    expect(isUsableSentence("咪咪跳水坑")).toBe(true);
    expect(isUsableSentence("咪咪像……一样跳")).toBe(false);
  });
});

describe("usesWord", () => {
  it("matches plain words, ignoring a trailing 的/地", () => {
    expect(usesWord("小草软软地趴着", "软软的")).toBe(true);
    expect(usesWord("小草很绿", "软软的")).toBe(false);
  });
  it("matches a pattern only when its gaps are filled in order", () => {
    expect(usesWord("雨像银线一样", "像……一样")).toBe(true);
    expect(usesWord("雨像一样", "像……一样")).toBe(false);
    expect(usesWord("一样像", "像……一样")).toBe(false);
    expect(usesWord("她一边跑一边笑", "一边……一边……")).toBe(true);
    expect(usesWord("她一边跑一边……", "一边……一边……")).toBe(false);
  });
});

describe("wordsFor / sensesUsed", () => {
  it("puts scene words before general ones, without duplicates", () => {
    const words = wordsFor(beat, "touch");
    expect(words[0]).toBe("湿湿的草地");
    expect(new Set(words).size).toBe(words.length);
    expect(words).toContain("毛茸茸的");
  });
  it("finds the senses a sentence uses", () => {
    expect(sensesUsed("咪咪跳水坑。", beat)).toEqual([]);
    expect(sensesUsed("咪咪啪嗒啪嗒地踩着湿湿的草地，开心极了。", beat)).toEqual(["hear", "touch", "feel"]);
  });
  it("gives stars for the number of senses", () => {
    expect(turnStars([])).toBe(1);
    expect(turnStars(["see"])).toBe(2);
    expect(turnStars(["see", "hear"])).toBe(3);
  });
});

describe("insertWord", () => {
  it("inserts at the caret and moves the caret after it", () => {
    expect(insertWord("咪咪跳", 2, 2, "开心地")).toEqual({ value: "咪咪开心地跳", selectionStart: 5, selectionEnd: 5 });
  });
  it("replaces a selection", () => {
    expect(insertWord("咪咪走", 2, 3, "跑").value).toBe("咪咪跑");
  });
  it("selects a pattern's first gap so typing fills it", () => {
    const r = insertWord("雨", 1, 1, "像……一样");
    expect(r.value).toBe("雨像……一样");
    expect(r.value.slice(r.selectionStart, r.selectionEnd)).toBe("……");
  });
});

describe("finishSentence", () => {
  it("adds a full stop only when needed", () => {
    expect(finishSentence(" 咪咪跳 ")).toBe("咪咪跳。");
    expect(finishSentence("哎呀！")).toBe("哎呀！");
  });
});
