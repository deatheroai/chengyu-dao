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
import { updateSnakeStatus, syncBoardItems, updateQuestionFlowStatus } from "./snakeStatus";
import { drawApple, APPLE_RED, APPLE_POISON, APPLE_GOLD } from "./appleArt";
import {
  placePhraseApple,
  splitIntoPhrases,
  placeAnswerDoor,
  goldenAppleCells,
  isOnCells,
  QUESTION_TICK_MS,
  ANSWER_DOOR_WORD,
} from "./questionFlow";

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
  /** Answered through the answer room (or the old typed overlay). */
  questionsCorrect: number;
  /** Golden apples eaten (5 points each, just for trying). */
  goldenAttempts: number;
  /** Questions answered by typing the whole answer after a golden apple (150 points each). */
  goldenCorrect: number;
}

/**
 * The redesign's question flow (BACKLOG.md's "Redesign: question
 * apples, ANSWER door + answer room"), switched on by passing these
 * hooks — without them the scene keeps the old typed-answer overlay.
 * The page owns everything off the board: the question text, read
 * aloud, and the answer room itself.
 */
export interface QuestionFlowHooks {
  onQuestionStart: (questionId: string) => void;
  /** A question phrase was eaten; `eaten` of `phrases` are now in. */
  onPhraseEaten: (questionId: string, eaten: number, phrases: string[]) => void;
  onDoorOpen: (questionId: string) => void;
  /** The board is frozen until the page calls `returnFromRoom`. */
  onEnterRoom: (questionId: string) => void;
  /** A golden apple was eaten: the board is frozen until the page calls `returnFromGolden`. */
  onGoldenApple: (questionId: string) => void;
}

export interface SnakeGameSceneData {
  onWin: (stats: RunStats) => void;
  onLose: (reason: LoseReason, stats: RunStats) => void;
  questionFlow?: QuestionFlowHooks;
}

interface ActiveQuestion {
  id: string;
  /** The question cut into 4-6 word phrases (questionFlow.ts's splitIntoPhrases), eaten in order. */
  phrases: string[];
  /** How many phrases have been eaten. */
  eaten: number;
  /** Where the next phrase is waiting — only ever one on the board. */
  apple: Position | null;
  door: Position[] | null;
  /** False right after coming back out of the room through the door, until the head has left the door's cells — otherwise it would walk straight back in. */
  doorArmed: boolean;
  /** The two golden apples above and below the door — null before the door opens, and for good once one has been eaten (one try per question). */
  golden: Position[] | null;
  goldenTried: boolean;
}

