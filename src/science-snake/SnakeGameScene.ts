import Phaser from "phaser";
import {
  createInitialSnake,
  step,
  changeDirection,
  applyAppleEaten,
  applyCorrectAnswerEaten,
  applyPoisonAppleEaten,
  hasWon,
  GRID_WIDTH,
  GRID_HEIGHT,
  TICK_MS,
  type SnakeState,
  type Direction,
  type Position,
} from "./snakeGrid";
import {
  spawnApple,
  spawnScienceItem,
  spawnIndigestionItems,
  pickNextItemType,
  pickNextQuestionId,
  INDIGESTION_SPAWN_COUNT,
  type BoardItem,
} from "./itemSpawner";
import { isSuffocating } from "./suffocation";
import { createRng } from "./seededRandom";
import { scienceQuestionsById, scienceQuestions } from "./scienceQuestions";
import { askQuestion } from "./QuestionOverlay";

/**
 * The playable Phaser scene (BACKLOG.md's "Phaser scene + DOM question
 * overlay" entry) — thin wiring only, same "pure-function-plus-thin-
 * Scene" split every mechanic in this project keeps. Everything that's
 * actually a *rule* (movement, growth, collisions, spawning, the
 * suffocation threshold) lives in snakeGrid.ts/itemSpawner.ts/
 * suffocation.ts, already independently tested — this file just calls
 * those on a tick loop and draws whatever comes back with Phaser
 * Graphics/Text, no external art assets, same as the rest of this
 * project's scenes.
 */

export const CELL_SIZE = 28;

export type LoseReason = "wall-collision" | "self-collision" | "suffocation";

export interface RunStats {
  applesEaten: number;
  poisonApplesEaten: number;
  questionsCorrect: number;
}

export interface SnakeGameSceneData {
  onWin: (stats: RunStats) => void;
  onLose: (reason: LoseReason, stats: RunStats) => void;
}

const SNAKE_COLOR = 0x3c8a4c;
const SNAKE_HEAD_COLOR = 0x2c6b39;
/** Once poisoned (BACKLOG.md's poison-apple entry), the snake cycles through these instead of its normal color, plus a small per-segment wobble — the "gooey rainbow" tell that persists for the rest of the run. */
const POISONED_COLORS = [0xff5252, 0xffb52e, 0xfff152, 0x52ff6e, 0x52c7ff, 0xb26eff];
const GRID_LINE_COLOR = 0xdfe7d0;
const BG_COLOR = 0xf5faf0;
const INITIAL_APPLE_COUNT = 4;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

export class SnakeGameScene extends Phaser.Scene {
  private snake!: SnakeState;
  private items: BoardItem[] = [];
  private stats: RunStats = { applesEaten: 0, poisonApplesEaten: 0, questionsCorrect: 0 };
  private rng: () => number = createRng(1);
  private tickEvent?: Phaser.Time.TimerEvent;
  private paused = false;
  private ended = false;
  private gfx!: Phaser.GameObjects.Graphics;
  private itemTexts = new Map<string, Phaser.GameObjects.Text>();
  private onWin!: (stats: RunStats) => void;
  private onLose!: (reason: LoseReason, stats: RunStats) => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor() {
    super("SnakeGameScene");
  }

  init(data: SnakeGameSceneData): void {
    this.onWin = data.onWin;
    this.onLose = data.onLose;
  }

