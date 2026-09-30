import { describe, it, expect } from "vitest";
import {
  buildSteps,
  spawnStep,
  createRoomSnake,
  roomStep,
  roomChangeDirection,
  resolveHead,
  wrapDistance,
  isJoiningPhrase,
  QUESTION_DOOR_CELLS,
  LADDER_CELLS,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  SPAWN_MIN_DISTANCE,
  SPAWN_MAX_DISTANCE,
  paceFor,
  WORD_TICK_MS,
  CHOICE_TICK_MS,
  type RoomApple,
} from "./answerRoom";
import { answerRoomContent } from "./answerRoomContent";
import { scienceQuestions, scienceQuestionsById } from "./scienceQuestions";
import { gradeAnswer } from "./answerGrading";
import { createRng } from "./seededRandom";

const ice = answerRoomContent["aishas-melting-ice"];

describe("answer room content", () => {
  it("covers every science question", () => {
    expect(Object.keys(answerRoomContent).sort()).toEqual(scienceQuestions.map((q) => q.id).sort());
  });

  for (const [id, content] of Object.entries(answerRoomContent)) {
    describe(id, () => {
      const question = scienceQuestionsById[id];

      it("splits the existing prompt into three parts, word for word", () => {
        expect(content.questionParts.join(" ")).toBe(question.prompt);
      });

      it("is 4 pieces plus 1 wrong alternative to one of them", () => {
        expect(content.phrases).toHaveLength(4);
        expect(content.phrases).not.toContain(content.wrongPhrase);
      });

      it("builds a sentence that still grades correct against the question's own keywords", () => {
        expect(gradeAnswer(content.phrases.join(" "), question)).toBe("correct");
      });

      it("has a wrong piece shaped like the piece it replaces (same capital, same end punctuation)", () => {
        expect(content.wrongReplaces).toBeGreaterThanOrEqual(0);
        expect(content.wrongReplaces).toBeLessThan(content.phrases.length);
        const replaced = content.phrases[content.wrongReplaces];
        expect(isJoiningPhrase(replaced)).toBe(false);
        const startsUpper = (t: string): boolean => t[0] === t[0].toUpperCase();
        const endPunct = (t: string): string => (/[.,!?]$/.exec(t) ?? [""])[0];
        expect(startsUpper(content.wrongPhrase)).toBe(startsUpper(replaced));
        expect(endPunct(content.wrongPhrase)).toBe(endPunct(replaced));
      });
    });
  }
});

describe("buildSteps", () => {
  it("is every word in order, with the science choice as one step where it falls", () => {
    expect(buildSteps(ice)).toEqual([
      { kind: "word", text: "The" },
      { kind: "word", text: "ice" },
      { kind: "word", text: "melted" },
      { kind: "word", text: "because" },
      { kind: "choice", correct: "it warmed up", wrong: "it cooled down" },
      { kind: "word", text: "to" },
      { kind: "word", text: "room" },
      { kind: "word", text: "temperature." },
    ]);
  });

  it("has exactly one choice for every question", () => {
    for (const content of Object.values(answerRoomContent)) {
      expect(buildSteps(content).filter((s) => s.kind === "choice")).toHaveLength(1);
    }
  });
});

