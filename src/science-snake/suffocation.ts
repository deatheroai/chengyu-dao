import type { BoardItem } from "./itemSpawner";
import { TOTAL_CELLS } from "./snakeGrid";

/**
 * Pure lose-condition predicate for a board buried in unresolved
 * questions (BACKLOG.md: "should end early quickly if player fails,
 * i.e. pooped out half the screen"). Deliberately scoped to *unresolved
 * science items specifically*, not general board clutter or the
 * snake's own body — that second kind of danger (self-collision) is
 * `snakeGrid.ts`'s own, separate lose path.
 */
export const SUFFOCATION_THRESHOLD_RATIO = 0.5;

export function isSuffocating(boardItems: BoardItem[]): boolean {
  const scienceItemCount = boardItems.filter((item) => item.type === "science").length;
  return scienceItemCount / TOTAL_CELLS >= SUFFOCATION_THRESHOLD_RATIO;
}
