import type { Position } from "./snakeGrid";
import { GRID_WIDTH, GRID_HEIGHT, TICK_MS } from "./snakeGrid";

/**
 * Pure rules for the main board's question phase (BACKLOG.md's
 * "Redesign: question apples, ANSWER door + answer room" entry). Eating
 * a science item starts it: three numbered apples ①②③ appear, each one
 * eaten in order reveals (and reads aloud) the next third of the
 * question, and after ③ an A-N-S-W-E-R door appears that leads into the
 * answer room. Same pure-function-plus-thin-Scene split as everything
 * else here — SnakeGameScene.ts only calls these.
 */

/** The board slows down while a question is open — reading time, not racing time. */
export const QUESTION_TICK_MS = Math.round(TICK_MS * 1.45);

export const QUESTION_PART_COUNT = 3;
export const ANSWER_DOOR_WORD = "ANSWER";

/** New question apples and the door land at least this far from the head, so nothing is eaten or entered before the child has seen it. */
export const MIN_DISTANCE_FROM_HEAD = 4;

export interface QuestionApple {
  /** 1, 2 or 3. */
  part: number;
  position: Position;
}

function key(p: Position): string {
  return `${p.x},${p.y}`;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Shortest distance between two cells on the wrapping main board. */
export function boardDistance(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.min(dx, GRID_WIDTH - dx) + Math.min(dy, GRID_HEIGHT - dy);
}

/**
 * Three numbered apples on free cells, away from the head and never
 * touching each other (so going for ② can't clip ③ by accident).
 * Returns fewer than three only on an almost-full board.
 */
export function placeQuestionApples(occupied: Position[], head: Position, rng: () => number): QuestionApple[] {
  const taken = new Set(occupied.map(key));
  const cells: Position[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const p = { x, y };
      if (!taken.has(key(p)) && boardDistance(p, head) >= MIN_DISTANCE_FROM_HEAD) cells.push(p);
    }
  }
  const apples: QuestionApple[] = [];
  for (const cell of shuffle(cells, rng)) {
    if (apples.length === QUESTION_PART_COUNT) break;
    if (apples.some((a) => Math.abs(a.position.x - cell.x) <= 1 && Math.abs(a.position.y - cell.y) <= 1)) continue;
    apples.push({ part: apples.length + 1, position: cell });
  }
  return apples;
}

/** Only the next number counts — eating one out of order does nothing (reading is never punished). */
export function isNextPart(revealed: number, part: number): boolean {
  return part === revealed + 1;
}

/**
 * The A-N-S-W-E-R door: six free cells in a row (no wrapping round the
 * edge), all at least `MIN_DISTANCE_FROM_HEAD` from the head and not on
 * the head's own row — so it can't be driven straight into the moment
 * it appears. The rows two above and two below its middle are kept clear
 * too, ready for the golden apples that will sit there. Null if no such
 * spot exists (a very crowded board); the scene tries again next step.
 */
export function placeAnswerDoor(occupied: Position[], head: Position, rng: () => number): Position[] | null {
  const taken = new Set(occupied.map(key));
  const width = ANSWER_DOOR_WORD.length;
  const spots: Position[][] = [];
  for (let y = 2; y < GRID_HEIGHT - 2; y++) {
    if (y === head.y) continue;
    for (let x = 0; x + width <= GRID_WIDTH; x++) {
      const cells = Array.from({ length: width }, (_, i) => ({ x: x + i, y }));
      if (cells.some((c) => taken.has(key(c)) || boardDistance(c, head) < MIN_DISTANCE_FROM_HEAD)) continue;
      const mid = Math.floor(x + width / 2);
      if (taken.has(key({ x: mid, y: y - 2 })) || taken.has(key({ x: mid, y: y + 2 }))) continue;
      spots.push(cells);
    }
  }
  if (spots.length === 0) return null;
  return spots[Math.floor(rng() * spots.length)];
}

export function isOnCells(cells: Position[], p: Position): boolean {
  return cells.some((c) => c.x === p.x && c.y === p.y);
}
