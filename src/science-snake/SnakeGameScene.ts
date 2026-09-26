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
import { updateSnakeStatus, syncBoardItems } from "./snakeStatus";

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

/** Wall-collision doesn't exist as a lose reason — the edges wrap instead (see `snakeGrid.ts`'s `wrapPosition`), per your ask. */
export type LoseReason = "self-collision" | "suffocation";

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

/** Per your "the snake is missing a head and a tail, able to make it obvious" feedback: the last few segments shrink toward the tail's tip (see TAIL_TAPER_SEGMENTS below), and the head gets eyes facing the direction of travel — same reasoning `scorchTile` in idiom-door has for a purely cosmetic recolor: a `render` concern only, no new pure-logic state. */
const TAIL_TAPER_SEGMENTS = 3;
const TAIL_RING_COLOR = 0xe8ffe0;
const EYE_COLOR = 0xffffff;
const EYE_RADIUS = 2.5;
/** The suffocation death image's "rolled onto its back" tell — see `playSuffocationDeath`'s doc comment for why this replaced a geometric flip. */
const BELLY_COLOR = 0xf3e9c9;
const DEAD_EYE_COLOR = 0x2a2a2a;

/** Where a head's two eyes sit relative to its own cell center — offset forward (toward direction of travel) and to either side, so they read as "looking" the way the snake is actually heading. */
const DIRECTION_FORWARD: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const DIRECTION_SIDE: Record<Direction, Position> = {
  up: { x: 1, y: 0 },
  down: { x: 1, y: 0 },
  left: { x: 0, y: 1 },
  right: { x: 0, y: 1 },
};

/**
 * Per your original spec: "the snake dies from suffocation... show that
 * snake upside down with smoke looking stink rising." A short beat, not
 * a lingering animation — per your separate "should end early quickly"
 * ask for the suffocation lose path specifically, this is a brief
 * failure image, not a wait.
 */
