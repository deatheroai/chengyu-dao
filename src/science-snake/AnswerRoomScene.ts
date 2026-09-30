import Phaser from "phaser";
import type { Direction } from "./snakeGrid";
import type { SnakeState } from "./snakeGrid";
import {
  createRoomSnake,
  placeApples,
  roomStep,
  roomChangeDirection,
  resolveHead,
  QUESTION_DOOR_CELLS,
  QUESTION_DOOR_WORD,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_TICK_MS,
  type KeyEntry,
  type RoomApple,
  type RoomEvent,
} from "./answerRoom";

/**
 * The answer room's Phaser scene — thin wiring over answerRoom.ts, same
 * split as SnakeGameScene. Started fresh on every entry (with however
 * many phrases are already placed), and reports each eat back through
 * `onEvent`; the page decides what a thrown-out or finished sentence
 * looks like.
 */

export const ROOM_CELL_SIZE = 36;
export const COUNTDOWN_STEP_MS = 700;
/** After this long without placing a phrase, the right apple starts to pulse — a nudge, not the answer on a plate. */
export const HINT_AFTER_MS = 5000;

const BG_COLOR = 0xfdf8ec;
const GRID_LINE_COLOR = 0xeee4cc;
const DOOR_COLOR = 0x5b7fd0;
const SNAKE_COLOR = 0x3c8a4c;
const SNAKE_HEAD_COLOR = 0x2c6b39;
const APPLE_BG = 0xffffff;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

export interface AnswerRoomSceneData {
  key: KeyEntry[];
  placedCount: number;
  totalPhrases: number;
  rng: () => number;
  onEvent: (event: RoomEvent) => void;
  onCountdown: (value: number | null) => void;
  onState: (snake: SnakeState, apples: RoomApple[]) => void;
}

export class AnswerRoomScene extends Phaser.Scene {
  private data_!: AnswerRoomSceneData;
  private snake!: SnakeState;
  private apples: RoomApple[] = [];
  private placedCount = 0;
  private running = false;
  private lastProgressAt = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private appleTexts: Phaser.GameObjects.Text[] = [];
  private tickEvent?: Phaser.Time.TimerEvent;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor() {
    super("AnswerRoomScene");
  }

  init(data: AnswerRoomSceneData): void {
    this.data_ = data;
    this.placedCount = data.placedCount;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG_COLOR);
    this.gfx = this.add.graphics();
    this.snake = createRoomSnake();
    this.apples = placeApples(this.data_.key, this.placedCount, this.snake, this.data_.rng);
    this.running = false;
    this.drawDoor();
    this.appleTexts = this.apples.map((apple) => {
      const entry = this.entryFor(apple);
      return this.add
        .text(0, 0, entry.symbol.glyph, { fontSize: `${ROOM_CELL_SIZE - 12}px`, color: entry.symbol.color, fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(2);
    });
    this.keydownHandler = (e: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[e.key];
      if (direction) this.requestDirection(direction);
    };
    this.input.keyboard?.on("keydown", this.keydownHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tickEvent?.remove();
      if (this.keydownHandler) this.input.keyboard?.off("keydown", this.keydownHandler);
    });
    this.render();
    this.runCountdown(3);
  }

  /** 3-2-1 before moving, on every entry — the child gets to look at the board first. */
  private runCountdown(value: number): void {
    this.data_.onCountdown(value);
    this.time.delayedCall(COUNTDOWN_STEP_MS, () => {
      if (value > 1) {
        this.runCountdown(value - 1);
        return;
      }
      this.data_.onCountdown(null);
      this.running = true;
      this.lastProgressAt = this.time.now;
      this.tickEvent = this.time.addEvent({ delay: ROOM_TICK_MS, loop: true, callback: () => this.tick() });
    });
  }

  /** Called by the on-screen joystick. Turning during the countdown is allowed, so the child can aim before the off. */
  requestDirection(direction: Direction): void {
    if (!this.snake) return;
    this.snake = roomChangeDirection(this.snake, direction);
  }

  private entryFor(apple: RoomApple): KeyEntry {
    return this.data_.key.find((entry) => entry.phraseIndex === apple.phraseIndex)!;
  }

