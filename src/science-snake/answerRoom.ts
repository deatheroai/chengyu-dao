import type { Direction, Position } from "./snakeGrid";
import { changeDirection, type SnakeState } from "./snakeGrid";

/**
 * Pure rules for the answer room (BACKLOG.md's "Redesign: question
 * apples, ANSWER door + answer room" entry): a small separate board
 * where the child eats symbol apples in sentence order. Same
 * pure-function-plus-thin-Scene split as snakeGrid.ts —
 * `AnswerRoomScene.ts` only calls these on a tick and draws the result.
 *
 * The room has its own size, so it can't reuse snakeGrid.ts's `step`
 * (which wraps against the main board's 16×24). The room snake also
 * never grows — at a fixed length of 3 it can't run into itself, so
 * the child can't lose in here; only the order of what they eat
 * matters.
 */

export const ROOM_WIDTH = 8;
export const ROOM_HEIGHT = 10;
export const ROOM_TICK_MS = 300;
export const ROOM_SNAKE_LENGTH = 3;

/**
 * The QUESTION door: a 2×2 wooden door in the bottom-right corner,
 * drawn with a big "Q" and a ↩ back arrow (AnswerRoomScene.ts) rather
 * than the whole word, so it reads as a door at a glance. Running into
 * any of its four cells goes back to reread.
 */
export const QUESTION_DOOR_CELLS: Position[] = [
  { x: ROOM_WIDTH - 2, y: ROOM_HEIGHT - 2 },
  { x: ROOM_WIDTH - 1, y: ROOM_HEIGHT - 2 },
  { x: ROOM_WIDTH - 2, y: ROOM_HEIGHT - 1 },
  { x: ROOM_WIDTH - 1, y: ROOM_HEIGHT - 1 },
];

/** Joining words always get the same colour and pre-coloured slot, so the child learns to spot where they go. */
export const JOINING_WORDS = ["because", "so", "and", "but"];

export function isJoiningPhrase(phrase: string): boolean {
  return JOINING_WORDS.includes(phrase.trim().toLowerCase().replace(/[.,!?]/g, ""));
}

export interface AnswerRoomContent {
  /** The correct sentence, in order, one phrase per apple. */
  phrases: string[];
  /** One grammatical but scientifically wrong phrase — the one real science choice. */
  wrongPhrase: string;
}

export interface SymbolStyle {
  glyph: string;
  /** CSS colour, also parsed into a Phaser fill by the scene. */
  color: string;
}

/**
 * Shapes as well as colours, so the symbols still tell apart for a
 * colour-blind child. `︎` asks for the plain text glyph — without
 * it, phones tend to draw ♥ as a red emoji and lose the chosen colour.
 */
export const PHRASE_SYMBOLS: SymbolStyle[] = [
  { glyph: "★", color: "#d93838" },
  { glyph: "▲", color: "#2f7fd6" },
  { glyph: "◆", color: "#8a4fd8" },
  { glyph: "■", color: "#2f9e57" },
  { glyph: "♥︎", color: "#e0529c" },
  { glyph: "✚", color: "#1b9aa6" },
  { glyph: "⬟", color: "#6b6f2a" },
];
/** Orange is kept for joining words only — no other phrase ever gets it. */
export const JOINING_SYMBOL: SymbolStyle = { glyph: "●", color: "#f08a1c" };

