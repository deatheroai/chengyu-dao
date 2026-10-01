import { describe, it, expect } from "vitest";
import {
  placeQuestionApples,
  placeAnswerDoor,
  isNextPart,
  boardDistance,
  isOnCells,
  QUESTION_TICK_MS,
  MIN_DISTANCE_FROM_HEAD,
  ANSWER_DOOR_WORD,
} from "./questionFlow";
import { GRID_WIDTH, TICK_MS, createInitialSnake } from "./snakeGrid";
import { createRng } from "./seededRandom";

const snake = createInitialSnake({ x: 8, y: 12 }, "right", 3);
const head = snake.body[0];

describe("question pace", () => {
  it("is slower than the normal board while a question is open", () => {
    expect(QUESTION_TICK_MS).toBeGreaterThan(TICK_MS);
  });
});

describe("placeQuestionApples", () => {
  it("places ①②③ on free cells, away from the head and never touching", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const occupied = [...snake.body, { x: 0, y: 0 }];
      const apples = placeQuestionApples(occupied, head, createRng(seed));
      expect(apples.map((a) => a.part)).toEqual([1, 2, 3]);
      for (const a of apples) {
        expect(isOnCells(occupied, a.position)).toBe(false);
        expect(boardDistance(a.position, head)).toBeGreaterThanOrEqual(MIN_DISTANCE_FROM_HEAD);
        for (const b of apples) {
          if (a !== b) expect(Math.abs(a.position.x - b.position.x) <= 1 && Math.abs(a.position.y - b.position.y) <= 1).toBe(false);
        }
      }
    }
  });
});

describe("isNextPart", () => {
  it("only accepts the next number", () => {
    expect(isNextPart(0, 1)).toBe(true);
    expect(isNextPart(0, 2)).toBe(false);
    expect(isNextPart(1, 2)).toBe(true);
    expect(isNextPart(2, 2)).toBe(false);
  });
});

describe("placeAnswerDoor", () => {
  it("is six free cells in one row, away from the head and off its row, with room above and below", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const occupied = [...snake.body, { x: 3, y: 5 }];
      const door = placeAnswerDoor(occupied, head, createRng(seed))!;
      expect(door).toHaveLength(ANSWER_DOOR_WORD.length);
      const y = door[0].y;
      expect(y).not.toBe(head.y);
      door.forEach((cell, i) => {
        expect(cell).toEqual({ x: door[0].x + i, y });
        expect(isOnCells(occupied, cell)).toBe(false);
        expect(boardDistance(cell, head)).toBeGreaterThanOrEqual(MIN_DISTANCE_FROM_HEAD);
      });
      expect(door[door.length - 1].x).toBeLessThan(GRID_WIDTH);
      expect(y).toBeGreaterThanOrEqual(2);
    }
  });

  it("gives up (null) on a board with no room for it", () => {
    const everything = [];
    for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x += 3) everything.push({ x, y });
    expect(placeAnswerDoor(everything, head, createRng(1))).toBeNull();
  });
});
