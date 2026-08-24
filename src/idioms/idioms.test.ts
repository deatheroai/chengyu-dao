import { describe, it, expect } from "vitest";
import { idioms, idiomsById } from "./idioms";

const VALID_THEMES = new Set(["focus", "honesty", "kindness", "wisdom"]);
const VALID_AGE_BANDS = new Set(["lower-primary", "upper-primary"]);
const REQUIRED_TEXT_FIELDS = ["hanzi", "pinyin", "literalMeaning", "meaning", "dailyLifeScenario", "sourceNotes"] as const;

describe("idiom content integrity", () => {
  it("has the expected Snippet 1 count", () => {
    expect(idioms).toHaveLength(15);
  });

  it("every idiom's id matches its registry key", () => {
    for (const [key, idiom] of Object.entries(idiomsById)) {
      expect(idiom.id).toBe(key);
    }
  });

  it("every idiom id is unique", () => {
    const ids = idioms.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every required text field is non-empty", () => {
    for (const idiom of idioms) {
      for (const field of REQUIRED_TEXT_FIELDS) {
        expect(idiom[field].trim().length, `${idiom.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("every example sentence has hanzi, pinyin, and english, all non-empty", () => {
    for (const idiom of idioms) {
      expect(idiom.exampleSentence.hanzi.trim().length, `${idiom.id} example.hanzi`).toBeGreaterThan(0);
      expect(idiom.exampleSentence.pinyin.trim().length, `${idiom.id} example.pinyin`).toBeGreaterThan(0);
      expect(idiom.exampleSentence.english.trim().length, `${idiom.id} example.english`).toBeGreaterThan(0);
    }
  });

  it("every example sentence actually uses the idiom's own hanzi", () => {
    for (const idiom of idioms) {
      expect(
        idiom.exampleSentence.hanzi.includes(idiom.hanzi),
        `${idiom.id}'s example sentence doesn't contain "${idiom.hanzi}"`,
      ).toBe(true);
    }
  });

  it("every idiom has a valid theme", () => {
    for (const idiom of idioms) {
      expect(VALID_THEMES.has(idiom.theme), `${idiom.id} has unknown theme "${idiom.theme}"`).toBe(true);
    }
  });

  it("every idiom has a valid age band", () => {
    for (const idiom of idioms) {
      expect(VALID_AGE_BANDS.has(idiom.ageBand), `${idiom.id} has unknown ageBand "${idiom.ageBand}"`).toBe(true);
    }
  });

  it("every idiom's hanzi is 4 characters (standard chengyu length)", () => {
    for (const idiom of idioms) {
      expect(Array.from(idiom.hanzi).length, `${idiom.id}.hanzi`).toBe(4);
    }
  });

  it("every example sentence is distinct across idioms (matters now that it also drives the Snippet 3 app-check options)", () => {
    const sentences = idioms.map((i) => i.exampleSentence.hanzi);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  // 2026-08-28: charPinyin (per-character pinyin, for ruby-annotation
  // display — see types.ts's comment) has to line up 1:1 with
  // Array.from(hanzi), or the wrong syllable ends up over the wrong
  // character. Hand-derived, so this is the guard against a miscount
  // slipping through, not just a nice-to-have.
  it("meaningZh.charPinyin has exactly one entry per meaningZh.hanzi character", () => {
    for (const idiom of idioms) {
      const chars = Array.from(idiom.meaningZh.hanzi);
      expect(idiom.meaningZh.charPinyin.length, `${idiom.id}.meaningZh`).toBe(chars.length);
    }
  });

  it("exampleSentence.charPinyin has exactly one entry per exampleSentence.hanzi character", () => {
    for (const idiom of idioms) {
      const chars = Array.from(idiom.exampleSentence.hanzi);
      expect(idiom.exampleSentence.charPinyin.length, `${idiom.id}.exampleSentence`).toBe(chars.length);
    }
  });

  it("charPinyin marks punctuation characters (and only punctuation) with an empty string", () => {
    const PUNCTUATION = new Set(["，", "。", "！", "？"]);
    for (const idiom of idioms) {
      for (const field of ["meaningZh", "exampleSentence"] as const) {
        const chars = Array.from(idiom[field].hanzi);
        const charPinyin = idiom[field].charPinyin;
        chars.forEach((char, i) => {
          if (PUNCTUATION.has(char)) {
            expect(charPinyin[i], `${idiom.id}.${field}[${i}] ("${char}")`).toBe("");
          } else {
            expect(charPinyin[i], `${idiom.id}.${field}[${i}] ("${char}")`).not.toBe("");
          }
        });
      }
    }
  });
});
