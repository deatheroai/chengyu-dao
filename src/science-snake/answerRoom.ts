import type { Direction, Position } from "./snakeGrid";
import { changeDirection, type SnakeState } from "./snakeGrid";

/**
 * Pure rules for the answer room (BACKLOG.md's "Redesign: question
 * apples, ANSWER door + answer room" entry): a small separate board
 * where the snake eats the answer sentence one word at a time. Same
 * pure-function-plus-thin-Scene split as snakeGrid.ts —
 * `AnswerRoomScene.ts` only calls these on a tick and draws the result.
 *
 * Only one thing is ever on the board: the next word, or — at the
 * sentence's one science choice — two blue apples, A and B. After the
 * last word the QUESTION door goes and a ladder appears to climb out.
 *
 * The room has its own size, so it can't reuse snakeGrid.ts's `step`
 * (which wraps against the main board's 16×24). The room snake never
 * grows — at a fixed length of 3 it can't run into itself.
 */

export const ROOM_WIDTH = 8;
export const ROOM_HEIGHT = 10;
/**
 * Word apples: 300ms a step. Tuned twice by playtest — 600ms was too
 * slow, then 225ms (80% of the main board's speed) felt right on the
 * small prototype board but too fast once the room filled the real
 * game's bigger board ("I would like the snake slower in the answer room
 * too as the board seems so much bigger").
 */
export const WORD_TICK_MS = 300;
/** The A/B choice: the snake only moves while the joystick (or an arrow key) is held, and then at the gentler half speed. */
export const CHOICE_TICK_MS = 600;
/** While waiting for a hold at the choice, how often the scene checks again — short, so a press feels instant. */
export const HOLD_POLL_MS = 80;

/**
 * How the snake moves for the step the sentence is on: on its own at
 * word pace, or — at the science choice — only while held, so the child
 * can stop and think between the two blue apples. After the last word
 * (the climb to the ladder) it's word pace again.
 */
export function paceFor(step: RoomStep | undefined): { holdToMove: boolean; tickMs: number } {
  return step?.kind === "choice" ? { holdToMove: true, tickMs: CHOICE_TICK_MS } : { holdToMove: false, tickMs: WORD_TICK_MS };
}
export const ROOM_SNAKE_LENGTH = 3;

/**
 * The QUESTION door: one cell in the bottom-right corner, drawn as a
 * small wooden door with a "Q" and a ↩ badge (AnswerRoomScene.ts).
 * Running into it asks whether to go back and reread. It was 2×2 until
 * a playtest found the snake kept running into it by accident ("make
 * the door a lot smaller"). It disappears once the sentence is
 * finished, when the ladder takes over.
 */
export const QUESTION_DOOR_CELLS: Position[] = [{ x: ROOM_WIDTH - 1, y: ROOM_HEIGHT - 1 }];

/** The exit ladder, top-left corner, one cell wide and two tall — only there once every word is eaten. */
export const LADDER_CELLS: Position[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
];

/** Joining words always get the same colour in the sentence, so the child learns to spot where they go. */
export const JOINING_WORDS = ["because", "so", "and", "but"];

export function isJoiningPhrase(phrase: string): boolean {
  return JOINING_WORDS.includes(phrase.trim().toLowerCase().replace(/[.,!?]/g, ""));
}

export interface AnswerRoomContent {
  /** The correct sentence in 4 pieces. Every piece but `wrongReplaces` is eaten word by word. */
  phrases: string[];
  /** The scientifically wrong alternative to `phrases[wrongReplaces]` — the one real choice. */
  wrongPhrase: string;
  /** Which piece is the A/B choice. Swapped for `wrongPhrase`, the sentence still reads fine but is wrong. */
  wrongReplaces: number;
}

export type RoomStep =
  | { kind: "word"; text: string }
  | { kind: "choice"; correct: string; wrong: string };

/** The whole sentence as the snake will eat it: single words, with the science choice as one step where it falls. */
export function buildSteps(content: AnswerRoomContent): RoomStep[] {
  const steps: RoomStep[] = [];
  content.phrases.forEach((phrase, i) => {
    if (i === content.wrongReplaces) {
      steps.push({ kind: "choice", correct: phrase, wrong: content.wrongPhrase });
    } else {
      for (const word of phrase.split(/\s+/).filter(Boolean)) steps.push({ kind: "word", text: word });
    }
  });
  return steps;
}

/** A single word apple, or one of the two blue choice apples. */
export type RoomApple =
  | { kind: "word"; text: string; position: Position }
  | { kind: "option"; label: "A" | "B"; text: string; correct: boolean; position: Position };

export function createRoomSnake(): SnakeState {
  const head = { x: 2, y: Math.floor(ROOM_HEIGHT / 2) - 1 };
  const body: Position[] = [];
  for (let i = 0; i < ROOM_SNAKE_LENGTH; i++) body.push({ x: head.x - i, y: head.y });
  return { body, direction: "right", owedGrowth: 0, isPoisoned: false };
}

