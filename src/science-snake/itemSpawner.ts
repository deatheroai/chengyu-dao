import type { Position } from "./snakeGrid";
import { GRID_WIDTH, GRID_HEIGHT } from "./snakeGrid";

/**
 * Pure item spawning for the science-snake board (BACKLOG.md's "Item
 * spawner + suffocation predicate" entry). Board-item placement and the
 * apple/science mix live here as plain data transforms — position
 * picking takes an injectable RNG (`seededRandom.ts`'s `createRng`), so
 * every spawn decision is exactly as reproducible/testable as a
 * hand-placed layout, same approach `idiom-door`'s own level generation
 * takes.
 */

export type BoardItemType = "apple" | "poison-apple" | "science";

export interface BoardItem {
  position: Position;
  type: BoardItemType;
  /** Only set for `"science"` items — which question this item represents. */
  questionId?: string;
}

/** ~10% of spawned apples roll poison instead — see snakeGrid.ts's applyPoisonAppleEaten for what eating one actually does. */
export const POISON_APPLE_CHANCE = 0.1;

/** Target steady-state ratio of science items to apples on the board at once — "~1 science item per 3-4 apples on board" per BACKLOG.md. */
export const SCIENCE_TO_APPLE_RATIO = 1 / 3.5;

/** How many replacement science items a wrong-twice ("indigestion") spawns instead of just clearing the one — starting number, tune after playtest, same as every constant in this project. */
export const INDIGESTION_SPAWN_COUNT = 3;

function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}

/** Every grid cell not currently occupied by the snake or another item. */
export function freeCells(occupied: Position[]): Position[] {
  const occupiedSet = new Set(occupied.map(positionKey));
  const free: Position[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (!occupiedSet.has(positionKey({ x, y }))) free.push({ x, y });
    }
  }
  return free;
}

/** A uniformly random free cell, or `null` if the board is completely full (shouldn't happen in real play — suffocation.ts's threshold triggers game over well before every cell fills). */
export function pickRandomFreeCell(occupied: Position[], rng: () => number): Position | null {
  const free = freeCells(occupied);
  if (free.length === 0) return null;
  return free[Math.floor(rng() * free.length)];
}

/**
 * Which item type to spawn next to keep the board's science:apple ratio
 * near `SCIENCE_TO_APPLE_RATIO`. Deliberately a direct ratio check
 * rather than a probabilistic roll — this is normal steady-state
 * spawning (apple eaten → spawn a replacement, correct answer → spawn a
 * replacement), not the indigestion pile-on below, which bypasses this
 * entirely by design.
 */
export function pickNextItemType(applesOnBoard: number, scienceItemsOnBoard: number): "apple" | "science" {
  if (applesOnBoard === 0) return "apple";
  return scienceItemsOnBoard / applesOnBoard < SCIENCE_TO_APPLE_RATIO ? "science" : "apple";
}

/** A normal or poison apple (per POISON_APPLE_CHANCE) at a random free cell, or `null` if the board is full. */
export function spawnApple(occupied: Position[], rng: () => number): BoardItem | null {
  const cell = pickRandomFreeCell(occupied, rng);
  if (!cell) return null;
  const isPoison = rng() < POISON_APPLE_CHANCE;
  return { position: cell, type: isPoison ? "poison-apple" : "apple" };
}

/** A science item tied to `questionId` at a random free cell, or `null` if the board is full. */
export function spawnScienceItem(occupied: Position[], questionId: string, rng: () => number): BoardItem | null {
  const cell = pickRandomFreeCell(occupied, rng);
  if (!cell) return null;
  return { position: cell, type: "science", questionId };
}

/** Picks a question id not already active on the board, so the same question can't be sitting in two places at once — falls back to allowing a repeat only once every available question is already active, rather than refusing to spawn at all. */
export function pickNextQuestionId(availableIds: string[], activeIds: string[], rng: () => number): string | null {
  const notActive = availableIds.filter((id) => !activeIds.includes(id));
  const pool = notActive.length > 0 ? notActive : availableIds;
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * The "indigestion" pile-on (BACKLOG.md: "spawns several replacement
 * science items instead of just clearing the one, so repeated misses
 * snowball risk"). Bypasses `pickNextItemType`'s ratio entirely — this
 * is the deliberate risk spike, not steady-state spawning. Places as
 * many of `questionIds` as the board has free cells for, stopping early
 * (rather than throwing) if the board fills up mid-spawn.
 */
export function spawnIndigestionItems(occupied: Position[], questionIds: string[], rng: () => number): BoardItem[] {
  const items: BoardItem[] = [];
  let currentOccupied = occupied;
  for (const questionId of questionIds) {
    const cell = pickRandomFreeCell(currentOccupied, rng);
    if (!cell) break;
    items.push({ position: cell, type: "science", questionId });
    currentOccupied = [...currentOccupied, cell];
  }
  return items;
}
