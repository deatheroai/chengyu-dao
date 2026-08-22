import { describe, it, expect } from "vitest";
import {
  doorLevels,
  HEIGHT_MIN,
  HEIGHT_MAX,
  ANGLE_MAX_DEG,
  MIN_REPEATS_PER_CHARACTER,
  MAX_REPEATS_PER_CHARACTER,
  MIN_SLOT_GAP,
} from "./levelContent";
import { attemptGrab, initialOrderedCatchState } from "./orderedCatchProgress";

describe("doorLevels data integrity", () => {
  it("has at least one level", () => {
    expect(doorLevels.length).toBeGreaterThan(0);
  });

  for (const level of doorLevels) {
    describe(level.idiom.id, () => {
      it("has a randomized MIN_REPEATS_PER_CHARACTER..MAX_REPEATS_PER_CHARACTER count of correct tiles for every character index, each with the right glyph", () => {
        const chars = Array.from(level.idiom.hanzi);
        for (let i = 0; i < chars.length; i++) {
          const matching = level.tiles.filter((t) => t.correctIndex === i);
          expect(matching.length).toBeGreaterThanOrEqual(MIN_REPEATS_PER_CHARACTER);
          expect(matching.length).toBeLessThanOrEqual(MAX_REPEATS_PER_CHARACTER);
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

      it("uses a good variety of distinct decoy characters, not just the same couple repeated", () => {
        const decoyChars = new Set(level.tiles.filter((t) => t.correctIndex === undefined).map((t) => t.char));
        expect(decoyChars.size).toBeGreaterThanOrEqual(8);
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

      it("every tile's height is within the jump-reachable range", () => {
        for (const tile of level.tiles) {
          expect(tile.height).toBeGreaterThanOrEqual(HEIGHT_MIN);
          expect(tile.height).toBeLessThanOrEqual(HEIGHT_MAX);
        }
      });

      it("every tile's angle is within the modest, legible-glyph range", () => {
        for (const tile of level.tiles) {
          expect(Math.abs(tile.angle)).toBeLessThanOrEqual(ANGLE_MAX_DEG);
        }
      });

      // 2026-08-24 feedback: decoys were visually overlapping. The
      // layout algorithm now guarantees a minimum gap between *every*
      // pair of adjacent tiles by construction (an evenly-spaced slot
      // grid, jittered by less than half a slot each way) rather than
      // by hopeful rejection-sampling — this confirms that guarantee
      // actually holds against the real generated content.
      it("never places two tiles closer together than MIN_SLOT_GAP (no visual overlap)", () => {
        const sorted = [...level.tiles].sort((a, b) => a.x - b.x);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].x - sorted[i - 1].x).toBeGreaterThanOrEqual(MIN_SLOT_GAP);
        }
      });

      it("the door (at level.length) comes after every tile", () => {
        const maxTileX = Math.max(...level.tiles.map((t) => t.x));
        expect(level.length).toBeGreaterThan(maxTileX);
      });

      // The jumbled, sort-key-shuffled layout means correct tiles are
      // *not* in strict x order (that was the old, "boring"
      // neat-sequential-blocks layout's invariant, and it no longer
      // holds by design). What actually matters is that the level is
      // still solvable: simulating a player who always catches the
      // earliest reachable copy of whatever character they need next
      // (ignoring everything else, exactly like a real catch that
      // doesn't match `nextIndex` does) must be able to complete it.
      // This exercises the same `attemptGrab` transition the real game
      // uses, against the real generated content, rather than testing a
      // proxy invariant.
      it("is solvable: a greedy playthrough (always catching the earliest reachable correct-next tile) completes it", () => {
        const chars = Array.from(level.idiom.hanzi);
        const sortedByX = [...level.tiles].sort((a, b) => a.x - b.x);
        let state = initialOrderedCatchState();
        for (const tile of sortedByX) {
          if (state.isComplete) break;
          if (tile.correctIndex !== state.nextIndex) continue;
          state = attemptGrab(state, tile.correctIndex, chars.length).state;
        }
        expect(state.isComplete).toBe(true);
      });
    });
  }
});
