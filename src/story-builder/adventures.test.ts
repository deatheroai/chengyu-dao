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

  it("every sense has a question and general words", () => {
    for (const s of SENSES) {
      expect(s.question).toBeTruthy();
      expect(s.words.length).toBeGreaterThanOrEqual(5);
    }
  });
});
