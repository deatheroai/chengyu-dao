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

/**
 * `thresholdRatio` defaults to the real `SUFFOCATION_THRESHOLD_RATIO`
 * (192 unresolved questions on a 384-cell board) — sized for an actual
 * multi-minute play session, same as `hasWon`'s own `winLength` default.
 * Only science-snake's own e2e suite ever passes a smaller override, to
 * exercise this exact predicate (and the real lose-card/scoring path it
 * triggers) without replaying a full session's worth of wrong answers
 * first — the shipped game never does.
 */
export function isSuffocating(boardItems: BoardItem[], thresholdRatio: number = SUFFOCATION_THRESHOLD_RATIO): boolean {
  const scienceItemCount = boardItems.filter((item) => item.type === "science").length;
  return scienceItemCount / TOTAL_CELLS >= thresholdRatio;
}