const DOOR_COLOR = 0x2f7fd6;
const GOLDEN_GLOW = 0xffe27a;
/** After a golden answer the snake shimmers in these (until the next science item), and dances through the 3-2-1. */
const GOLDEN_SHIMMER = [0xf5c518, 0xffd84d, 0xffeb99, 0xe6a800];
const SPARKLE_COLOR = 0xfffbe0;
const DANCE_FRAME_MS = 50;
const COUNTDOWN_STEP_MS = 700;
/** Phaser's own default is Courier; match the page's font instead. */
const LABEL_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

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
  private stats: RunStats = { applesEaten: 0, poisonApplesEaten: 0, questionsCorrect: 0, goldenAttempts: 0, goldenCorrect: 0 };
  private rng: () => number = createRng(1);
  private tickEvent?: Phaser.Time.TimerEvent;
  private paused = false;
  private ended = false;
  private gfx!: Phaser.GameObjects.Graphics;
  private itemTexts = new Map<string, Phaser.GameObjects.Text>();
  private onWin!: (stats: RunStats) => void;
  private onLose!: (reason: LoseReason, stats: RunStats) => void;
  private keydownHandler?: (e: KeyboardEvent) => void;
  private flow?: QuestionFlowHooks;
  /** The delay `tickEvent` loops at — scheduleTick only replaces the loop when this needs to change. */
  private tickPace = 0;
  private activeQuestion: ActiveQuestion | null = null;
  private questionLabels: Phaser.GameObjects.Text[] = [];
  /** The golden shimmer after a golden answer, until the next science item is eaten. */
  private shimmering = false;
  /** True while the snake dances through the 3-2-1 after a golden answer. */
  private dancing = false;

  constructor() {
    super("SnakeGameScene");
  }

  init(data: SnakeGameSceneData): void {
    this.onWin = data.onWin;
    this.onLose = data.onLose;
    this.flow = data.questionFlow;
  }

  create(): void {
    this.rng = createRng(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
    this.cameras.main.setBackgroundColor(BG_COLOR);
    this.gfx = this.add.graphics();
    this.itemTexts = new Map();
    this.snake = createInitialSnake({ x: Math.floor(GRID_WIDTH / 2), y: Math.floor(GRID_HEIGHT / 2) }, "right", 3);
    this.stats = { applesEaten: 0, poisonApplesEaten: 0, questionsCorrect: 0, goldenAttempts: 0, goldenCorrect: 0 };
    this.shimmering = false;
    this.dancing = false;
    this.items = [];
    this.paused = false;
    this.ended = false;
    this.activeQuestion = null;
    this.questionLabels = [];
    this.tickEvent = undefined;
    this.tickPace = 0;

    for (let i = 0; i < INITIAL_APPLE_COUNT; i++) this.spawnReplacementApple();
    this.spawnReplacementScienceItemIfNeeded();
    this.wireInput();
    this.render();

    this.scheduleTick();
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

  /**
   * A looping timer at the current pace, replaced only when the pace
   * changes (slower while a question is open). Without a question open
   * this is exactly the single looping TICK_MS timer the game always
   * had, so the default game's timing is unchanged; a loop also carries
   * any lateness over to the next step instead of letting it add up.
   */
  private scheduleTick(): void {
    const pace = this.activeQuestion ? QUESTION_TICK_MS : TICK_MS;
    if (this.tickEvent && this.tickPace === pace) return;
    this.tickEvent?.remove();
    this.tickPace = pace;
    this.tickEvent = this.time.addEvent({ delay: pace, loop: true, callback: () => this.tick() });
  }

  private teardown(): void {
    this.tickEvent?.remove();
    if (this.keydownHandler) this.input.keyboard?.off("keydown", this.keydownHandler);
  }

  private occupiedCells(): Position[] {
    const question = this.activeQuestion;
    return [
      ...this.snake.body,
      ...this.items.map((item) => item.position),
      ...(question?.apple ? [question.apple] : []),
      ...(question?.door ?? []),
      ...(question?.golden ?? []),
    ];
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
    if (this.activeQuestion) this.tryOpenDoor(this.activeQuestion);
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
    if (this.flow && this.activeQuestion && this.handleQuestionFlow(head, this.activeQuestion)) return;
    const index = this.items.findIndex((item) => item.position.x === head.x && item.position.y === head.y);
    if (index === -1) return;
    const item = this.items[index];
    // While a question is open, other science items wait their turn —
    // the snake passes over them.
    if (item.type === "science" && this.flow && this.activeQuestion) return;
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
    } else if (this.flow) {
      this.startQuestion(item.questionId!);
      return;
    } else {
      this.askScienceQuestion(item.questionId!);
      return; // paused inside askScienceQuestion; checkOutcome runs once it resolves
    }

    this.checkOutcome();
  }

  /** The redesign's flow: the question's first phrase appears and the board slows down to QUESTION_TICK_MS. */
  private startQuestion(questionId: string): void {
    const phrases = splitIntoPhrases(scienceQuestionsById[questionId]?.prompt ?? "");
    this.shimmering = false;
    this.activeQuestion = { id: questionId, phrases, eaten: 0, apple: null, door: null, doorArmed: true, golden: null, goldenTried: false };
    this.activeQuestion.apple = placePhraseApple(this.occupiedCells(), this.snake.body[0], this.rng);
    this.scheduleTick();
    this.flow?.onQuestionStart(questionId);
  }

  /** True when the head's cell belonged to the question (the phrase apple, a golden apple or the door), so nothing else is eaten there. */
  private handleQuestionFlow(head: Position, question: ActiveQuestion): boolean {
    if (question.golden && isOnCells(question.golden, head)) {
      // One try per question: both golden apples go, whatever the answer.
      question.golden = null;
      question.goldenTried = true;
      this.stats.goldenAttempts += 1;
      this.paused = true;
      this.flow?.onGoldenApple(question.id);
      return true;
    }
    if (question.door) {
      const onDoor = isOnCells(question.door, head);
      if (onDoor && question.doorArmed) {
        this.paused = true;
        this.flow?.onEnterRoom(question.id);
        return true;
      }
      if (!onDoor) question.doorArmed = true;
      if (onDoor) return true;
    }
    if (!question.apple || question.apple.x !== head.x || question.apple.y !== head.y) return false;
    question.eaten += 1;
    question.apple = null;
    this.flow?.onPhraseEaten(question.id, question.eaten, question.phrases);
    if (question.eaten < question.phrases.length) {
      question.apple = placePhraseApple(this.occupiedCells(), head, this.rng);
    } else {
      this.tryOpenDoor(question);
    }
    return true;
  }

  /** Called again each step until it succeeds, in case the board is too crowded for the door (or the next phrase) right now. */
  private tryOpenDoor(question: ActiveQuestion): void {
    if (question.eaten < question.phrases.length) {
      if (!question.apple) question.apple = placePhraseApple(this.occupiedCells(), this.snake.body[0], this.rng);
      return;
    }
    if (question.door) return;
    question.door = placeAnswerDoor(this.occupiedCells(), this.snake.body[0], this.rng);
    if (!question.door) return;
    if (!question.goldenTried) question.golden = goldenAppleCells(question.door);
    this.flow?.onDoorOpen(question.id);
  }

  /**
   * The page calls this once the answer room is done with. "correct": the
   * sentence was built and the snake climbed out — the usual correct-
   * answer growth and score, and the question (door and all) is cleared.
   * "not-yet": back to the board with the question still open (a wrong
   * blue apple, or going back to reread) — the door stays for another go.
   * Either way the board restarts after a 3-2-1.
   */
  returnFromRoom(outcome: "correct" | "not-yet", onCountdown: (value: number | null) => void): void {
    const question = this.activeQuestion;
    if (outcome === "correct" && question) {
      this.snake = applyCorrectAnswerEaten(this.snake);
      this.stats.questionsCorrect += 1;
      this.activeQuestion = null;
      this.scheduleTick();
      this.spawnReplacementScienceItemIfNeeded();
    } else if (question) {
      question.doorArmed = false;
    }
    this.render();
    this.resumeAfterCountdown(onCountdown);
  }

  /**
   * The page calls this once the golden apple's typing challenge is
   * done. "correct": the whole answer was typed — the usual correct-
   * answer growth, 150 points, the question (door and all) cleared, and
   * the snake turns golden and dances through the 3-2-1. "not-yet": a
   * wrong answer or "not now" — the golden apples are already gone, the
   * ANSWER door stays as the easier way.
   */
  returnFromGolden(outcome: "correct" | "not-yet", onCountdown: (value: number | null) => void): void {
    if (outcome === "correct" && this.activeQuestion) {
      this.snake = applyCorrectAnswerEaten(this.snake);
      this.stats.goldenCorrect += 1;
      this.activeQuestion = null;
      this.shimmering = true;
      this.dancing = true;
      this.scheduleTick();
      this.spawnReplacementScienceItemIfNeeded();
    }
    this.render();
    const dance = this.dancing ? this.time.addEvent({ delay: DANCE_FRAME_MS, loop: true, callback: () => this.render() }) : null;
    this.resumeAfterCountdown(onCountdown, () => {
      dance?.remove();
      this.dancing = false;
      this.render();
    });
  }

  /** 3-2-1, then the board moves again. */
  private resumeAfterCountdown(onCountdown: (value: number | null) => void, onDone?: () => void): void {
    const count = (value: number): void => {
      onCountdown(value);
      this.time.delayedCall(COUNTDOWN_STEP_MS, () => {
        if (value > 1) {
          count(value - 1);
          return;
        }
        onCountdown(null);
        onDone?.();
        this.paused = false;
        this.checkOutcome();
      });
    };
    count(3);
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
    this.renderQuestionFlow();
    this.renderSnakeBody(this.gfx);
    updateSnakeStatus(this.snake);
    syncBoardItems(this.items);
    if (this.flow) updateQuestionFlowStatus(this.activeQuestion, this.stats);
  }

  /**
   * The question's next phrase — an apple with its words in a bubble
   * just above it (below it on the top row), kept inside the board,
   * same as the answer room's words — and the A-N-S-W-E-R door, one
   * letter per cell. Labels are rebuilt each render; there are never
   * more than seven of them.
   */
  private renderQuestionFlow(): void {
    for (const label of this.questionLabels) label.destroy();
    this.questionLabels = [];
    const question = this.activeQuestion;
    if (!question) return;
    if (question.apple) {
      const cx = question.apple.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = question.apple.y * CELL_SIZE + CELL_SIZE / 2;
      drawApple(this.gfx, cx, cy, CELL_SIZE, APPLE_RED);
      const label = this.add
        .text(0, 0, question.phrases[question.eaten] ?? "", {
          fontFamily: LABEL_FONT,
          fontSize: "15px",
          color: "#2c3d24",
          fontStyle: "bold",
          backgroundColor: "#ffffff",
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      const labelY = question.apple.y > 0 ? cy - CELL_SIZE * 0.95 : cy + CELL_SIZE * 0.95;
      const half = label.width / 2;
      label.setPosition(Math.min(Math.max(cx, half + 2), GRID_WIDTH * CELL_SIZE - half - 2), labelY);
      this.questionLabels.push(label);
    }
    for (const cell of question.golden ?? []) {
      const cx = cell.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = cell.y * CELL_SIZE + CELL_SIZE / 2;
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 250);
      this.gfx.fillStyle(GOLDEN_GLOW, 0.25 + 0.2 * pulse);
      this.gfx.fillCircle(cx, cy, CELL_SIZE * (0.62 + 0.08 * pulse));
      drawApple(this.gfx, cx, cy, CELL_SIZE, APPLE_GOLD);
      // "+150 ⭐" beside it, bobbing — worth far more than the door's +30.
      const label = this.pointsLabel("+150 ⭐", "#ffd23f", "#7a5200", 14);
      const side = cell.x + 2 < GRID_WIDTH ? 1 : -1;
      label.setPosition(cx + side * (CELL_SIZE * 0.55 + label.width / 2), cy + Math.sin(this.time.now / 200) * 3);
    }
    if (question.door) {
      const last = question.door[question.door.length - 1];
      const first = question.door[0];
      const label = this.pointsLabel("+30", "#1d4f8a", "#ffffff", 13);
      const x = last.x + 1 < GRID_WIDTH ? (last.x + 1) * CELL_SIZE + label.width / 2 + 2 : first.x * CELL_SIZE - label.width / 2 - 2;
      label.setPosition(x, last.y * CELL_SIZE + CELL_SIZE / 2);
    }
    question.door?.forEach((cell, i) => {
      this.gfx.fillStyle(DOOR_COLOR, 1);
      this.gfx.fillRoundedRect(cell.x * CELL_SIZE + 1, cell.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
      this.questionLabels.push(
        this.add
          .text(cell.x * CELL_SIZE + CELL_SIZE / 2, cell.y * CELL_SIZE + CELL_SIZE / 2, ANSWER_DOOR_WORD[i], {
            fontFamily: LABEL_FONT,
            fontSize: `${CELL_SIZE - 10}px`,
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5),
      );
    });
  }

  /** A points badge drawn over the board (rebuilt with the question's other labels each render). */
  private pointsLabel(text: string, color: string, stroke: string, size: number): Phaser.GameObjects.Text {
    const label = this.add
      .text(0, 0, text, { fontFamily: LABEL_FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke, strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(3);
    this.questionLabels.push(label);
    return label;
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
      } else if (this.shimmering) {
        color = GOLDEN_SHIMMER[(i + Math.floor(this.time.now / 120)) % GOLDEN_SHIMMER.length];
      } else if (this.snake.isPoisoned) {
        color = POISONED_COLORS[(i + Math.floor(this.time.now / 150)) % POISONED_COLORS.length];
        wobble = Math.sin(this.time.now / 120 + i) * 2;
      }
      // The golden dance: a wave running down the body.
      if (this.dancing && !isDead) wobble = Math.sin(this.time.now / 70 - i * 0.9) * 5;

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

      if (this.shimmering && !isDead && (i + Math.floor(this.time.now / 200)) % 4 === 0) {
        const sx = cellX + CELL_SIZE / 2 + wobble;
        const sy = cellY + CELL_SIZE / 2 - wobble;
        const arm = CELL_SIZE * 0.22;
        target.lineStyle(2, SPARKLE_COLOR, 1);
        target.lineBetween(sx - arm, sy, sx + arm, sy);
        target.lineBetween(sx, sy - arm, sx, sy + arm);
      }

      if (isTaper && !isDead && !this.snake.isPoisoned && !this.shimmering) {
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

  /**
   * Apples and poison apples are drawn with the same apple shape the
   * answer room uses (appleArt.ts); science items keep their topic emoji.
   */
  private renderItems(): void {
    const seen = new Set<string>();
    for (const item of this.items) {
      const cx = item.position.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = item.position.y * CELL_SIZE + CELL_SIZE / 2;
      if (item.type === "apple" || item.type === "poison-apple") {
        drawApple(this.gfx, cx, cy, CELL_SIZE, item.type === "apple" ? APPLE_RED : APPLE_POISON);
        continue;
      }
      const key = `${item.position.x},${item.position.y}`;
      seen.add(key);
      const label = (item.questionId && scienceQuestionsById[item.questionId]?.icon) || "❓";
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