/** `phraseIndex` is the phrase's place in the sentence, or null for the wrong phrase. */
export interface KeyEntry {
  phraseIndex: number | null;
  text: string;
  symbol: SymbolStyle;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Gives every phrase (and the wrong one) its symbol, and returns the
 * key mixed up — the child works out the order themselves. Symbols are
 * shuffled too, so ★ doesn't always mean "first".
 */
export function buildKey(content: AnswerRoomContent, rng: () => number): KeyEntry[] {
  const symbols = shuffle(PHRASE_SYMBOLS, rng);
  let next = 0;
  const entries: KeyEntry[] = content.phrases.map((text, phraseIndex) => ({
    phraseIndex,
    text,
    symbol: isJoiningPhrase(text) ? JOINING_SYMBOL : symbols[next++ % symbols.length],
  }));
  entries.push({ phraseIndex: null, text: content.wrongPhrase, symbol: symbols[next % symbols.length] });
  return shuffle(entries, rng);
}

export interface RoomApple {
  /** Same as the KeyEntry it stands for. */
  phraseIndex: number | null;
  position: Position;
}

/** Starts on the left, heading right, well away from the door in the bottom-right corner. */
export function createRoomSnake(): SnakeState {
  const head = { x: 2, y: Math.floor(ROOM_HEIGHT / 2) - 1 };
  const body: Position[] = [];
  for (let i = 0; i < ROOM_SNAKE_LENGTH; i++) body.push({ x: head.x - i, y: head.y });
  return { body, direction: "right", owedGrowth: 0, isPoisoned: false };
}

function isDoorCell(position: Position): boolean {
  return QUESTION_DOOR_CELLS.some((cell) => cell.x === position.x && cell.y === position.y);
}

/**
 * Scatters one apple per still-unplaced phrase, plus the wrong one.
 * Apples are kept off and away from the door (so going for an apple
 * never sends the child through it by accident), off the snake and the few cells
 * straight ahead of it (so re-entering never lands on an apple before
 * the child has steered), and never touching each other — on a small
 * board a child aiming for one apple shouldn't clip its neighbour.
 */
export function placeApples(
  key: KeyEntry[],
  placedCount: number,
  snake: SnakeState,
  rng: () => number,
): RoomApple[] {
  const wanted = key.filter((entry) => entry.phraseIndex === null || entry.phraseIndex >= placedCount);
  const head = snake.body[0];
  const blocked = (p: Position): boolean =>
    QUESTION_DOOR_CELLS.some((c) => Math.abs(c.x - p.x) <= 1 && Math.abs(c.y - p.y) <= 1) ||
    snake.body.some((s) => s.x === p.x && s.y === p.y) ||
    (p.y === head.y && p.x > head.x && p.x <= head.x + 3);

  const free: Position[] = [];
  for (let y = 0; y < ROOM_HEIGHT; y++) {
    for (let x = 0; x < ROOM_WIDTH; x++) {
      if (!blocked({ x, y })) free.push({ x, y });
    }
  }

  const apples: RoomApple[] = [];
  for (const cell of shuffle(free, rng)) {
    if (apples.length === wanted.length) break;
    const touches = apples.some((a) => Math.abs(a.position.x - cell.x) <= 1 && Math.abs(a.position.y - cell.y) <= 1);
    if (!touches) apples.push({ phraseIndex: wanted[apples.length].phraseIndex, position: cell });
  }
  return apples;
}

export function roomChangeDirection(snake: SnakeState, requested: Direction): SnakeState {
  return changeDirection(snake, requested);
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
  | { kind: "placed"; phraseIndex: number; placedCount: number }
  | { kind: "complete"; placedCount: number }
  /** Out of order, or the wrong science phrase. Placed phrases are kept — the punishment lands on the snake, not the sentence. */
  | { kind: "thrown-out"; reason: "out-of-order" | "wrong-phrase"; placedCount: number };

/** What the head's current cell means, given how much of the sentence is already placed. */
export function resolveHead(
  head: Position,
  apples: RoomApple[],
  placedCount: number,
  totalPhrases: number,
): { event: RoomEvent; apples: RoomApple[] } {
  if (isDoorCell(head)) return { event: { kind: "question-door" }, apples };

  const index = apples.findIndex((a) => a.position.x === head.x && a.position.y === head.y);
  if (index === -1) return { event: { kind: "none" }, apples };

  const apple = apples[index];
  const remaining = apples.filter((_, i) => i !== index);
  if (apple.phraseIndex === null) {
    return { event: { kind: "thrown-out", reason: "wrong-phrase", placedCount }, apples: remaining };
  }
  if (apple.phraseIndex !== placedCount) {
    return { event: { kind: "thrown-out", reason: "out-of-order", placedCount }, apples: remaining };
  }
  const newCount = placedCount + 1;
  if (newCount === totalPhrases) return { event: { kind: "complete", placedCount: newCount }, apples: remaining };
  return { event: { kind: "placed", phraseIndex: apple.phraseIndex, placedCount: newCount }, apples: remaining };
}
