import { describe, expect, it } from "vitest";
import { countHanzi, finishSentence, isUsableSentence, sensesUsed, usesWord, wordsFor } from "./expansion";
import { ADVENTURES } from "./adventures";

const beat = ADVENTURES[0].beats[1]; // 小华 and 阿明 at the playground

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
    expect(words[0]).toBe("滑溜溜的");
    expect(new Set(words).size).toBe(words.length);
    expect(words).toContain("毛茸茸的");
  });
  it("finds the senses a sentence uses", () => {
    expect(sensesUsed("小华玩滑梯。", beat)).toEqual([]);
    expect(sensesUsed("小华嗖的一声滑下来，滑梯滑溜溜的，她玩得满头大汗。", beat)).toEqual(["hear", "touch", "feel"]);
  });
});

describe("finishSentence", () => {
  it("adds a full stop only when needed", () => {
    expect(finishSentence(" 咪咪跳 ")).toBe("咪咪跳。");
    expect(finishSentence("哎呀！")).toBe("哎呀！");
  });
});
