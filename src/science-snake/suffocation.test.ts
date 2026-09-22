import { describe, it, expect } from "vitest";
import { isSuffocating, SUFFOCATION_THRESHOLD_RATIO } from "./suffocation";
import { TOTAL_CELLS, type Position } from "./snakeGrid";
import type { BoardItem } from "./itemSpawner";

function scienceItems(count: number): BoardItem[] {
  const items: BoardItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({ position: { x: i % 10, y: Math.floor(i / 10) } as Position, type: "science", questionId: `q${i}` });
  }
  return items;
}

describe("isSuffocating", () => {
  it("is false with no items on the board", () => {
    expect(isSuffocating([])).toBe(false);
  });

  it("is false with only apples, however many", () => {
    const apples: BoardItem[] = Array.from({ length: 50 }, (_, i) => ({
      position: { x: i, y: 0 },
      type: "apple" as const,
    }));
    expect(isSuffocating(apples)).toBe(false);
  });

  it("is false just below the threshold ratio of unresolved science items", () => {
    const belowThreshold = Math.ceil(TOTAL_CELLS * SUFFOCATION_THRESHOLD_RATIO) - 1;
    expect(isSuffocating(scienceItems(belowThreshold))).toBe(false);
  });

  it("is true at or above the threshold ratio of unresolved science items", () => {
    const atThreshold = Math.ceil(TOTAL_CELLS * SUFFOCATION_THRESHOLD_RATIO);
    expect(isSuffocating(scienceItems(atThreshold))).toBe(true);
  });

  it("only counts science items, not apples mixed onto a crowded board", () => {
    const mixed = [...scienceItems(10), ...Array.from({ length: 300 }, (_, i) => ({ position: { x: i, y: 0 }, type: "apple" as const }))];
    expect(isSuffocating(mixed)).toBe(false);
  });
});
