import Phaser from "phaser";
import type { Direction } from "./snakeGrid";
import type { SnakeState } from "./snakeGrid";
import {
  createRoomSnake,
  spawnStep,
  roomStep,
  roomChangeDirection,
  resolveHead,
  QUESTION_DOOR_CELLS,
  LADDER_CELLS,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  ROOM_TICK_MS,
  type RoomApple,
  type RoomEvent,
  type RoomStep,
} from "./answerRoom";

/**
 * The answer room's Phaser scene — thin wiring over answerRoom.ts, same
 * split as SnakeGameScene. Started fresh on every entry (at whichever
 * step the sentence has reached), and reports each eat back through
 * `onEvent`; the page decides what a wrong choice or a finished
 * sentence looks like.
 */

export const ROOM_CELL_SIZE = 40;
export const COUNTDOWN_STEP_MS = 700;
/** Same short beat as the main board's suffocation death — a clear "oops", not a wait. */
export const DEATH_DURATION_MS = 1100;

const BG_COLOR = 0xfdf8ec;
const GRID_LINE_COLOR = 0xeee4cc;
const DOOR_FRAME_COLOR = 0x5a3a1c;
const DOOR_WOOD_COLOR = 0x9a6331;
const DOOR_PANEL_COLOR = 0x86542a;
const DOOR_KNOB_COLOR = 0xf2c230;
const DOOR_BADGE_COLOR = 0x2f7fd6;
const LADDER_COLOR = 0x9a6331;
const LADDER_GLOW = 0xffe27a;
const SNAKE_COLOR = 0x3c8a4c;
const SNAKE_HEAD_COLOR = 0x2c6b39;
const BELLY_COLOR = 0xf3e9c9;
const DEAD_EYE_COLOR = 0x2a2a2a;
const SMOKE_COLOR = 0x8a8a8a;
const WORD_APPLE_COLOR = 0xe0463a;
const OPTION_APPLE_COLOR = 0x2f7fd6;
const LEAF_COLOR = 0x3c8a4c;

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
  steps: RoomStep[];
  /** How far through `steps` the sentence already is — 0 after a wrong choice, kept after a trip to reread. */
  stepIndex: number;
  rng: () => number;
  onEvent: (event: RoomEvent, stepIndex: number) => void;
  onCountdown: (value: number | null) => void;
  onState: (snake: SnakeState, apples: RoomApple[], finished: boolean) => void;
}

export class AnswerRoomScene extends Phaser.Scene {
  private data_!: AnswerRoomSceneData;
  private snake!: SnakeState;
  private apples: RoomApple[] = [];
  private stepIndex = 0;
  private running = false;
  private dead = false;
  private gfx!: Phaser.GameObjects.Graphics;
  private appleLabels: Phaser.GameObjects.Text[] = [];
  private doorLabels: Phaser.GameObjects.Text[] = [];
  private tickEvent?: Phaser.Time.TimerEvent;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor() {
    super("AnswerRoomScene");
  }

  init(data: AnswerRoomSceneData): void {
    this.data_ = data;
    this.stepIndex = data.stepIndex;
  }

