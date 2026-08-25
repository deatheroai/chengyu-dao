import { describe, it, expect } from "vitest";
import { puzzles } from "./dialPuzzles";

describe("dial puzzle data integrity", () => {
  const configs = Object.values(puzzles);

  it("every puzzle's id matches its registry key", () => {
    for (const [key, puzzle] of Object.entries(puzzles)) {
      expect(puzzle.id).toBe(key);
    }
  });

  it("every answer symbol is one of the puzzle's own symbol choices", () => {
    for (const puzzle of configs) {
      for (const symbol of puzzle.answer) {
        expect(puzzle.symbols, `${puzzle.id} answer references unlisted symbol "${symbol}"`).toContain(symbol);
      }
    }
  });

  it("has at least one ring to solve", () => {
    for (const puzzle of configs) {
      expect(puzzle.answer.length).toBeGreaterThan(0);
    }
  });

  it("offers at least two distinct symbol choices (otherwise it isn't a puzzle)", () => {
    for (const puzzle of configs) {
      expect(puzzle.symbols.length).toBeGreaterThanOrEqual(2);
    }
  });
});
