import { describe, it, expect } from "vitest";
import { initialMatchProgressState, selectTile, isMatchLevelComplete } from "./matchProgress";
import type { MatchTile } from "./matchLevelContent";

const tiles: MatchTile[] = [
  { id: "a-first", text: "一心", pinyin: "yī xīn", idiomId: "a", half: "first" },
  { id: "a-second", text: "一意", pinyin: "yī yì", idiomId: "a", half: "second" },
  { id: "b-first", text: "有始", pinyin: "yǒu shǐ", idiomId: "b", half: "first" },
  { id: "b-second", text: "有终", pinyin: "yǒu zhōng", idiomId: "b", half: "second" },
];

describe("selectTile", () => {
  it("selects the first tap with no prior selection", () => {
    const result = selectTile(initialMatchProgressState(), "a-first", tiles);
    expect(result.outcome).toBe("selected");
    expect(result.state.selectedTileId).toBe("a-first");
    expect(result.state.matchedTileIds).toEqual([]);
  });

  it("deselects when the same tile is tapped again", () => {
    const first = selectTile(initialMatchProgressState(), "a-first", tiles);
    const result = selectTile(first.state, "a-first", tiles);
    expect(result.outcome).toBe("deselected");
    expect(result.state.selectedTileId).toBeNull();
  });

  it("matches two halves of the same idiom", () => {
    const first = selectTile(initialMatchProgressState(), "a-first", tiles);
    const result = selectTile(first.state, "a-second", tiles);
    expect(result.outcome).toBe("matched");
    expect(result.pair).toEqual(["a-first", "a-second"]);
    expect(result.state.matchedTileIds).toEqual(["a-first", "a-second"]);
    expect(result.state.selectedTileId).toBeNull();
  });

  it("matches regardless of pick order (second half first, then first half)", () => {
    const first = selectTile(initialMatchProgressState(), "a-second", tiles);
    const result = selectTile(first.state, "a-first", tiles);
    expect(result.outcome).toBe("matched");
    expect(result.pair).toEqual(["a-second", "a-first"]);
  });

  it("rejects two tiles from different idioms", () => {
    const first = selectTile(initialMatchProgressState(), "a-first", tiles);
    const result = selectTile(first.state, "b-second", tiles);
    expect(result.outcome).toBe("wrong");
    expect(result.pair).toEqual(["a-first", "b-second"]);
    expect(result.state.selectedTileId).toBeNull();
    expect(result.state.matchedTileIds).toEqual([]);
  });

  it("rejects two halves of the same kind from different idioms (both 'first')", () => {
    const first = selectTile(initialMatchProgressState(), "a-first", tiles);
    const result = selectTile(first.state, "b-first", tiles);
    expect(result.outcome).toBe("wrong");
  });

  it("ignores taps on an already-matched tile", () => {
    let state = selectTile(initialMatchProgressState(), "a-first", tiles).state;
    state = selectTile(state, "a-second", tiles).state;
    const result = selectTile(state, "a-first", tiles);
    expect(result.outcome).toBe("ignored");
    expect(result.state).toBe(state);
  });

  it("clears selection after a wrong pair, so the next tap starts fresh", () => {
    const first = selectTile(initialMatchProgressState(), "a-first", tiles);
    const wrong = selectTile(first.state, "b-second", tiles);
    const next = selectTile(wrong.state, "b-first", tiles);
    expect(next.outcome).toBe("selected");
    expect(next.state.selectedTileId).toBe("b-first");
  });
});

describe("isMatchLevelComplete", () => {
  it("is false until every tile is matched", () => {
    let state = initialMatchProgressState();
    expect(isMatchLevelComplete(state, tiles)).toBe(false);
    state = selectTile(state, "a-first", tiles).state;
    state = selectTile(state, "a-second", tiles).state;
    expect(isMatchLevelComplete(state, tiles)).toBe(false);
  });

  it("is true once every tile has been matched", () => {
    let state = initialMatchProgressState();
    state = selectTile(state, "a-first", tiles).state;
    state = selectTile(state, "a-second", tiles).state;
    state = selectTile(state, "b-first", tiles).state;
    state = selectTile(state, "b-second", tiles).state;
    expect(isMatchLevelComplete(state, tiles)).toBe(true);
  });
});
