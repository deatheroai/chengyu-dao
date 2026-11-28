import { describe, expect, it } from "vitest";
import { COMMON_SLIPS } from "../story-builder/corrections";
import { FAMILIES, LEVELS, familyOf } from "./families";
import { NOTES, notesFor, starterNote } from "./notes";
import { correctText, parseNote, writtenText } from "./round";

const len = (s: string) => Array.from(s).length;

describe("火眼金睛 families", () => {
  it("have unique ids, at least two characters each, and no character in two families", () => {
    expect(new Set(FAMILIES.map((f) => f.id)).size).toBe(FAMILIES.length);
    const all = FAMILIES.flatMap((f) => f.chars.map((c) => c.char));
    expect(new Set(all).size).toBe(all.length);
    for (const f of FAMILIES) expect(f.chars.length, f.id).toBeGreaterThanOrEqual(2);
  });

  it("give every character a meaning, a word that uses it, and stroke data to write it", async () => {
    for (const f of FAMILIES) {
      expect(f.clue, f.id).not.toBe("");
      for (const c of f.chars) {
        expect(len(c.char), c.char).toBe(1);
        expect(c.meaning, c.char).not.toBe("");
        expect(c.word, c.char).toContain(c.char);
        const data = (await import(`../../node_modules/hanzi-writer-data/${c.char}.json`)) as { default: { strokes: string[] } };
        expect(data.default.strokes.length, `stroke data for ${c.char}`).toBeGreaterThan(0);
      }
    }
  });

  it("are spread over P3, P4 and P5, and every one is used in a note", () => {
    for (const level of LEVELS) expect(FAMILIES.filter((f) => f.level === level).length, `P${level}`).toBeGreaterThanOrEqual(5);
    const used = new Set(NOTES.flatMap((n) => parseNote(n).mistakes.map((m) => m.family.id)));
    for (const f of FAMILIES) expect(used.has(f.id), f.id).toBe(true);
  });
});

describe("火眼金睛 notes", () => {
  it("have unique ids and all parse: one character swapped for one of its family, one oops each", () => {
    expect(new Set(NOTES.map((n) => n.id)).size).toBe(NOTES.length);
    for (const n of NOTES) {
      const p = parseNote(n);
      expect(p.mistakes.length, n.id).toBeGreaterThan(0);
      for (const m of p.mistakes) {
        expect(familyOf(m.wrong, m.right), `${n.id} ${m.wrong}→${m.right}`).toBe(m.family);
        expect(m.oops, n.id).toContain(m.wrong);
      }
    }
  });

  it("only use families taught at the note's level or below", () => {
    for (const n of NOTES) {
      for (const m of parseNote(n).mistakes) expect(m.family.level, `${n.id} ${m.right}`).toBeLessThanOrEqual(n.level);
    }
  });

  it("fit their kind: one-mistake quick sentences, 1–4 in a note, 3–6 in a longer essay", () => {
    for (const n of NOTES) {
      const p = parseNote(n);
      const count = p.mistakes.length;
      const size = len(writtenText(p));
      if (n.kind === "quick") {
        expect(count, n.id).toBe(1);
        expect(size, n.id).toBeLessThanOrEqual(20);
      } else if (n.kind === "find") {
        expect(count, n.id).toBeGreaterThanOrEqual(1);
        expect(count, n.id).toBeLessThanOrEqual(4);
      } else {
        expect(count, n.id).toBeGreaterThanOrEqual(3);
        expect(count, n.id).toBeLessThanOrEqual(6);
        expect(size, n.id).toBeGreaterThanOrEqual(70);
      }
    }
  });

  it("have enough of each kind at every level", () => {
    for (const level of LEVELS) {
      expect(notesFor(level, "find").filter((n) => !n.starter).length, `P${level} find`).toBeGreaterThanOrEqual(3);
      expect(notesFor(level, "quick").length, `P${level} quick`).toBeGreaterThanOrEqual(6);
      expect(notesFor(level, "essay").length, `P${level} essay`).toBeGreaterThanOrEqual(2);
    }
  });

  it("start with one easy P3 note with a single mistake", () => {
    expect(NOTES.filter((n) => n.starter)).toHaveLength(1);
    const s = starterNote();
    expect(s.level).toBe(3);
    expect(s.kind).toBe("find");
    expect(parseNote(s).mistakes).toHaveLength(1);
    expect(len(writtenText(parseNote(s)))).toBeLessThanOrEqual(25);
  });

  it("read correctly once fixed: no common slip left in", () => {
    for (const n of NOTES) {
      const fixed = correctText(parseNote(n));
      for (const slip of COMMON_SLIPS) expect(fixed, n.id).not.toContain(slip.wrong);
    }
  });
});
