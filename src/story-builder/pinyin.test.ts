import { describe, expect, it } from "vitest";
import { charPinyin, toneless } from "./pinyin";
import { ADVENTURES } from "./adventures";
import { SENSES } from "./senses";

function at(text: string, sub: string, offset: number): string {
  return charPinyin(text)[Array.from(text).indexOf(sub[0]) + offset];
}

describe("charPinyin", () => {
  it("has one entry per character, empty for punctuation", () => {
    const p = charPinyin("雨停了。");
    expect(p).toEqual(["yǔ", "tíng", "le", ""]);
  });

  it("reads adverb 地 as de but ground 地 as dì", () => {
    expect(charPinyin("慢慢地走")[2]).toBe("de");
    expect(charPinyin("叽叽喳喳地唱歌")[4]).toBe("de");
    expect(charPinyin("笑眯眯地")[3]).toBe("de");
    expect(charPinyin("雨点滴滴答答地落下")[6]).toBe("de");
    expect(charPinyin("湿湿的草地")[4]).toBe("dì");
    expect(charPinyin("地上有水")[0]).toBe("dì");
  });

  it("reads complement 得 as de but 得意 as dé", () => {
    expect(charPinyin("水花溅得高高的")[3]).toBe("de");
    expect(charPinyin("紧张得心怦怦跳")[2]).toBe("de");
    expect(charPinyin("舍不得走")[2]).toBe("de");
    expect(at("得意地笑了", "得", 0)).toBe("dé");
    expect(charPinyin("得意地笑了")[2]).toBe("de");
  });

  it("gives every Chinese character in the authored content a reading", () => {
    const texts: string[] = [];
    for (const a of ADVENTURES) {
      texts.push(a.title, a.blurb, a.ending);
      for (const b of a.beats) {
        texts.push(b.partner, b.prompt, ...b.starters, ...Object.values(b.words).flat(), b.example.rich);
      }
    }
    for (const s of SENSES) texts.push(s.question, ...s.words);
    for (const t of texts) {
      const p = charPinyin(t);
      Array.from(t).forEach((c, i) => {
        if (/\p{Script=Han}/u.test(c)) expect(p[i], `${c} in ${t}`).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/);
      });
    }
  });
  it("reads common words with their neutral tone", () => {
    expect(charPinyin("小息的时候")).toEqual(["xiǎo", "xī", "de", "shí", "hou"]);
    expect(charPinyin("早上，好朋友来了")).toEqual(["zǎo", "shang", "", "hǎo", "péng", "you", "lái", "le"]);
    expect(charPinyin("买东西")[2]).toBe("xi");
    expect(charPinyin("看看")).toEqual(["kàn", "kan"]);
    // Only the second syllable, and only inside the word.
    expect(charPinyin("时间")).toEqual(["shí", "jiān"]);
  });

  it("drops only the tone mark", () => {
    expect(toneless("hòu")).toBe("hou");
    expect(toneless("lǜ")).toBe("lü");
  });
});
