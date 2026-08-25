import { describe, it, expect } from "vitest";
import { buildApplicationCheck, spliceIdiomInto } from "./applicationCheck";
import { idioms, idiomsById } from "../idioms/idioms";

// Deterministic rng: cycles through a fixed sequence instead of Math.random.
function fixedRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("spliceIdiomInto", () => {
  const source = idiomsById["zhi-cuo-jiu-gai"]; // "...弄坏了妹妹的玩具，知错就改，主动向她道歉。"
  const replacement = idiomsById["zhu-ren-wei-le"];

  it("replaces the source idiom's hanzi with the replacement's, keeping the rest of the sentence", () => {
    const result = spliceIdiomInto(source, replacement);
    expect(result.hanzi).not.toContain(source.hanzi);
    expect(result.hanzi).toContain(replacement.hanzi);
    // Surrounding sentence structure is untouched.
    expect(result.hanzi).toContain("主动向她道歉");
  });

  it("replaces the embedded pinyin in step with the hanzi swap", () => {
    const result = spliceIdiomInto(source, replacement);
    expect(result.pinyin).not.toContain("zhīcuò-jiùgǎi");
    expect(result.pinyin).toContain("zhùrén-wéilè");
  });

  it("throws if the substitution has no effect (data bug guard)", () => {
    // A source spliced with itself is a no-op and should be caught, not
    // silently returned as if nothing were wrong.
    expect(() => spliceIdiomInto(source, source)).toThrow();
  });

  // 2026-08-28: charPinyin is spliced independently of the flat
  // hanzi/pinyin strings above (array-based, via each idiom's own
  // per-character data, not the hyphenated EMBEDDED_PINYIN map) — so
  // it needs its own coverage that the two splices actually agree.
  it("charPinyin has exactly one entry per resulting hanzi character", () => {
    const result = spliceIdiomInto(source, replacement);
    expect(result.charPinyin.length).toBe(Array.from(result.hanzi).length);
  });

  it("charPinyin's spliced-in span matches the replacement idiom's own per-character pinyin", () => {
    const result = spliceIdiomInto(source, replacement);
    const chars = Array.from(result.hanzi);
    const spliceAt = chars.join("").indexOf(replacement.hanzi);
    const splicedSpan = result.charPinyin.slice(spliceAt, spliceAt + Array.from(replacement.hanzi).length);
    expect(splicedSpan).toEqual(replacement.pinyin.split(" "));
  });

  it("works for every idiom pair in the real content set (charPinyin splice never throws)", () => {
    for (const s of idioms) {
      for (const r of idioms) {
        if (s.id === r.id) continue;
        expect(() => spliceIdiomInto(s, r), `${s.id} -> ${r.id}`).not.toThrow();
      }
    }
  });
});

describe("buildApplicationCheck", () => {
  const target = idiomsById["zhu-ren-wei-le"];

  it("returns exactly one correct option plus the requested number of distractors", () => {
    const options = buildApplicationCheck(target, idioms, 2, fixedRng([0, 0.5, 0.99]));
    expect(options).toHaveLength(3);
    expect(options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(options.find((o) => o.isCorrect)?.fromIdiomId).toBe(target.id);
  });

  it("every option's hanzi contains the target idiom's own characters (no giving away the answer via different characters)", () => {
    const options = buildApplicationCheck(target, idioms, 2, fixedRng([0, 0.5, 0.99]));
    for (const option of options) {
      expect(option.hanzi, `option from ${option.fromIdiomId}`).toContain(target.hanzi);
    }
  });

  it("the correct option is the target's own genuine example sentence, unmodified", () => {
    const options = buildApplicationCheck(target, idioms, 2, fixedRng([0, 0.5, 0.99]));
    const correct = options.find((o) => o.isCorrect)!;
    expect(correct.hanzi).toBe(target.exampleSentence.hanzi);
    expect(correct.pinyin).toBe(target.exampleSentence.pinyin);
  });

  it("distractor options are spliced (not the source idiom's own genuine sentence)", () => {
    const options = buildApplicationCheck(target, idioms, 2, fixedRng([0, 0.5, 0.99]));
    for (const option of options.filter((o) => !o.isCorrect)) {
      const sourceIdiom = idiomsById[option.fromIdiomId];
      expect(option.hanzi).not.toBe(sourceIdiom.exampleSentence.hanzi);
      expect(option.hanzi).not.toContain(sourceIdiom.hanzi);
    }
  });

  it("never includes the target idiom's own id as a distractor source (no duplicate idiom ids)", () => {
    const options = buildApplicationCheck(target, idioms, 2, fixedRng([0, 0.5, 0.99]));
    const ids = options.map((o) => o.fromIdiomId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefers distractor sources from a different theme than the target when enough exist", () => {
    const options = buildApplicationCheck(target, idioms, 2, fixedRng([0, 0.5, 0.99]));
    const distractors = options.filter((o) => !o.isCorrect);
    for (const d of distractors) {
      expect(idiomsById[d.fromIdiomId].theme, `distractor source ${d.fromIdiomId}`).not.toBe(target.theme);
    }
  });

  it("works for every idiom in the real content set as the target (no missing EMBEDDED_PINYIN entries)", () => {
    for (const t of idioms) {
      expect(() => buildApplicationCheck(t, idioms, 2, fixedRng([0.1, 0.4, 0.7, 0.9]))).not.toThrow();
    }
  });
});
