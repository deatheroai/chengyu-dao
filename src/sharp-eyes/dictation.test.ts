import { describe, expect, it } from "vitest";
import { afterDictation, dictationList, promptFor } from "./dictation";
import { NOTES } from "./notes";
import { parseNote } from "./round";

describe("默写 prompts", () => {
  it("show the fixed character's sentence with a blank, pinyin and a word", () => {
    const p = promptFor({ noteId: "p3-beach", mistake: 0 })!;
    expect(p.char).toBe("晴");
    expect(p.before + "（）" + p.after).toBe("亲爱的妈妈：今天是（）天，我和爸爸去东海岸公园。");
    expect(p.pinyin).toBe("qíng");
    expect(p.word).toBe("晴天");
  });

  it("cut a long sentence down to the part around the blank", () => {
    const p = promptFor({ noteId: "p5-garden", mistake: 0 })!;
    expect(p.char).toBe("拔");
    expect(p.before + "（）" + p.after).toBe("今天我在花园里帮爷爷（）草");
  });

  it("work for every mistake in every note, with the blank in a short sentence", () => {
    for (const n of NOTES) {
      parseNote(n).mistakes.forEach((m, i) => {
        const p = promptFor({ noteId: n.id, mistake: i })!;
        expect(p.char, n.id).toBe(m.right);
        expect(p.pinyin, `${n.id} ${i}`).not.toBe("");
        expect(Array.from(p.before + p.after).length, `${n.id} ${i}`).toBeLessThanOrEqual(40);
        expect(p.before + p.after, `${n.id} ${i}`).not.toBe("");
        expect(p.before + p.after, `${n.id} ${i} gives the answer away`).not.toContain(m.right);
      });
    }
  });

  it("never show the answer elsewhere in the sentence", () => {
    const p = promptFor({ noteId: "p3-q-crawl", mistake: 0 })!;
    expect(p.char).toBe("爬");
    expect(p.before + "（）" + p.after).toBe("小弟弟在地上（）来＿去");
  });

  it("ignore unknown notes", () => {
    expect(promptFor({ noteId: "nope", mistake: 0 })).toBeNull();
    expect(promptFor({ noteId: "p3-play", mistake: 5 })).toBeNull();
  });
});

describe("默写 list", () => {
  const beach0 = { noteId: "p3-beach", mistake: 0 }; // 晴
  const cat = { noteId: "p3-q-cat", mistake: 0 }; // 睛
  const weekend0 = { noteId: "p3-e-weekend", mistake: 0 }; // 晴 again
  const lift1 = { noteId: "p3-lift", mistake: 1 }; // 场

  it("puts last time's misses first, one per character, capped", () => {
    expect(dictationList([cat, weekend0, lift1], [beach0])).toEqual([beach0, cat, lift1]);
    expect(dictationList([cat, lift1, beach0], [], 2)).toEqual([cat, lift1]);
  });

  it("keeps missed characters for next time and drops ones written right", () => {
    let p = afterDictation({ stamps: {} }, [
      { item: beach0, ok: false },
      { item: lift1, ok: true },
    ]);
    expect(p.review).toEqual([beach0]);
    p = afterDictation(p, [{ item: weekend0, ok: true }]); // 晴 written right
    expect(p.review).toBeUndefined();
  });
});