function sameCell(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Shortest distance between two cells on the wrapping board. */
export function wrapDistance(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.min(dx, ROOM_WIDTH - dx) + Math.min(dy, ROOM_HEIGHT - dy);
}

/** A new apple lands this far from the head: never on top of it, never across the board — each word should be a quick snack. */
export const SPAWN_MIN_DISTANCE = 3;
export const SPAWN_MAX_DISTANCE = 5;

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Cells a new apple may land on: a few steps from the head (so it's
 * never eaten before the child has seen it, and never a trek across
 * the board), off the snake, and off (and not beside) the door and the
 * ladder corner. Falls back to any such cell at any distance if the
 * ring happens to be empty.
 */
function spawnCells(snake: SnakeState): Position[] {
  const near = spawnCellsWithin(snake, SPAWN_MIN_DISTANCE, SPAWN_MAX_DISTANCE);
  return near.length >= 2 ? near : spawnCellsWithin(snake, 1, ROOM_WIDTH + ROOM_HEIGHT);
}

function spawnCellsWithin(snake: SnakeState, minDistance: number, maxDistance: number): Position[] {
  const head = snake.body[0];
  const nearAny = (cells: Position[], p: Position): boolean => cells.some((c) => Math.abs(c.x - p.x) <= 1 && Math.abs(c.y - p.y) <= 1);
  const cells: Position[] = [];
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      const p = { x, y };
      const distance = wrapDistance(head, p);
      if (distance < minDistance || distance > maxDistance) continue;
      if (snake.body.some((s) => sameCell(s, p))) continue;
      if (nearAny(QUESTION_DOOR_CELLS, p) || nearAny(LADDER_CELLS, p)) continue;
      cells.push(p);
    }
  }
  return cells;
}

/**
 * What the board holds for `step`: one word apple, or the two blue
 * choice apples with A/B shuffled (so "A" isn't always right) and never
 * touching, so the child picks one on purpose.
 */
export function spawnStep(step: RoomStep, snake: SnakeState, rng: () => number): RoomApple[] {
  const cells = shuffle(spawnCells(snake), rng);
  if (step.kind === "word") {
    return cells.length ? [{ kind: "word", text: step.text, position: cells[0] }] : [];
  }
  const first = cells[0];
  const second = cells.find((c) => Math.abs(c.x - first.x) > 1 || Math.abs(c.y - first.y) > 1);
  if (!first || !second) return [];
  const correctIsA = rng() < 0.5;
  return [
    { kind: "option", label: "A", text: correctIsA ? step.correct : step.wrong, correct: correctIsA, position: first },
    { kind: "option", label: "B", text: correctIsA ? step.wrong : step.correct, correct: !correctIsA, position: second },
  ];
}

const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };

/** Which way `body[0]` last moved, from its neck — unwrapped across a board edge. Null for a one-cell body. */
function headingOf(body: Position[]): Direction | null {
  if (body.length < 2) return null;
  let dx = body[0].x - body[1].x;
  let dy = body[0].y - body[1].y;
  if (Math.abs(dx) > 1) dx = -Math.sign(dx);
  if (Math.abs(dy) > 1) dy = -Math.sign(dy);
  if (dx === 1) return "right";
  if (dx === -1) return "left";
  if (dy === 1) return "down";
  if (dy === -1) return "up";
  return null;
}

/**
 * A turn in the answer room. Unlike the main board, asking to go
 * straight back the way the snake came turns it around (the tail
 * becomes the head and it carries on from there) instead of being
 * ignored — per "I missed turning the snake many times": every tap
 * should do something, and at a fixed length of 3 the room snake can't
 * run into itself anyway.
 */
export function roomChangeDirection(snake: SnakeState, requested: Direction): SnakeState {
  const heading = headingOf(snake.body) ?? snake.direction;
  if (requested !== OPPOSITE[heading]) return changeDirection(snake, requested);
  const body = [...snake.body].reverse();
  return { ...snake, body, direction: headingOf(body) ?? requested };
}

/** How many quick taps are remembered at once. */
export const MAX_QUEUED_TURNS = 2;

/**
 * Two quick taps inside one step ("up, then left" to go round a corner)
 * used to overwrite each other; now they're queued and the scene applies
 * one per step. A repeat of the last queued turn adds nothing, and past
 * `MAX_QUEUED_TURNS` the oldest is dropped, so a burst of taps can't
 * steer the snake for seconds after the finger has stopped.
 */
export function queueTurn(queue: Direction[], turn: Direction): Direction[] {
  if (queue[queue.length - 1] === turn) return queue;
  return [...queue, turn].slice(-MAX_QUEUED_TURNS);
}

const DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** One move, wrapping at the room's own edges. Fixed length: the tail always follows. */
export function roomStep(snake: SnakeState): SnakeState {
  const head = snake.body[0];
  const delta = DELTA[snake.direction];
  const newHead = {
    x: (((head.x + delta.x) % ROOM_WIDTH) + ROOM_WIDTH) % ROOM_WIDTH,
    y: (((head.y + delta.y) % ROOM_HEIGHT) + ROOM_HEIGHT) % ROOM_HEIGHT,
  };
  return { ...snake, body: [newHead, ...snake.body.slice(0, -1)] };
}

export type RoomEvent =
  | { kind: "none" }
  | { kind: "question-door" }
  | { kind: "ate-word"; text: string }
  | { kind: "chose-right"; text: string }
  /** The snake dies and the sentence starts again from the first word. */
  | { kind: "chose-wrong"; text: string }
  | { kind: "exited" };

/**
 * What the head's cell means. `finished` is true once every step is
 * eaten: the door is gone by then and only the ladder counts.
 */
export function resolveHead(head: Position, apples: RoomApple[], finished: boolean): RoomEvent {
  if (finished) return LADDER_CELLS.some((c) => sameCell(c, head)) ? { kind: "exited" } : { kind: "none" };
  if (QUESTION_DOOR_CELLS.some((c) => sameCell(c, head))) return { kind: "question-door" };
  const apple = apples.find((a) => sameCell(a.position, head));
  if (!apple) return { kind: "none" };
  if (apple.kind === "word") return { kind: "ate-word", text: apple.text };
  return apple.correct ? { kind: "chose-right", text: apple.text } : { kind: "chose-wrong", text: apple.text };
}
