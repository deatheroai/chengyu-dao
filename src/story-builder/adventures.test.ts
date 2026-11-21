import { describe, expect, it } from "vitest";
import { ADVENTURES } from "./adventures";
import { sensesUsed } from "./expansion";
import { SENSES } from "./senses";

describe("adventures", () => {
  it("have unique ids and at least three beats each", () => {
    expect(new Set(ADVENTURES.map((a) => a.id)).size).toBe(ADVENTURES.length);
    for (const a of ADVENTURES) expect(a.beats.length).toBeGreaterThanOrEqual(3);
  });

  it("every beat has a prompt, starters and scene words", () => {
    for (const a of ADVENTURES) {
      for (const b of a.beats) {
        expect(b.partner && b.prompt, a.id).toBeTruthy();
        expect(b.starters.length, b.partner).toBeGreaterThan(0);
        expect(Object.values(b.words).flat().length, b.partner).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("each richer example really uses a sense the plain one doesn't", () => {
    for (const a of ADVENTURES) {
      for (const b of a.beats) {
        expect(sensesUsed(b.example.plain, b).length, b.example.plain).toBe(0);
        expect(sensesUsed(b.example.rich, b).length, b.example.rich).toBeGreaterThan(0);
      }
    }
  });

  it("every 📗 新词 is really in 团团's line, with a meaning", () => {
    for (const a of ADVENTURES) {
      for (const b of a.beats) {
        const all = [{ partner: b.partner, word: b.word }, ...(b.choices ?? [])];
        for (const c of all) {
          if (!c.word) continue;
          expect(c.partner, c.word.word).toContain(c.word.word);
          expect(c.word.meaning.length, c.word.word).toBeGreaterThan(3);
        }
      }
    }
  });

  it("are set in everyday Singapore life, each opening with a word to learn", () => {
    const sgWords = ["组屋", "巴刹", "小息", "小贩中心", "食堂", "课室", "脚车", "游乐场"];
    for (const a of ADVENTURES) {
      const text = [a.blurb, a.ending, ...a.beats.map((b) => b.partner)].join("");
      expect(sgWords.some((w) => text.includes(w)), a.title).toBe(true);
      expect(a.beats[0].word, a.title).toBeTruthy();
    }
  });

  it("explain the place and every question, for a child who doesn't understand", () => {
    for (const a of ADVENTURES) {
      expect(a.about.length, a.title).toBeGreaterThan(20);
      for (const b of a.beats) {
        for (const c of [b, ...(b.choices ?? [])]) {
          expect(c.explain.length, c.prompt).toBeGreaterThan(8);
          expect(c.explain, c.prompt).not.toBe(c.prompt);
          expect(c.starters.length, c.prompt).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every sense has a question and general words", () => {
    for (const s of SENSES) {
      expect(s.question).toBeTruthy();
      expect(s.words.length).toBeGreaterThanOrEqual(3);
      expect(s.mission).toBeTruthy();
    }
  });
});
