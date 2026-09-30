import { describe, it, expect } from "vitest";
import {
  buildKey,
  placeApples,
  createRoomSnake,
  roomStep,
  roomChangeDirection,
  resolveHead,
  isJoiningPhrase,
  JOINING_SYMBOL,
  QUESTION_DOOR_CELLS,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  type RoomApple,
} from "./answerRoom";
import { answerRoomContent } from "./answerRoomContent";
import { scienceQuestionsById } from "./scienceQuestions";
import { createRng } from "./seededRandom";

const ice = answerRoomContent["aishas-melting-ice"];

describe("answer room content", () => {
  it("every entry's phrases join back into its question's modelAnswer, and its parts into its prompt", () => {
    for (const [id, content] of Object.entries(answerRoomContent)) {
      const question = scienceQuestionsById[id];
      expect(question, id).toBeDefined();
      expect(content.phrases.join(" ")).toBe(question.modelAnswer);
      expect(content.questionParts.join(" ")).toBe(question.prompt);
      expect(content.phrases).not.toContain(content.wrongPhrase);
    }
  });
});

describe("buildKey", () => {
  it("has one entry per phrase plus the wrong one, each symbol used once", () => {
    const key = buildKey(ice, createRng(1));
    expect(key).toHaveLength(ice.phrases.length + 1);
    expect(key.filter((e) => e.phraseIndex === null)).toHaveLength(1);
    expect(new Set(key.map((e) => e.symbol.glyph)).size).toBe(key.length);
  });

  it("joining words, and only joining words, get the orange joining symbol", () => {
    const key = buildKey(ice, createRng(7));
    for (const entry of key) {
      expect(entry.symbol === JOINING_SYMBOL).toBe(isJoiningPhrase(entry.text));
    }
    expect(isJoiningPhrase("because")).toBe(true);
    expect(isJoiningPhrase("it warmed up")).toBe(false);
  });

  it("mixes the order up for at least some seeds", () => {
    const inOrder = [1, 2, 3, 4, 5].every((seed) =>
      buildKey(ice, createRng(seed))
        .filter((e) => e.phraseIndex !== null)
        .every((e, i) => e.phraseIndex === i),
    );
    expect(inOrder).toBe(false);
  });
});

describe("placeApples", () => {
  it("places the unplaced phrases plus the wrong one, away from the door and never touching", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed);
      const key = buildKey(ice, rng);
      const snake = createRoomSnake();
      const apples = placeApples(key, 2, snake, rng);
      expect(apples.map((a) => a.phraseIndex).sort()).toEqual([2, 3, 4, 5, null].sort());
      for (const a of apples) {
        const nearDoor = QUESTION_DOOR_CELLS.some((c) => Math.abs(c.x - a.position.x) <= 1 && Math.abs(c.y - a.position.y) <= 1);
        expect(nearDoor).toBe(false);
        expect(snake.body.some((s) => s.x === a.position.x && s.y === a.position.y)).toBe(false);
        for (const b of apples) {
          if (a === b) continue;
          const touching = Math.abs(a.position.x - b.position.x) <= 1 && Math.abs(a.position.y - b.position.y) <= 1;
          expect(touching).toBe(false);
        }
      }
    }
  });

  it("keeps the cells straight ahead of the snake clear", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed);
      const snake = createRoomSnake();
      const head = snake.body[0];
      const apples = placeApples(buildKey(ice, rng), 0, snake, rng);
      for (let dx = 1; dx <= 3; dx++) {
        expect(apples.some((a) => a.position.x === head.x + dx && a.position.y === head.y)).toBe(false);
      }
    }
  });
});

describe("room movement", () => {
  it("keeps a fixed length and wraps at the room's own edges", () => {
    let snake = createRoomSnake();
    for (let i = 0; i < ROOM_WIDTH; i++) snake = roomStep(snake);
    expect(snake.body).toHaveLength(3);
    expect(snake.body[0]).toEqual(createRoomSnake().body[0]);

    snake = roomChangeDirection(snake, "down");
    snake = roomStep(snake);
    snake = roomStep(snake);
    expect(snake.body[0].y).toBe((createRoomSnake().body[0].y + 2) % ROOM_HEIGHT);
  });

  it("ignores a reversal into its own neck", () => {
    const snake = roomChangeDirection(createRoomSnake(), "left");
    expect(snake.direction).toBe("right");
  });
});

describe("resolveHead", () => {
  const apples: RoomApple[] = [
    { phraseIndex: 0, position: { x: 2, y: 3 } },
    { phraseIndex: 1, position: { x: 5, y: 5 } },
    { phraseIndex: null, position: { x: 7, y: 5 } },
  ];

  it("places the next phrase in order", () => {
    const { event, apples: left } = resolveHead({ x: 2, y: 3 }, apples, 0, 2);
    expect(event).toEqual({ kind: "placed", phraseIndex: 0, placedCount: 1 });
    expect(left).toHaveLength(2);
  });

  it("completes on the last phrase", () => {
    const { event } = resolveHead({ x: 5, y: 5 }, apples, 1, 2);
    expect(event).toEqual({ kind: "complete", placedCount: 2 });
  });

  it("throws the snake out for an out-of-order phrase, keeping placed progress", () => {
    const { event } = resolveHead({ x: 5, y: 5 }, apples, 0, 2);
    expect(event).toEqual({ kind: "thrown-out", reason: "out-of-order", placedCount: 0 });
  });

  it("throws the snake out for the wrong science phrase", () => {
    const { event } = resolveHead({ x: 7, y: 5 }, apples, 1, 2);
    expect(event).toEqual({ kind: "thrown-out", reason: "wrong-phrase", placedCount: 1 });
  });

  it("the QUESTION door is the 2×2 bottom-right corner", () => {
    expect(QUESTION_DOOR_CELLS).toHaveLength(4);
    for (const cell of QUESTION_DOOR_CELLS) {
      expect(cell.x).toBeGreaterThanOrEqual(ROOM_WIDTH - 2);
      expect(cell.y).toBeGreaterThanOrEqual(ROOM_HEIGHT - 2);
    }
    for (const cell of QUESTION_DOOR_CELLS) {
      expect(resolveHead(cell, apples, 0, 2).event).toEqual({ kind: "question-door" });
    }
    expect(resolveHead({ x: 0, y: 0 }, apples, 0, 2).event).toEqual({ kind: "none" });
  });
});
