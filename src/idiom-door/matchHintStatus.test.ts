import { describe, it, expect } from "vitest";
import { buildHintMaskedIdiom } from "./matchHintStatus";
import { idiomsById } from "../idioms/idioms";

describe("buildHintMaskedIdiom", () => {
  it("keeps the idiom's own first two characters and blanks the last two", () => {
    const idiom = idiomsById["yan-er-you-xin"]; // 言而有信
    const { hanzi } = buildHintMaskedIdiom(idiom);
    expect(hanzi).toBe("言而○○");
  });

  it("never reveals the idiom's own last two characters anywhere in the output", () => {
    for (const idiom of Object.values(idiomsById)) {
      const chars = Array.from(idiom.hanzi);
      const lastTwo = chars.slice(2, 4).join("");
      const { hanzi } = buildHintMaskedIdiom(idiom);
      expect(hanzi.endsWith("○○"), idiom.id).toBe(true);
      expect(hanzi, idiom.id).not.toContain(lastTwo);
    }
  });

  it("carries real pinyin for the first two characters and blanks it for the masked run", () => {
    const idiom = idiomsById["yan-er-you-xin"];
    const { charPinyin } = buildHintMaskedIdiom(idiom);
    const syllables = idiom.pinyin.split(" ");
    expect(charPinyin).toEqual([syllables[0], syllables[1], "", ""]);
  });

  it("charPinyin has exactly one entry per hanzi character (ruby-annotation alignment)", () => {
    for (const idiom of Object.values(idiomsById)) {
      const { hanzi, charPinyin } = buildHintMaskedIdiom(idiom);
      expect(charPinyin.length, idiom.id).toBe(Array.from(hanzi).length);
    }
  });
});