  private get finished(): boolean {
    return this.stepIndex >= this.data_.steps.length;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG_COLOR);
    this.gfx = this.add.graphics();
    this.snake = createRoomSnake();
    this.running = false;
    this.dead = false;
    this.appleLabels = [];
    this.doorLabels = [];
    this.drawDoorLettering();
    this.spawnCurrentStep();
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
      this.tickEvent = this.time.addEvent({ delay: ROOM_TICK_MS, loop: true, callback: () => this.tick() });
    });
  }

  /** Called by the on-screen joystick. Turning during the countdown is allowed, so the child can aim before the off. */
  requestDirection(direction: Direction): void {
    if (!this.snake || this.dead) return;
    this.snake = roomChangeDirection(this.snake, direction);
  }

  private spawnCurrentStep(): void {
    for (const label of this.appleLabels) label.destroy();
    this.appleLabels = [];
    this.apples = this.finished ? [] : spawnStep(this.data_.steps[this.stepIndex], this.snake, this.data_.rng);
    for (const apple of this.apples) this.drawAppleLabel(apple);
  }

  private tick(): void {
    if (!this.running) return;
    this.snake = roomStep(this.snake);
    const event = resolveHead(this.snake.body[0], this.apples, this.finished);

    if (event.kind === "ate-word" || event.kind === "chose-right") {
      this.stepIndex += 1;
      this.spawnCurrentStep();
      // Last word eaten: the QUESTION door goes, the ladder takes over.
      if (this.finished) for (const label of this.doorLabels) label.destroy();
    } else if (event.kind !== "none") {
      this.running = false;
      this.tickEvent?.remove();
    }

    if (event.kind === "chose-wrong") {
      this.playDeath(() => this.data_.onEvent(event, this.stepIndex));
      return;
    }
    this.render();
    if (event.kind !== "none") this.data_.onEvent(event, this.stepIndex);
  }

  /** The wrong blue apple: belly-up snake with "X X" eyes and a few smoke puffs, then the page takes over. */
  private playDeath(onComplete: () => void): void {
    this.dead = true;
    for (const label of this.appleLabels) label.destroy();
    this.appleLabels = [];
    this.apples = [];
    this.render();
    const { x: cx, y: cy } = this.cellCenter(this.snake.body[0]);
    for (let i = 0; i < 8; i++) {
      const puff = this.add.circle(cx + (Math.random() - 0.5) * 40, cy, 5 + Math.random() * 4, SMOKE_COLOR, 0.7).setDepth(4);
      this.tweens.add({
        targets: puff,
        y: cy - 50 - Math.random() * 30,
        alpha: 0,
        scale: 2.2,
        duration: 900,
        delay: i * 60,
        onComplete: () => puff.destroy(),
      });
    }
    this.time.delayedCall(DEATH_DURATION_MS, onComplete);
  }

  private cellCenter(p: { x: number; y: number }): { x: number; y: number } {
    return { x: p.x * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2, y: p.y * ROOM_CELL_SIZE + ROOM_CELL_SIZE / 2 };
  }

  /**
   * A word apple gets its word in a white bubble just above it (below
   * it on the top row), kept inside the board — a word is wider than a
   * cell, but only one is ever on the board, so it can't overlap
   * another. A blue choice apple just gets a big A or B: what each one
   * means is shown above the board.
   */
  private drawAppleLabel(apple: RoomApple): void {
    const { x, y } = this.cellCenter(apple.position);
    if (apple.kind === "option") {
      this.appleLabels.push(
        this.add.text(x, y, apple.label, { fontSize: "22px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(3),
      );
      return;
    }
    const label = this.add
      .text(0, 0, apple.text, {
        fontSize: "17px",
        color: "#2c3d24",
        fontStyle: "bold",
        backgroundColor: "#ffffff",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(3);
    const labelY = apple.position.y > 0 ? y - ROOM_CELL_SIZE * 0.85 : y + ROOM_CELL_SIZE * 0.85;
    const half = label.width / 2;
    const labelX = Math.min(Math.max(x, half + 2), ROOM_WIDTH * ROOM_CELL_SIZE - half - 2);
    label.setPosition(labelX, labelY);
    this.appleLabels.push(label);
  }

  /** Top-left corner and size of the door, in pixels. */
  private doorRect(): { x: number; y: number; w: number; h: number } {
    const xs = QUESTION_DOOR_CELLS.map((c) => c.x);
    const ys = QUESTION_DOOR_CELLS.map((c) => c.y);
    const x = Math.min(...xs) * ROOM_CELL_SIZE;
    const y = Math.min(...ys) * ROOM_CELL_SIZE;
    return { x, y, w: (Math.max(...xs) + 1) * ROOM_CELL_SIZE - x, h: (Math.max(...ys) + 1) * ROOM_CELL_SIZE - y };
  }

  /** The door's lettering: a big "Q" on the wood and a ↩ badge — "back to the question". */
  private drawDoorLettering(): void {
    if (this.finished) return;
    const { x, y, w, h } = this.doorRect();
    this.doorLabels.push(
      this.add
        .text(x + w / 2, y + h * 0.6, "Q", { fontSize: `${Math.round(h * 0.4)}px`, color: "#fff4d6", fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(2),
      this.add.text(x + 12, y + 12, "↩", { fontSize: "18px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(3),
    );
  }

  /** An arched wooden door in its frame, with panels and a knob. */
  private renderDoor(g: Phaser.GameObjects.Graphics): void {
    const { x, y, w, h } = this.doorRect();
    const pad = 5;
    const arch = w / 2 - pad;
    g.fillStyle(DOOR_FRAME_COLOR, 1);
    g.fillRoundedRect(x + pad - 3, y + pad - 3, w - 2 * pad + 6, h - pad + 3, { tl: arch + 3, tr: arch + 3, bl: 0, br: 0 });
    g.fillStyle(DOOR_WOOD_COLOR, 1);
    g.fillRoundedRect(x + pad, y + pad, w - 2 * pad, h - pad, { tl: arch, tr: arch, bl: 0, br: 0 });
    g.fillStyle(DOOR_PANEL_COLOR, 1);
    g.fillRoundedRect(x + w * 0.24, y + h * 0.36, w * 0.52, h * 0.24, 4);
    g.fillRoundedRect(x + w * 0.24, y + h * 0.66, w * 0.52, h * 0.24, 4);
    g.fillStyle(DOOR_KNOB_COLOR, 1);
    g.fillCircle(x + w * 0.82, y + h * 0.63, 4);
    g.fillStyle(DOOR_BADGE_COLOR, 1);
    g.fillCircle(x + 12, y + 12, 12);
  }

  /** The exit: a little wooden ladder up the top-left corner, on a pulsing glow so it's easy to spot. */
  private renderLadder(g: Phaser.GameObjects.Graphics): void {
    const x = LADDER_CELLS[0].x * ROOM_CELL_SIZE;
    const top = Math.min(...LADDER_CELLS.map((c) => c.y)) * ROOM_CELL_SIZE;
    const h = LADDER_CELLS.length * ROOM_CELL_SIZE;
    g.fillStyle(LADDER_GLOW, 0.5 + 0.3 * Math.abs(Math.sin(this.time.now / 300)));
    g.fillRoundedRect(x + 1, top + 1, ROOM_CELL_SIZE - 2, h - 2, 8);
    g.lineStyle(4, LADDER_COLOR, 1);
    g.lineBetween(x + 10, top + 2, x + 10, top + h - 2);
    g.lineBetween(x + ROOM_CELL_SIZE - 10, top + 2, x + ROOM_CELL_SIZE - 10, top + h - 2);
    for (let rung = top + 10; rung < top + h; rung += 14) g.lineBetween(x + 10, rung, x + ROOM_CELL_SIZE - 10, rung);
  }

  update(): void {
    // The ladder's glow is the only thing that animates between ticks.
    if (this.finished && !this.dead) this.render();
  }

  private render(): void {
    const g = this.gfx;
    g.clear();
    g.lineStyle(1, GRID_LINE_COLOR, 1);
    for (let x = 0; x <= ROOM_WIDTH; x++) g.lineBetween(x * ROOM_CELL_SIZE, 0, x * ROOM_CELL_SIZE, ROOM_HEIGHT * ROOM_CELL_SIZE);
    for (let y = 0; y <= ROOM_HEIGHT; y++) g.lineBetween(0, y * ROOM_CELL_SIZE, ROOM_WIDTH * ROOM_CELL_SIZE, y * ROOM_CELL_SIZE);

    if (this.finished) this.renderLadder(g);
    else this.renderDoor(g);

    for (const apple of this.apples) {
      const { x, y } = this.cellCenter(apple.position);
      g.fillStyle(apple.kind === "option" ? OPTION_APPLE_COLOR : WORD_APPLE_COLOR, 1);
      g.fillCircle(x, y, ROOM_CELL_SIZE / 2 - 3);
      g.fillStyle(LEAF_COLOR, 1);
      g.fillEllipse(x + 5, y - ROOM_CELL_SIZE / 2 + 5, 10, 6);
    }

    this.renderSnake(g);
    this.data_.onState(this.snake, this.apples, this.finished);
  }

  private renderSnake(g: Phaser.GameObjects.Graphics): void {
    this.snake.body.forEach((segment, i) => {
      const isHead = i === 0;
      g.fillStyle(this.dead ? BELLY_COLOR : isHead ? SNAKE_HEAD_COLOR : SNAKE_COLOR, 1);
      g.fillRoundedRect(segment.x * ROOM_CELL_SIZE + 3, segment.y * ROOM_CELL_SIZE + 3, ROOM_CELL_SIZE - 6, ROOM_CELL_SIZE - 6, isHead ? 10 : 7);
      if (!isHead) return;
      const { x: cx, y: cy } = this.cellCenter(segment);
      const horizontal = this.snake.direction === "left" || this.snake.direction === "right";
      const fwd = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.snake.direction];
      const ex = cx + fwd[0] * 5;
      const ey = cy + fwd[1] * 5;
      const eyes = [
        { x: ex + (horizontal ? 0 : 6), y: ey + (horizontal ? 6 : 0) },
        { x: ex - (horizontal ? 0 : 6), y: ey - (horizontal ? 6 : 0) },
      ];
      if (this.dead) {
        g.lineStyle(2, DEAD_EYE_COLOR, 1);
        for (const eye of eyes) {
          g.lineBetween(eye.x - 4, eye.y - 4, eye.x + 4, eye.y + 4);
          g.lineBetween(eye.x - 4, eye.y + 4, eye.x + 4, eye.y - 4);
        }
      } else {
        g.fillStyle(0xffffff, 1);
        for (const eye of eyes) g.fillCircle(eye.x, eye.y, 3);
      }
    });
  }
}