const SUFFOCATION_DEATH_DURATION_MS = 1100;
const SMOKE_PUFF_COUNT = 8;
const SMOKE_COLOR = 0x8a8a8a;

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
      if (direction) this.requestDirection(direction);
    };
    this.input.keyboard?.on("keydown", this.keydownHandler);
  }

  /**
   * Public entry point for the on-screen joystick (`main.ts`'s
   * handlers) — same "public method the DOM chrome calls on the live
   * scene instance" pattern `IdiomDoorScene.requestJump` already uses
   * for its own touch button.
   *
   * Ignored entirely while paused or ended — found live (2026-09-18,
   * "after every correct answer, the game ends with 'the snake ran into
   * itself'"): Phaser's own keyboard manager listens on the whole
   * window, not scoped to canvas focus, so every keystroke typed into
   * `#question-input` that happened to match a WASD/arrow key (which is
   * essentially *every* real sentence answer — "a", "s", "d" are common
   * letters, and the malformed-answer check requires a real sentence)
   * was silently changing `this.snake.direction` while the question
   * overlay was open. By the time a correct answer resumed the game,
   * the direction was whatever letter was typed last — effectively
   * random, and very likely to immediately clip the snake's own body.
   * The on-screen controls were already visually blocked by the overlay's own
   * z-index, but the keyboard path had no such guard — this fixes it at
   * the source so both paths are covered in one place, without needing
   * to trust incidental CSS stacking.
   */
  requestDirection(direction: Direction): void {
    if (this.paused || this.ended) return;
    this.snake = changeDirection(this.snake, direction);
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
      this.finishLose(result.outcome);
      return;
    }
    this.snake = result.snake;
    this.handleHeadPosition();
    // handleHeadPosition can itself end the run (checkOutcome ->
    // finishLose/finishWin), which for suffocation specifically already
    // drew the death frame (playSuffocationDeath) — an unconditional
    // render() here would immediately overwrite that with a normal
    // alive-colored redraw before anyone ever saw it.
    if (this.ended) return;
    // checkOutcome (called from handleHeadPosition's eating branches)
    // only ever runs at the instant something is eaten — a board that
    // piles up past the suffocation threshold while the snake is simply
    // wandering, having eaten nothing that tick, would otherwise never
    // actually be checked. isSuffocating has to be checked every tick,
    // independent of eating, to match "should end early quickly" for a
    // genuinely crowded board.
    if (isSuffocating(this.items)) {
      this.finishLose("suffocation");
      return;
    }
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
      this.finishWin();
      return;
    }
    if (isSuffocating(this.items)) {
      this.finishLose("suffocation");
    }
  }

  private finishWin(): void {
    this.ended = true;
    this.tickEvent?.remove();
    this.onWin(this.stats);
  }

  private finishLose(reason: LoseReason): void {
    this.ended = true;
    this.tickEvent?.remove();
    if (reason === "suffocation") {
      this.playSuffocationDeath(() => this.onLose(reason, this.stats));
    } else {
      this.onLose(reason, this.stats);
    }
  }

  /**
   * The suffocation-specific death image. A geometric upside-down flip
   * turned out not to read as anything at all for a snake drawn as a
   * straight row of symmetric rounded squares — mirroring a single
   * horizontal (or vertical) row around its own center produces a
   * pixel-identical image, since there's no vertical asymmetry in the
   * shapes themselves for a flip to reveal. Swapped for a cue that's
   * unambiguous regardless of the snake's shape: every segment switches
   * to a pale "belly" color (the classic "rolled onto its back" tell)
   * and the head's eyes become a cartoon "X X", plus a few grey smoke
   * puffs rising off it — see SUFFOCATION_DEATH_DURATION_MS's doc
   * comment for why this is a short beat, not a lingering animation.
   * `render()` isn't called again after this starts, so the grid/items
   * stay exactly as they were at the moment of suffocation — a
   * freeze-frame, not a continuing simulation.
   */
  private playSuffocationDeath(onComplete: () => void): void {
    const xs = this.snake.body.map((s) => s.x);
    const ys = this.snake.body.map((s) => s.y);
    const centerXpx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * CELL_SIZE;
    const centerYpx = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * CELL_SIZE;

    this.renderGridAndItems();
    this.renderSnakeBody(this.gfx, true);
    this.spawnSmokePuffs(centerXpx, centerYpx);

    this.time.delayedCall(SUFFOCATION_DEATH_DURATION_MS, onComplete);
  }

  private spawnSmokePuffs(centerXpx: number, centerYpx: number): void {
    for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
      const startX = centerXpx + (Math.random() - 0.5) * CELL_SIZE * 2;
      const startY = centerYpx + (Math.random() - 0.5) * CELL_SIZE;
      const puff = this.add.circle(startX, startY, 4 + Math.random() * 4, SMOKE_COLOR, 0.7);
      this.tweens.add({
        targets: puff,
        y: startY - 40 - Math.random() * 30,
        x: startX + (Math.random() - 0.5) * 30,
        alpha: 0,
        scale: 2.2,
        duration: 900 + Math.random() * 400,
        delay: i * 60,
        onComplete: () => puff.destroy(),
      });
    }
  }

  private render(): void {
    this.renderGridAndItems();
    this.renderSnakeBody(this.gfx);
    updateSnakeStatus(this.snake);
    syncBoardItems(this.items);
  }

  private renderGridAndItems(): void {
    this.gfx.clear();
    this.gfx.lineStyle(1, GRID_LINE_COLOR, 1);
    for (let x = 0; x <= GRID_WIDTH; x++) {
      this.gfx.lineBetween(x * CELL_SIZE, 0, x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      this.gfx.lineBetween(0, y * CELL_SIZE, GRID_WIDTH * CELL_SIZE, y * CELL_SIZE);
    }
    this.renderItems();
  }

  /**
   * Draws the snake into `target` — normally the shared grid/items
   * layer (`this.gfx`). `isDead` (only true during
   * `playSuffocationDeath`) swaps every segment to `BELLY_COLOR` and
   * the head's eyes to a cartoon "X X" instead of its normal look.
   */
  private renderSnakeBody(target: Phaser.GameObjects.Graphics, isDead = false): void {
    const bodyLength = this.snake.body.length;
    this.snake.body.forEach((segment, i) => {
      const isHead = i === 0;
      // Segments counted back from the tail's actual tip (0), not from
      // the head — the last TAIL_TAPER_SEGMENTS of these taper down in
      // size, evoking a real snake's tail rather than a uniform row of
      // identical squares.
      const distFromTail = bodyLength - 1 - i;
      const isTaper = !isHead && distFromTail < TAIL_TAPER_SEGMENTS;

      let color = isHead ? SNAKE_HEAD_COLOR : SNAKE_COLOR;
      let wobble = 0;
      if (isDead) {
        color = BELLY_COLOR;
      } else if (this.snake.isPoisoned) {
        color = POISONED_COLORS[(i + Math.floor(this.time.now / 150)) % POISONED_COLORS.length];
        wobble = Math.sin(this.time.now / 120 + i) * 2;
      }

      const cellX = segment.x * CELL_SIZE;
      const cellY = segment.y * CELL_SIZE;
      // The tip (distFromTail 0) shrinks the most; the segment closest
      // to the rest of the body (distFromTail TAIL_TAPER_SEGMENTS - 1)
      // barely shrinks at all, so the taper reads as gradual.
      const extraInset = isTaper ? (TAIL_TAPER_SEGMENTS - distFromTail) * 3 : 0;
      const offset = 2 + extraInset;
      const size = CELL_SIZE - 4 - extraInset * 2;

      target.fillStyle(color, 1);
      target.fillRoundedRect(cellX + offset + wobble, cellY + offset - wobble, size, size, isHead ? 8 : 6);

      if (isTaper && !isDead && !this.snake.isPoisoned) {
        // A couple of thin ring stripes across the tapering tail,
        // evoking a real snake's banded tail — per your "tail a little
        // like rings" feedback. Skipped while poisoned (the cycling
        // rainbow fill is already that state's own tell) or dead (the
        // belly color already is).
        target.lineStyle(2, TAIL_RING_COLOR, 0.9);
        target.lineBetween(cellX + offset, cellY + offset + size * 0.35, cellX + offset + size, cellY + offset + size * 0.35);
        target.lineBetween(cellX + offset, cellY + offset + size * 0.65, cellX + offset + size, cellY + offset + size * 0.65);
      }

      if (isHead) {
        const forward = DIRECTION_FORWARD[this.snake.direction];
        const side = DIRECTION_SIDE[this.snake.direction];
        const centerX = cellX + CELL_SIZE / 2;
        const centerY = cellY + CELL_SIZE / 2;
        const forwardDist = CELL_SIZE * 0.15;
        const sideDist = CELL_SIZE * 0.2;
        const eyeA = { x: centerX + forward.x * forwardDist + side.x * sideDist, y: centerY + forward.y * forwardDist + side.y * sideDist };
        const eyeB = { x: centerX + forward.x * forwardDist - side.x * sideDist, y: centerY + forward.y * forwardDist - side.y * sideDist };
        if (isDead) {
          target.lineStyle(2, DEAD_EYE_COLOR, 1);
          const arm = EYE_RADIUS * 1.6;
          for (const eye of [eyeA, eyeB]) {
            target.lineBetween(eye.x - arm, eye.y - arm, eye.x + arm, eye.y + arm);
            target.lineBetween(eye.x - arm, eye.y + arm, eye.x + arm, eye.y - arm);
          }
        } else {
          target.fillStyle(EYE_COLOR, 1);
          target.fillCircle(eyeA.x, eyeA.y, EYE_RADIUS);
          target.fillCircle(eyeB.x, eyeB.y, EYE_RADIUS);
        }
      }
    });
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