  create(): void {
    this.rng = createRng(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
    this.cameras.main.setBackgroundColor(BG_COLOR);
    this.gfx = this.add.graphics();
    this.itemTexts = new Map();
    this.snake = createInitialSnake({ x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }, "right", 3);
    this.stats = { applesEaten: 0, poisonApplesEaten: 0, questionsCorrect: 0 };
    this.items = [];
    this.paused = false;
    this.ended = false;

    for (let i = 0; i < INITIAL_APPLE_COUNT; i++) this.spawnReplacementApple();
    this.spawnReplacementScienceItemIfNeeded();
    this.wireInput();
    this.render();

    this.tickEvent = this.time.addEvent({ delay: TICK_MS, loop: true, callback: () => this.tick() });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private wireInput(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[e.key];
      if (direction) this.snake = changeDirection(this.snake, direction);
    };
    this.input.keyboard?.on("keydown", this.keydownHandler);
  }

  private teardown(): void {
    this.tickEvent?.remove();
    if (this.keydownHandler) this.input.keyboard?.off("keydown", this.keydownHandler);
  }

  private occupiedCells(): Position[] {
    return [...this.snake.body, ...this.items.map((item) => item.position)];
  }

  private activeQuestionIds(): string[] {
    const ids: string[] = [];
    for (const item of this.items) {
      if (item.type === "science" && item.questionId) ids.push(item.questionId);
    }
    return ids;
  }

  private spawnReplacementApple(): void {
    const item = spawnApple(this.occupiedCells(), this.rng);
    if (item) this.items.push(item);
  }

  private spawnReplacementScienceItemIfNeeded(): void {
    const applesOnBoard = this.items.filter((item) => item.type === "apple" || item.type === "poison-apple").length;
    const scienceItemsOnBoard = this.items.filter((item) => item.type === "science").length;
    if (pickNextItemType(applesOnBoard, scienceItemsOnBoard) !== "science") return;
    const questionId = pickNextQuestionId(scienceQuestions.map((q) => q.id), this.activeQuestionIds(), this.rng);
    if (!questionId) return;
    const item = spawnScienceItem(this.occupiedCells(), questionId, this.rng);
    if (item) this.items.push(item);
  }

  private spawnIndigestionPileOn(): void {
    const allIds = scienceQuestions.map((q) => q.id);
    const reserved: string[] = [];
    for (let i = 0; i < INDIGESTION_SPAWN_COUNT; i++) {
      const id = pickNextQuestionId(allIds, [...this.activeQuestionIds(), ...reserved], this.rng);
      if (id) reserved.push(id);
    }
    const spawned = spawnIndigestionItems(this.occupiedCells(), reserved, this.rng);
    this.items.push(...spawned);
  }

  private tick(): void {
    if (this.paused || this.ended) return;
    const result = step(this.snake);
    if (result.outcome !== "moved") {
      this.finish(() => this.onLose(result.outcome, this.stats));
      return;
    }
    this.snake = result.snake;
    this.handleHeadPosition();
    this.render();
  }

  private handleHeadPosition(): void {
    const head = this.snake.body[0];
    const index = this.items.findIndex((item) => item.position.x === head.x && item.position.y === head.y);
    if (index === -1) return;
    const item = this.items[index];
    this.items.splice(index, 1);

    if (item.type === "apple") {
      this.snake = applyAppleEaten(this.snake);
      this.stats.applesEaten += 1;
      this.spawnReplacementApple();
      this.spawnReplacementScienceItemIfNeeded();
    } else if (item.type === "poison-apple") {
      this.snake = applyPoisonAppleEaten(this.snake);
      this.stats.poisonApplesEaten += 1;
      this.spawnReplacementApple();
      this.spawnReplacementScienceItemIfNeeded();
    } else {
      this.askScienceQuestion(item.questionId!);
      return; // paused inside askScienceQuestion; checkOutcome runs once it resolves
    }

    this.checkOutcome();
  }

  private askScienceQuestion(questionId: string): void {
    const question = scienceQuestionsById[questionId];
    this.paused = true;
    askQuestion(question, (outcome) => {
      this.paused = false;
      if (outcome === "correct") {
        this.snake = applyCorrectAnswerEaten(this.snake);
        this.stats.questionsCorrect += 1;
        this.spawnReplacementScienceItemIfNeeded();
      } else {
        this.spawnIndigestionPileOn();
      }
      this.render();
      this.checkOutcome();
    });
  }

  private checkOutcome(): void {
    if (hasWon(this.snake)) {
      this.finish(() => this.onWin(this.stats));
      return;
    }
    if (isSuffocating(this.items)) {
      this.finish(() => this.onLose("suffocation", this.stats));
    }
  }

  private finish(callback: () => void): void {
    this.ended = true;
    this.tickEvent?.remove();
    callback();
  }

  private render(): void {
    this.gfx.clear();
    this.gfx.lineStyle(1, GRID_LINE_COLOR, 1);
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.gfx.lineBetween(x * CELL_SIZE, 0, x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.gfx.lineBetween(0, y * CELL_SIZE, GRID_WIDTH * CELL_SIZE, y * CELL_SIZE);
    }

    this.snake.body.forEach((segment, i) => {
      let color = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_COLOR;
      let wobble = 0;
      if (this.snake.isPoisoned) {
        color = POISONED_COLORS[(i + Math.floor(this.time.now / 150)) % POISONED_COLORS.length];
        wobble = Math.sin(this.time.now / 120 + i) * 2;
      }
      this.gfx.fillStyle(color, 1);
      this.gfx.fillRoundedRect(segment.x * CELL_SIZE + 2 + wobble, segment.y * CELL_SIZE + 2 - wobble, CELL_SIZE - 4, CELL_SIZE - 4, 6);
    });

    this.renderItems();
  }

  private renderItems(): void {
    const seen = new Set<string>();
    for (const item of this.items) {
      const key = `${item.position.x},${item.position.y}`;
      seen.add(key);
      const label = item.type === "poison-apple" ? "🟣" : item.type === "apple" ? "🍎" : (item.questionId && scienceQuestionsById[item.questionId]?.icon) || "❓";
      let text = this.itemTexts.get(key);
      if (!text) {
        text = this.add.text(0, 0, label, { fontSize: `${CELL_SIZE - 6}px` }).setOrigin(0.5);
        this.itemTexts.set(key, text);
      } else {
        text.setText(label);
      }
      text.setPosition(item.position.x * CELL_SIZE + CELL_SIZE / 2, item.position.y * CELL_SIZE + CELL_SIZE / 2);
    }
    for (const [key, text] of this.itemTexts) {
      if (!seen.has(key)) {
        text.destroy();
        this.itemTexts.delete(key);
      }
    }
  }
}
