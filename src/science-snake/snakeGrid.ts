/**
 * Pure snake grid/movement/growth core (BACKLOG.md's "Snake grid/
 * movement/growth core" entry). Movement, growth, and both collision
 * lose-conditions live here as plain data transforms — no rendering, no
 * timers, no DOM — same pure-function-plus-thin-Scene split every other
 * mechanic in this project keeps; `SnakeGameScene.ts` (not yet built)
 * will just call `step`/`changeDirection`/the `apply*Eaten` functions on
 * a tick loop and render whatever comes back.
 */

export interface Position {
  x: number;
  y: number;
}

export type Direction = "up" | "down" | "left" | "right";

export interface SnakeState {
  /** `body[0]` is the head. */
  body: Position[];
  direction: Direction;
  /** Ticks of pending growth — the tail simply isn't popped for this many future moves, so growth always trails along the path actually travelled rather than teleporting segments onto the board. */
  owedGrowth: number;
  /** Set once by a poison apple (see applyPoisonAppleEaten) and never cleared for the rest of the run. */
  isPoisoned: boolean;
}

/**
 * Portrait orientation (16 wide × 24 tall, same 384 total cells) — per
 * your mobile-friendliness ask: a landscape 24×16 grid rendered as a
 * tiny strip on a portrait phone screen (Phaser's FIT scale is capped
 * by whichever dimension is tighter, and a phone's width is the tight
 * one), while this shape fills a typical phone screen height far
 * better. Still works fine on desktop too — a tall board is a normal
 * shape for a casual browser game, same as classic Tetris/Snake.
 */
export const GRID_WIDTH = 16;
export const GRID_HEIGHT = 24;
export const TOTAL_CELLS = GRID_WIDTH * GRID_HEIGHT;
export const TICK_MS = 180;

export const APPLE_GROWTH = 1;
export const CORRECT_ANSWER_GROWTH = 4;
/** Once poisoned, every normal apple grows the snake by this many times as much — permanent for the rest of the run, confirmed in DECISIONS.md. */
export const POISON_GROWTH_MULTIPLIER = 4;

export const WIN_LENGTH_RATIO = 0.7;
/** Not literal 100% — a free-moving snake can't realistically occupy every last cell without a Hamiltonian-path route. At 70% the board reads as visually full. */
export const WIN_LENGTH = Math.round(TOTAL_CELLS * WIN_LENGTH_RATIO);

const DIRECTION_DELTA: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

/** A straight-line starting body of `length` cells, trailing backwards from `head` along `direction`. */
export function createInitialSnake(head: Position, direction: Direction, length = 3): SnakeState {
  const delta = DIRECTION_DELTA[direction];
  const body: Position[] = [];
  for (let i = 0; i < length; i++) {
    body.push({ x: head.x - delta.x * i, y: head.y - delta.y * i });
  }
  return { body, direction, owedGrowth: 0, isPoisoned: false };
}

export function nextHeadPosition(head: Position, direction: Direction): Position {
  const delta = DIRECTION_DELTA[direction];
  return { x: head.x + delta.x, y: head.y + delta.y };
}

export function isOutOfBounds(position: Position): boolean {
  return position.x < 0 || position.x >= GRID_WIDTH || position.y < 0 || position.y >= GRID_HEIGHT;
}

/** Ignores a direct reversal (e.g. up → down) — the classic Snake rule against instantly doubling back into your own neck. Any other requested direction (including the current one) is accepted as-is. */
export function changeDirection(state: SnakeState, requested: Direction): SnakeState {
  if (requested === OPPOSITE_DIRECTION[state.direction]) return state;
  return { ...state, direction: requested };
}

function clampOwedGrowth(currentLength: number, owedGrowth: number): number {
  return Math.max(0, Math.min(owedGrowth, TOTAL_CELLS - currentLength));
}

function addOwedGrowth(state: SnakeState, amount: number): SnakeState {
  return { ...state, owedGrowth: clampOwedGrowth(state.body.length, state.owedGrowth + amount) };
}

/** A normal apple: +1 growth, or `POISON_GROWTH_MULTIPLIER`x that once poisoned. */
export function applyAppleEaten(state: SnakeState): SnakeState {
  const growth = state.isPoisoned ? APPLE_GROWTH * POISON_GROWTH_MULTIPLIER : APPLE_GROWTH;
  return addOwedGrowth(state, growth);
}

/** A correctly-answered science question: always +CORRECT_ANSWER_GROWTH, untouched by isPoisoned either way. */
export function applyCorrectAnswerEaten(state: SnakeState): SnakeState {
  return addOwedGrowth(state, CORRECT_ANSWER_GROWTH);
}

/**
 * A poison apple: sets owed-growth to the snake's *current* length (so
 * it roughly doubles as it keeps moving, same owed-growth mechanic as
 * everything else — not an instant on-the-spot append, since there's no
 * valid board position to place that many segments into at once) and
 * flips `isPoisoned` on permanently.
 */
export function applyPoisonAppleEaten(state: SnakeState): SnakeState {
  const doubled = addOwedGrowth(state, state.body.length);
  return { ...doubled, isPoisoned: true };
}

export type MoveResult =
  | { outcome: "moved"; snake: SnakeState }
  | { outcome: "wall-collision" }
  | { outcome: "self-collision" };

/**
 * Advances the snake by one grid cell in its current direction. Two
 * lose conditions live here: running off the grid, and running into its
 * own body — the classic Snake rule, made explicit per the poison-apple
 * follow-up (BACKLOG.md), since a sudden growth spurt shrinking the
 * snake's own safe maneuvering room is only dangerous because this
 * check exists. Moving onto the *current* tail cell is only a collision
 * when the snake is also growing this tick (owed growth pending) —
 * otherwise the tail vacates that cell in the same move, the same
 * "well, the tail's about to not be there" nuance every real Snake
 * implementation needs to get right.
 */
export function step(state: SnakeState): MoveResult {
  const head = state.body[0];
  const newHead = nextHeadPosition(head, state.direction);
  if (isOutOfBounds(newHead)) return { outcome: "wall-collision" };

  const willGrow = state.owedGrowth > 0;
  const bodyForCollisionCheck = willGrow ? state.body : state.body.slice(0, -1);
  const collided = bodyForCollisionCheck.some((segment) => segment.x === newHead.x && segment.y === newHead.y);
  if (collided) return { outcome: "self-collision" };

  const newBody = [newHead, ...(willGrow ? state.body : state.body.slice(0, -1))];
  return {
    outcome: "moved",
    snake: { ...state, body: newBody, owedGrowth: willGrow ? state.owedGrowth - 1 : 0 },
  };
}

export function hasWon(state: SnakeState): boolean {
  return state.body.length >= WIN_LENGTH;
}
