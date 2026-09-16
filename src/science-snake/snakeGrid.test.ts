import { describe, it, expect } from "vitest";
import {
  createInitialSnake,
  nextHeadPosition,
  isOutOfBounds,
  changeDirection,
  applyAppleEaten,
  applyCorrectAnswerEaten,
  applyPoisonAppleEaten,
  step,
  hasWon,
  GRID_WIDTH,
  GRID_HEIGHT,
  TOTAL_CELLS,
  WIN_LENGTH,
  APPLE_GROWTH,
  CORRECT_ANSWER_GROWTH,
  POISON_GROWTH_MULTIPLIER,
  type SnakeState,
  type Position,
} from "./snakeGrid";

describe("createInitialSnake", () => {
  it("builds a straight body trailing backwards from the head along the direction", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    expect(snake.body).toEqual([
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    expect(snake.direction).toBe("right");
    expect(snake.owedGrowth).toBe(0);
    expect(snake.isPoisoned).toBe(false);
  });
});

describe("nextHeadPosition", () => {
  it("moves one cell per direction", () => {
    expect(nextHeadPosition({ x: 5, y: 5 }, "up")).toEqual({ x: 5, y: 4 });
    expect(nextHeadPosition({ x: 5, y: 5 }, "down")).toEqual({ x: 5, y: 6 });
    expect(nextHeadPosition({ x: 5, y: 5 }, "left")).toEqual({ x: 4, y: 5 });
    expect(nextHeadPosition({ x: 5, y: 5 }, "right")).toEqual({ x: 6, y: 5 });
  });
});

describe("isOutOfBounds", () => {
  it("is false for every corner and false just inside each edge", () => {
    expect(isOutOfBounds({ x: 0, y: 0 })).toBe(false);
    expect(isOutOfBounds({ x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 })).toBe(false);
  });

  it("is true past every edge", () => {
    expect(isOutOfBounds({ x: -1, y: 0 })).toBe(true);
    expect(isOutOfBounds({ x: 0, y: -1 })).toBe(true);
    expect(isOutOfBounds({ x: GRID_WIDTH, y: 0 })).toBe(true);
    expect(isOutOfBounds({ x: 0, y: GRID_HEIGHT })).toBe(true);
  });
});

describe("changeDirection", () => {
  it("accepts a perpendicular direction", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    expect(changeDirection(snake, "up").direction).toBe("up");
  });

  it("ignores a direct reversal", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    expect(changeDirection(snake, "left").direction).toBe("right");
  });

  it("accepts continuing in the same direction", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    expect(changeDirection(snake, "right").direction).toBe("right");
  });
});

describe("step", () => {
  it("moves forward and pops the tail when there's no owed growth", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    const result = step(snake);
    expect(result.outcome).toBe("moved");
    if (result.outcome === "moved") {
      expect(result.snake.body).toEqual([
        { x: 6, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ]);
      expect(result.snake.owedGrowth).toBe(0);
    }
  });

  it("doesn't pop the tail and decrements owedGrowth by 1 when growth is owed", () => {
    const snake: SnakeState = { ...createInitialSnake({ x: 5, y: 5 }, "right", 3), owedGrowth: 2 };
    const result = step(snake);
    expect(result.outcome).toBe("moved");
    if (result.outcome === "moved") {
      expect(result.snake.body).toEqual([
        { x: 6, y: 5 },
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ]);
      expect(result.snake.owedGrowth).toBe(1);
    }
  });

  it("is a wall-collision when the head would move out of bounds", () => {
    const snake = createInitialSnake({ x: GRID_WIDTH - 1, y: 5 }, "right", 3);
    expect(step(snake)).toEqual({ outcome: "wall-collision" });
  });

  // A closed 6-cell loop — head (5,5), tail (6,5) — used by the three
  // tests below to exercise both a genuine mid-body collision and the
  // tail-vacates-this-tick nuance, from the same known shape.
  const loopBody: Position[] = [
    { x: 5, y: 5 }, // head
    { x: 4, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 6, y: 5 }, // tail
  ];

  it("is a self-collision when the head would move into its own body (not the tail)", () => {
    const snake: SnakeState = { body: loopBody, direction: "down", owedGrowth: 0, isPoisoned: false };
    expect(step(snake)).toEqual({ outcome: "self-collision" });
  });

  it("moving onto the current tail cell is NOT a collision when not growing (the tail vacates that cell this same move)", () => {
    const snake: SnakeState = { body: loopBody, direction: "right", owedGrowth: 0, isPoisoned: false };
    expect(step(snake).outcome).toBe("moved");
  });

  it("moving onto the current tail cell IS a collision when growth is owed (the tail doesn't move this tick)", () => {
    const snake: SnakeState = { body: loopBody, direction: "right", owedGrowth: 1, isPoisoned: false };
    expect(step(snake)).toEqual({ outcome: "self-collision" });
  });
});

describe("applyAppleEaten", () => {
  it("adds APPLE_GROWTH when not poisoned", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    expect(applyAppleEaten(snake).owedGrowth).toBe(APPLE_GROWTH);
  });

  it("multiplies growth by POISON_GROWTH_MULTIPLIER once poisoned", () => {
    const snake: SnakeState = { ...createInitialSnake({ x: 5, y: 5 }, "right", 3), isPoisoned: true };
    expect(applyAppleEaten(snake).owedGrowth).toBe(APPLE_GROWTH * POISON_GROWTH_MULTIPLIER);
  });
});

describe("applyCorrectAnswerEaten", () => {
  it("always adds CORRECT_ANSWER_GROWTH, poisoned or not", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 3);
    expect(applyCorrectAnswerEaten(snake).owedGrowth).toBe(CORRECT_ANSWER_GROWTH);

    const poisoned: SnakeState = { ...snake, isPoisoned: true };
    expect(applyCorrectAnswerEaten(poisoned).owedGrowth).toBe(CORRECT_ANSWER_GROWTH);
  });
});

describe("applyPoisonAppleEaten", () => {
  it("sets owed growth to the snake's current length and flips isPoisoned on", () => {
    const snake = createInitialSnake({ x: 5, y: 5 }, "right", 10);
    const poisoned = applyPoisonAppleEaten(snake);
    expect(poisoned.owedGrowth).toBe(10);
    expect(poisoned.isPoisoned).toBe(true);
  });

  it("stays poisoned and doesn't stack the multiplier on a second poison apple", () => {
    const snake: SnakeState = { ...createInitialSnake({ x: 5, y: 5 }, "right", 10), isPoisoned: true, owedGrowth: 0 };
    const again = applyPoisonAppleEaten(snake);
    expect(again.owedGrowth).toBe(10);
    expect(again.isPoisoned).toBe(true);
  });

  it("clamps owed growth so total length can never exceed the grid's total cells", () => {
    const nearlyFull = createInitialSnake({ x: 5, y: 5 }, "right", TOTAL_CELLS - 5);
    const poisoned = applyPoisonAppleEaten(nearlyFull);
    expect(poisoned.body.length + poisoned.owedGrowth).toBeLessThanOrEqual(TOTAL_CELLS);
  });
});

describe("hasWon", () => {
  it("is false below WIN_LENGTH and true at or above it", () => {
    const short: SnakeState = { ...createInitialSnake({ x: 5, y: 5 }, "right", 3), body: new Array(WIN_LENGTH - 1).fill({ x: 0, y: 0 }) };
    const long: SnakeState = { ...short, body: new Array(WIN_LENGTH).fill({ x: 0, y: 0 }) };
    expect(hasWon(short)).toBe(false);
    expect(hasWon(long)).toBe(true);
  });
});