describe("spawnStep", () => {
  const wordStep = { kind: "word", text: "ice" } as const;
  const choiceStep = { kind: "choice", correct: "it warmed up", wrong: "it cooled down" } as const;

  it("puts one word a short, steerable distance from the head — never on the snake, the door or the ladder corner", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const snake = createRoomSnake();
      const [apple, ...rest] = spawnStep(wordStep, snake, createRng(seed));
      expect(rest).toHaveLength(0);
      expect(apple).toMatchObject({ kind: "word", text: "ice" });
      const distance = wrapDistance(snake.body[0], apple.position);
      expect(distance).toBeGreaterThanOrEqual(SPAWN_MIN_DISTANCE);
      expect(distance).toBeLessThanOrEqual(SPAWN_MAX_DISTANCE);
      expect(snake.body.some((s) => s.x === apple.position.x && s.y === apple.position.y)).toBe(false);
      for (const cell of [...QUESTION_DOOR_CELLS, ...LADDER_CELLS]) {
        expect(Math.abs(cell.x - apple.position.x) <= 1 && Math.abs(cell.y - apple.position.y) <= 1).toBe(false);
      }
    }
  });

  it("puts two blue apples, A and B, one right and one wrong, not touching — and A isn't always the right one", () => {
    const rightLabels = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const apples = spawnStep(choiceStep, createRoomSnake(), createRng(seed));
      expect(apples.map((a) => (a.kind === "option" ? a.label : ""))).toEqual(["A", "B"]);
      const texts = apples.map((a) => (a.kind === "option" ? a.text : "")).sort();
      expect(texts).toEqual(["it cooled down", "it warmed up"]);
      const right = apples.filter((a) => a.kind === "option" && a.correct);
      expect(right).toHaveLength(1);
      if (right[0].kind === "option") {
        expect(right[0].text).toBe("it warmed up");
        rightLabels.add(right[0].label);
      }
      const [a, b] = apples;
      expect(Math.abs(a.position.x - b.position.x) <= 1 && Math.abs(a.position.y - b.position.y) <= 1).toBe(false);
    }
    expect(rightLabels).toEqual(new Set(["A", "B"]));
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
  const word: RoomApple[] = [{ kind: "word", text: "ice", position: { x: 3, y: 3 } }];
  const choice: RoomApple[] = [
    { kind: "option", label: "A", text: "it cooled down", correct: false, position: { x: 2, y: 2 } },
    { kind: "option", label: "B", text: "it warmed up", correct: true, position: { x: 5, y: 5 } },
  ];

  it("eats a word", () => {
    expect(resolveHead({ x: 3, y: 3 }, word, false)).toEqual({ kind: "ate-word", text: "ice" });
    expect(resolveHead({ x: 4, y: 3 }, word, false)).toEqual({ kind: "none" });
  });

  it("tells the right blue apple from the wrong one", () => {
    expect(resolveHead({ x: 5, y: 5 }, choice, false)).toEqual({ kind: "chose-right", text: "it warmed up" });
    expect(resolveHead({ x: 2, y: 2 }, choice, false)).toEqual({ kind: "chose-wrong", text: "it cooled down" });
  });

  it("the QUESTION door is the 2×2 bottom-right corner, until the sentence is finished", () => {
    expect(QUESTION_DOOR_CELLS).toHaveLength(4);
    for (const cell of QUESTION_DOOR_CELLS) {
      expect(cell.x).toBeGreaterThanOrEqual(ROOM_WIDTH - 2);
      expect(cell.y).toBeGreaterThanOrEqual(ROOM_HEIGHT - 2);
      expect(resolveHead(cell, word, false)).toEqual({ kind: "question-door" });
      expect(resolveHead(cell, [], true)).toEqual({ kind: "none" });
    }
  });

  it("the ladder in the top-left corner is the way out, only once the sentence is finished", () => {
    for (const cell of LADDER_CELLS) {
      expect(cell.x).toBe(0);
      expect(resolveHead(cell, [], true)).toEqual({ kind: "exited" });
      expect(resolveHead(cell, word, false)).toEqual({ kind: "none" });
    }
  });
});

describe("paceFor", () => {
  it("words move on their own at 80% of the room's first speed; the A/B choice only moves while held, at half speed", () => {
    expect(paceFor({ kind: "word", text: "ice" })).toEqual({ holdToMove: false, tickMs: WORD_TICK_MS });
    expect(paceFor({ kind: "choice", correct: "a", wrong: "b" })).toEqual({ holdToMove: true, tickMs: CHOICE_TICK_MS });
    // After the last word — the climb to the ladder.
    expect(paceFor(undefined)).toEqual({ holdToMove: false, tickMs: WORD_TICK_MS });
    expect(WORD_TICK_MS).toBe(375);
    expect(CHOICE_TICK_MS).toBe(600);
  });
});
