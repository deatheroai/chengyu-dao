import type { MatchTile } from "./matchLevelContent";

export interface MatchProgressState {
  selectedTileId: string | null;
  matchedTileIds: string[];
}

export function initialMatchProgressState(): MatchProgressState {
  return { selectedTileId: null, matchedTileIds: [] };
}

export type MatchOutcome = "selected" | "deselected" | "matched" | "wrong" | "ignored";

export interface MatchSelectResult {
  state: MatchProgressState;
  outcome: MatchOutcome;
  /** The two tile ids just compared — present for "matched" and
   * "wrong" only, so the scene knows which pair to animate without
   * having to remember the previous selection itself. */
  pair?: [string, string];
}

/**
 * Pure state transition for one tile tap. Mirrors
 * balloonCatchProgress.ts's shape (a state + outcome pair a Phaser
 * scene can act on without owning any game logic itself), but this
 * puzzle needs a "first pick, then second pick" two-step instead of a
 * single catch — closer in spirit to a classic memory-match game.
 *
 * A tile that's already part of a matched pair is inert (`"ignored"`):
 * tapping it again neither selects nor unselects anything. Tapping the
 * currently-selected tile again deselects it (`"deselected"`) — a
 * cheap-to-support "changed my mind" escape hatch, not something a
 * child *has* to discover, but harmless to allow.
 */
export function selectTile(state: MatchProgressState, tileId: string, tiles: MatchTile[]): MatchSelectResult {
  if (state.matchedTileIds.includes(tileId)) {
    return { state, outcome: "ignored" };
  }

  if (state.selectedTileId === tileId) {
    return { state: { ...state, selectedTileId: null }, outcome: "deselected" };
  }

  if (state.selectedTileId === null) {
    return { state: { ...state, selectedTileId: tileId }, outcome: "selected" };
  }

  const first = tiles.find((t) => t.id === state.selectedTileId);
  const second = tiles.find((t) => t.id === tileId);
  // Defensive only — every real call site passes the same `tiles` list
  // a tile id actually came from, so these should always resolve.
  if (!first || !second) {
    return { state: { ...state, selectedTileId: null }, outcome: "wrong" };
  }

  const isMatch = first.idiomId === second.idiomId && first.half !== second.half;
  if (isMatch) {
    return {
      state: { selectedTileId: null, matchedTileIds: [...state.matchedTileIds, first.id, second.id] },
      outcome: "matched",
      pair: [first.id, second.id],
    };
  }

  return { state: { ...state, selectedTileId: null }, outcome: "wrong", pair: [first.id, second.id] };
}

export function isMatchLevelComplete(state: MatchProgressState, tiles: MatchTile[]): boolean {
  return state.matchedTileIds.length === tiles.length;
}
