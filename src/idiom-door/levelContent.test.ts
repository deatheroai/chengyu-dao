import { describe, it, expect } from "vitest";
import { doorLevels } from "./levelContent";

describe("doorLevels data integrity", () => {
  it("has at least one level", () => {
    expect(doorLevels.length).toBeGreaterThan(0);
  });

  for (const level of doorLevels) {
    describe(level.idiom.id, () => {
      it("has REPEATS_PER_CHARACTER correct tiles for every character index, each with the right glyph", () => {
        const chars = Array.from(level.idiom.hanzi);
        for (let i = 0; i < chars.length; i++) {
          const matching = level.tiles.filter((t) => t.correctIndex === i);
          expect(matching.length).toBeGreaterThan(1); // real redundancy, not just one shot
          for (const tile of matching) expect(tile.char).toBe(chars[i]);
        }
      });

      it("no decoy glyph collides with one of this idiom's own characters", () => {
        const ownChars = new Set(Array.from(level.idiom.hanzi));
        for (const tile of level.tiles) {
          if (tile.correctIndex === undefined) {
            expect(ownChars.has(tile.char)).toBe(false);
          }
        }
      });

      it("has no duplicate tile ids", () => {
        const ids = level.tiles.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("every tile sits within the track (0, length)", () => {
        for (const tile of level.tiles) {
          expect(tile.x).toBeGreaterThan(0);
          expect(tile.x).toBeLessThan(level.length);
        }
      });

      it("correct tiles appear in non-decreasing character-index order along the track — the auto-runner never needs to backtrack for one it's already passed", () => {
        const correctTiles = level.tiles.filter((t) => t.correctIndex !== undefined).sort((a, b) => a.x - b.x);
        let lastIndex = -1;
        for (const tile of correctTiles) {
          expect(tile.correctIndex!).toBeGreaterThanOrEqual(lastIndex);
          lastIndex = tile.correctIndex!;
        }
      });

      it("the door (at level.length) comes after every tile", () => {
        const maxTileX = Math.max(...level.tiles.map((t) => t.x));
        expect(level.length).toBeGreaterThan(maxTileX);
      });
    });
  }
});
