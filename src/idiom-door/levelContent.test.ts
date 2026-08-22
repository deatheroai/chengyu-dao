import { describe, it, expect } from "vitest";
import { doorLevels, PLATFORM_XFRAC_RANGES } from "./levelContent";

describe("doorLevels data integrity", () => {
  it("has at least one level", () => {
    expect(doorLevels.length).toBeGreaterThan(0);
  });

  for (const level of doorLevels) {
    describe(level.idiom.id, () => {
      it("has exactly one correct tile per character, indices 0..N-1", () => {
        const correctIndices = level.tiles.filter((t) => t.correctIndex !== undefined).map((t) => t.correctIndex);
        const expected = Array.from(level.idiom.hanzi).map((_, i) => i);
        expect(correctIndices.slice().sort((a, b) => a! - b!)).toEqual(expected);
      });

      it("every correct tile's glyph matches the idiom's hanzi at that index", () => {
        const chars = Array.from(level.idiom.hanzi);
        for (const tile of level.tiles) {
          if (tile.correctIndex !== undefined) {
            expect(tile.char).toBe(chars[tile.correctIndex]);
          }
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

      it("every tile has a valid xFrac in (0, 1)", () => {
        for (const tile of level.tiles) {
          expect(tile.xFrac).toBeGreaterThan(0);
          expect(tile.xFrac).toBeLessThan(1);
        }
      });

      // A tile tagged "platformA"/"platformB" but placed at an xFrac
      // outside that platform's actual footprint is unreachable no
      // matter how the character jumps — found exactly this way in
      // shu-neng-sheng-qiao's level (熟 and 巧 both placed off their
      // tagged platform). This is a real playability bug, not just data
      // hygiene, so it's asserted generically rather than trusted to
      // manual review.
      it("every platform tile sits within its platform's actual footprint", () => {
        for (const tile of level.tiles) {
          if (tile.surface === "ground") continue;
          const range = PLATFORM_XFRAC_RANGES[tile.surface];
          expect(tile.xFrac).toBeGreaterThanOrEqual(range.min);
          expect(tile.xFrac).toBeLessThanOrEqual(range.max);
        }
      });
    });
  }
});
