import { describe, it, expect } from "vitest";
import { createRng } from "./seededRandom";
import {
  freeCells,
  pickRandomFreeCell,
  pickNextItemType,
  pickNextQuestionId,
  spawnApple,
  spawnScienceItem,
  spawnIndigestionItems,
  POISON_APPLE_CHANCE,
  SCIENCE_TO_APPLE_RATIO,
} from "./itemSpawner";
import { GRID_WIDTH, GRID_HEIGHT, TOTAL_CELLS, type Position } from "./snakeGrid";

describe("freeCells", () => {
  it("returns every cell when nothing is occupied", () => {
    expect(freeCells([])).toHaveLength(TOTAL_CELLS);
  });

  it("excludes occupied cells", () => {
    const occupied: Position[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    const free = freeCells(occupied);
    expect(free).toHaveLength(TOTAL_CELLS - 2);
    expect(free.some((p) => p.x === 0 && p.y === 0)).toBe(false);
    expect(free.some((p) => p.x === 1 && p.y === 0)).toBe(false);
  });
});

describe("pickRandomFreeCell", () => {
  it("always returns a cell that isn't occupied", () => {
    const rng = createRng(1);
    const occupied: Position[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    for (let i = 0; i < 50; i++) {
      const cell = pickRandomFreeCell(occupied, rng);
      expect(cell).not.toBeNull();
      expect(occupied.some((p) => p.x === cell!.x && p.y === cell!.y)).toBe(false);
    }
  });

  it("returns null when the board is completely full", () => {
    const everyCell: Position[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) everyCell.push({ x, y });
    }
    expect(pickRandomFreeCell(everyCell, createRng(1))).toBeNull();
  });

  it("is deterministic for a given seed", () => {
    const a = pickRandomFreeCell([], createRng(42));
    const b = pickRandomFreeCell([], createRng(42));
    expect(a).toEqual(b);
  });
});

describe("pickNextItemType", () => {
  it("spawns an apple first when the board has none yet", () => {
    expect(pickNextItemType(0, 0)).toBe("apple");
  });

  it("spawns a science item when the current ratio is below target", () => {
    expect(pickNextItemType(4, 0)).toBe("science");
  });

  it("spawns an apple once the ratio is already at or above target", () => {
    expect(pickNextItemType(4, 2)).toBe("apple");
  });

  it("the target ratio is roughly 1 science item per 3-4 apples", () => {
    expect(SCIENCE_TO_APPLE_RATIO).toBeGreaterThan(1 / 5);
    expect(SCIENCE_TO_APPLE_RATIO).toBeLessThan(1 / 2);
  });
});

describe("pickNextQuestionId", () => {
  it("prefers a question id not already active on the board", () => {
    const rng = createRng(1);
    for (let i = 0; i < 20; i++) {
      const picked = pickNextQuestionId(["a", "b", "c"], ["a", "b"], rng);
      expect(picked).toBe("c");
    }
  });

  it("falls back to allowing a repeat once every available id is already active", () => {
    const picked = pickNextQuestionId(["a", "b"], ["a", "b"], createRng(1));
    expect(["a", "b"]).toContain(picked);
  });

  it("returns null when there are no question ids at all", () => {
    expect(pickNextQuestionId([], [], createRng(1))).toBeNull();
  });
});

describe("spawnApple", () => {
  it("places an apple or poison-apple at a free cell", () => {
    const rng = createRng(5);
    const item = spawnApple([], rng);
    expect(item).not.toBeNull();
    expect(["apple", "poison-apple"]).toContain(item!.type);
  });

  it("rolls poison at roughly the configured rate over many spawns", () => {
    const rng = createRng(7);
    let poisonCount = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const item = spawnApple([], rng);
      if (item?.type === "poison-apple") poisonCount++;
    }
    const observedRate = poisonCount / trials;
    expect(observedRate).toBeGreaterThan(POISON_APPLE_CHANCE - 0.05);
    expect(observedRate).toBeLessThan(POISON_APPLE_CHANCE + 0.05);
  });

  it("returns null when the board is full", () => {
    const everyCell: Position[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) everyCell.push({ x, y });
    }
    expect(spawnApple(everyCell, createRng(1))).toBeNull();
  });
});

describe("spawnScienceItem", () => {
  it("places a science item carrying the given questionId", () => {
    const item = spawnScienceItem([], "q1", createRng(3));
    expect(item).toEqual({ position: item!.position, type: "science", questionId: "q1" });
  });
});

describe("spawnIndigestionItems", () => {
  it("spawns the requested number of science items, each at a distinct free cell", () => {
    const items = spawnIndigestionItems([], ["q1", "q2", "q3"], createRng(9));
    expect(items).toHaveLength(3);
    expect(items.every((item) => item.type === "science")).toBe(true);
    const positions = items.map((item) => `${item.position.x},${item.position.y}`);
    expect(new Set(positions).size).toBe(3);
  });

  it("stops early rather than throwing when the board can't fit them all", () => {
    const almostFull: Position[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (almostFull.length < TOTAL_CELLS - 1) almostFull.push({ x, y });
      }
    }
    const items = spawnIndigestionItems(almostFull, ["q1", "q2", "q3"], createRng(9));
    expect(items).toHaveLength(1);
  });
});