  private tick(): void {
    if (!this.running) return;
    this.snake = roomStep(this.snake);
    const before = this.apples;
    const { event, apples } = resolveHead(this.snake.body[0], this.apples, this.placedCount, this.data_.totalPhrases);
    if (apples.length !== before.length) {
      const eatenIndex = before.findIndex((a) => !apples.includes(a));
      this.appleTexts[eatenIndex]?.destroy();
      this.appleTexts.splice(eatenIndex, 1);
      this.apples = apples;
    }
    if (event.kind === "placed") {
      this.placedCount = event.placedCount;
      this.lastProgressAt = this.time.now;
    }
    if (event.kind !== "none" && event.kind !== "placed") {
      this.running = false;
      this.tickEvent?.remove();
    }
    this.render();
    if (event.kind !== "none") this.data_.onEvent(event);
  }

  private drawDoor(): void {
    QUESTION_DOOR_CELLS.forEach((cell, i) => {
      this.add
        .text(cell.x * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2, cell.y * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2, QUESTION_DOOR_WORD[i], {
          fontSize: `${ROOM_CELL_SIZE - 14}px`,
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(2);
    });
  }

  update(): void {
    // Only the hint pulse animates between ticks.
    if (this.running) this.renderApples();
  }

  private render(): void {
    const g = this.gfx;
    g.clear();
    g.lineStyle(1, GRID_LINE_COLOR, 1);
    for (let x = 0; x <= ROOM_WIDTH; x++) g.lineBetween(x * ROOM_CELL_SIZE, 0, x * ROOM_CELL_SIZE, ROOM_HEIGHT * ROOM_CELL_SIZE);
    for (let y = 0; y <= ROOM_HEIGHT; y++) g.lineBetween(0, y * ROOM_CELL_SIZE, ROOM_WIDTH * ROOM_CELL_SIZE, y * ROOM_CELL_SIZE);

    g.fillStyle(DOOR_COLOR, 1);
    for (const cell of QUESTION_DOOR_CELLS) {
      g.fillRoundedRect(cell.x * ROOM_CELL_SIZE + 1, cell.y * ROOM_CELL_SIZE + 1, ROOM_CELL_SIZE - 2, ROOM_CELL_SIZE - 2, 6);
    }

    for (const apple of this.apples) {
      const cx = apple.position.x * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2;
      const cy = apple.position.y * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2;
      g.fillStyle(APPLE_BG, 1);
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.entryFor(apple).symbol.color).color, 1);
      g.fillCircle(cx, cy, ROOM_CELL_SIZE / 2 - 2);
      g.strokeCircle(cx, cy, ROOM_CELL_SIZE / 2 - 2);
    }

    this.snake.body.forEach((segment, i) => {
      const isHead = i === 0;
      g.fillStyle(isHead ? SNAKE_HEAD_COLOR : SNAKE_COLOR, 1);
      g.fillRoundedRect(segment.x * ROOM_CELL_SIZE + 3, segment.y * ROOM_CELL_SIZE + 3, ROOM_CELL_SIZE - 6, ROOM_CELL_SIZE - 6, isHead ? 10 : 7);
      if (isHead) {
        const cx = segment.x * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2;
        const cy = segment.y * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2;
        const horizontal = this.snake.direction === "left" || this.snake.direction === "right";
        const fwd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.snake.direction];
        const ex = cx + fwd[0] * 5;
        const ey = cy + fwd[1] * 5;
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex + (horizontal ? 0 : 6), ey + (horizontal ? 6 : 0), 3);
        g.fillCircle(ex - (horizontal ? 0 : 6), ey - (horizontal ? 6 : 0), 3);
      }
    });

    this.renderApples();
    this.data_.onState(this.snake, this.apples);
  }

  private renderApples(): void {
    const hinting = this.running && this.time.now - this.lastProgressAt > HINT_AFTER_MS;
    this.apples.forEach((apple, i) => {
      const text = this.appleTexts[i];
      if (!text) return;
      text.setPosition(apple.position.x * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2, apple.position.y * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2);
      const pulse = hinting && apple.phraseIndex === this.placedCount ? 1 + 0.25 * Math.abs(Math.sin(this.time.now / 180)) : 1;
      text.setScale(pulse);
    });
  }
}
