import { describe, it, expect } from "vitest";
import { idioms, idiomsById } from "./idioms";

const VALID_THEMES = new Set(["focus", "honesty", "kindness", "wisdom"]);
const VALID_AGE_BANDS = new Set(["lower-primary", "upper-primary"]);
const REQUIRED_TEXT_FIELDS = ["hanzi", "pinyin", "literalMeaning", "meaning", "dailyLifeScenario", "sourceNotes"] as const;
const SCENARIO_SHORT_MAX_LENGTH = 40;

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

  it("every scenarioShort has non-empty hanzi and pinyin", () => {
    for (const idiom of idioms) {
      expect(idiom.scenarioShort.hanzi.trim().length, `${idiom.id}.scenarioShort.hanzi`).toBeGreaterThan(0);
      expect(idiom.scenarioShort.pinyin.trim().length, `${idiom.id}.scenarioShort.pinyin`).toBeGreaterThan(0);
    }
  });

  it("every scenarioShort.hanzi is actually short (quick to compare in a multiple-choice list)", () => {
    for (const idiom of idioms) {
      expect(Array.from(idiom.scenarioShort.hanzi).length, `${idiom.id}.scenarioShort.hanzi`).toBeLessThanOrEqual(
        SCENARIO_SHORT_MAX_LENGTH,
      );
    }
  });

  it("every scenarioShort.hanzi is distinct across idioms (no accidental duplicates)", () => {
    const shorts = idioms.map((i) => i.scenarioShort.hanzi);
    expect(new Set(shorts).size).toBe(shorts.length);
  });

  it("scenarioShort.hanzi never contains the idiom's own hanzi (otherwise the app-check becomes a literal text match instead of a comprehension check)", () => {
    for (const idiom of idioms) {
      expect(
        idiom.scenarioShort.hanzi.includes(idiom.hanzi),
        `${idiom.id}'s scenarioShort gives away the answer by containing "${idiom.hanzi}"`,
      ).toBe(false);
    }
  });
});
