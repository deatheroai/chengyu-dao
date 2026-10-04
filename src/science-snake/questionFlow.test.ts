import { describe, it, expect } from "vitest";
import {
  splitIntoPhrases,
  placePhraseApple,
  placeAnswerDoor,
  goldenAppleCells,
  boardDistance,
  isOnCells,
  QUESTION_TICK_MS,
  MIN_DISTANCE_FROM_HEAD,
  PHRASE_SPAWN_MIN_DISTANCE,
  PHRASE_SPAWN_MAX_DISTANCE,
  ANSWER_DOOR_WORD,
} from "./questionFlow";
import { GRID_WIDTH, TICK_MS, createInitialSnake } from "./snakeGrid";
import { scienceQuestions } from "./scienceQuestions";
import { createRng } from "./seededRandom";

const snake = createInitialSnake({ x: 8, y: 12 }, "right", 3);
const head = snake.body[0];
const words = (phrase: string): number => phrase.split(/\s+/).length;

describe("question pace", () => {
  it("is slower than the normal board while a question is open", () => {
    expect(QUESTION_TICK_MS).toBeGreaterThan(TICK_MS);
  });
});

describe("splitIntoPhrases", () => {
  it("cuts the melting-ice question into readable phrases", () => {
    const ice = scienceQuestions.find((q) => q.id === "aishas-melting-ice")!;
    expect(splitIntoPhrases(ice.prompt)).toEqual([
      "Aisha takes an ice cube",
      "out of the freezer",
      "and leaves it on the kitchen table.",
      "After 20 minutes, she comes back",
      "and finds a small puddle",
      "of water instead.",
      "Explain what happened to the ice and why.",
    ]);
  });

  for (const question of scienceQuestions) {
    it(`${question.id}: the phrases join back into the question exactly, at most 8 words, never across a full stop`, () => {
      const phrases = splitIntoPhrases(question.prompt);
      expect(phrases.join(" ")).toBe(question.prompt);
      for (const phrase of phrases) {
        expect(words(phrase)).toBeLessThanOrEqual(8);
        expect(phrase.slice(0, -1)).not.toMatch(/[.!?]\s/);
      }
    });
  }

  it("is mostly 4-6 word phrases across the whole bank", () => {
    const all = scienceQuestions.flatMap((q) => splitIntoPhrases(q.prompt));
    const inRange = all.filter((p) => words(p) >= 4 && words(p) <= 6).length;
    expect(inRange / all.length).toBeGreaterThan(0.6);
  });
});

describe("placePhraseApple", () => {
  it("puts the next phrase on a free cell a few steps from the head", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const occupied = [...snake.body, { x: 10, y: 12 }];
      const cell = placePhraseApple(occupied, head, createRng(seed))!;
      expect(isOnCells(occupied, cell)).toBe(false);
      expect(boardDistance(cell, head)).toBeGreaterThanOrEqual(PHRASE_SPAWN_MIN_DISTANCE);
      expect(boardDistance(cell, head)).toBeLessThanOrEqual(PHRASE_SPAWN_MAX_DISTANCE);
    }
  });
});

describe("goldenAppleCells", () => {
  it("are two rows above and below the door's middle letter, on free cells", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const occupied = [...snake.body, { x: 3, y: 5 }];
      const door = placeAnswerDoor(occupied, head, createRng(seed))!;
      const [above, below] = goldenAppleCells(door);
      expect(above).toEqual({ x: door[3].x, y: door[0].y - 2 });
      expect(below).toEqual({ x: door[3].x, y: door[0].y + 2 });
      for (const cell of [above, below]) {
        expect(isOnCells(occupied, cell)).toBe(false);
        expect(cell.y).toBeGreaterThanOrEqual(0);
      }
    }
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
