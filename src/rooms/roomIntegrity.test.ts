import { describe, it, expect } from "vitest";
import { castleRooms } from "./castle";
import { puzzles } from "../puzzles/dialPuzzles";

/**
 * Guard-rail tests for room content data. These aren't castle-specific by
 * design: as more rooms and environments (e.g. the shipwreck) are added,
 * this file should keep validating them without changes, catching data
 * mistakes (typos in flag names, out-of-bounds hotspots, dangling puzzle
 * references) that TypeScript's structural typing won't.
 */
describe("castle room data integrity", () => {
  const rooms = Object.values(castleRooms);

  it("every room's id matches its registry key", () => {
    for (const [key, room] of Object.entries(castleRooms)) {
      expect(room.id).toBe(key);
    }
  });

  it("every hotspot stays within normalized [0,1] scene bounds", () => {
    for (const room of rooms) {
      for (const hotspot of room.hotspots) {
        expect(hotspot.x, `${room.id}/${hotspot.id} x`).toBeGreaterThanOrEqual(0);
        expect(hotspot.y, `${room.id}/${hotspot.id} y`).toBeGreaterThanOrEqual(0);
        expect(hotspot.x + hotspot.width, `${room.id}/${hotspot.id} right edge`).toBeLessThanOrEqual(1);
        expect(hotspot.y + hotspot.height, `${room.id}/${hotspot.id} bottom edge`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("every hotspot id is unique within its room", () => {
    for (const room of rooms) {
      const ids = room.hotspots.map((h) => h.id);
      expect(new Set(ids).size, `duplicate hotspot id in ${room.id}`).toBe(ids.length);
    }
  });

  it("every puzzle-type hotspot references a puzzle that exists", () => {
    for (const room of rooms) {
      for (const hotspot of room.hotspots) {
        if (hotspot.interaction.type === "puzzle") {
          expect(
            puzzles[hotspot.interaction.puzzleId],
            `${room.id}/${hotspot.id} references unknown puzzle "${hotspot.interaction.puzzleId}"`,
          ).toBeDefined();
        }
      }
    }
  });

  it("every travel target references a room that exists", () => {
    for (const room of rooms) {
      for (const hotspot of room.hotspots) {
        const interaction = hotspot.interaction;
        if (interaction.type === "travel") {
          expect(
            castleRooms[interaction.toRoom],
            `${room.id}/${hotspot.id} travels to unknown room "${interaction.toRoom}"`,
          ).toBeDefined();
        }
        if (interaction.type === "unlock" && interaction.travelTo) {
          expect(
            castleRooms[interaction.travelTo],
            `${room.id}/${hotspot.id} travels to unknown room "${interaction.travelTo}"`,
          ).toBeDefined();
        }
      }
    }
  });

  it("every requiresFlag is set by something in the same room", () => {
    for (const room of rooms) {
      const settableFlags = new Set<string>();
      for (const hotspot of room.hotspots) {
        const interaction = hotspot.interaction;
        if (interaction.type === "examine" && interaction.setsFlag) {
          settableFlags.add(interaction.setsFlag);
        }
        if (interaction.type === "unlock") {
          settableFlags.add(interaction.setsFlag);
        }
        if (interaction.type === "puzzle") {
          const puzzle = puzzles[interaction.puzzleId];
          if (puzzle) settableFlags.add(puzzle.reward.setsFlag);
        }
      }

      for (const hotspot of room.hotspots) {
        if (hotspot.requiresFlag) {
          expect(
            settableFlags.has(hotspot.requiresFlag),
            `${room.id}/${hotspot.id} requires flag "${hotspot.requiresFlag}" that nothing in the room sets`,
          ).toBe(true);
        }
      }
    }
  });
});
