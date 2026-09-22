import { describe, it, expect } from "vitest";
import { chunkWords, revealedText, isFullyRevealed, nextRevealedCount } from "./chunkWords";

describe("chunkWords", () => {
  it("splits into groups of 3 words by default", () => {
    expect(chunkWords("the ice melted because it warmed up")).toEqual(["the ice melted", "because it warmed", "up"]);
  });

  it("supports a custom chunk size", () => {
    expect(chunkWords("a b c d e", 2)).toEqual(["a b", "c d", "e"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(chunkWords("")).toEqual([]);
    expect(chunkWords("   ")).toEqual([]);
  });

  it("returns one chunk when the whole text is shorter than the chunk size", () => {
    expect(chunkWords("just two")).toEqual(["just two"]);
  });

  it("collapses extra whitespace between words", () => {
    expect(chunkWords("a   b\tc  d")).toEqual(["a b c", "d"]);
  });
});

describe("revealedText / isFullyRevealed / nextRevealedCount", () => {
  const chunks = chunkWords("the ice melted because it warmed up");

  it("revealedText joins only the chunks revealed so far", () => {
    expect(revealedText(chunks, 0)).toBe("");
    expect(revealedText(chunks, 1)).toBe("the ice melted");
    expect(revealedText(chunks, 2)).toBe("the ice melted because it warmed");
    expect(revealedText(chunks, 3)).toBe("the ice melted because it warmed up");
  });

  it("isFullyRevealed is false until every chunk has been shown", () => {
    expect(isFullyRevealed(chunks, 0)).toBe(false);
    expect(isFullyRevealed(chunks, 2)).toBe(false);
    expect(isFullyRevealed(chunks, 3)).toBe(true);
  });

  it("nextRevealedCount advances by one chunk at a time", () => {
    expect(nextRevealedCount(chunks, 0)).toBe(1);
    expect(nextRevealedCount(chunks, 1)).toBe(2);
  });

  it("nextRevealedCount never exceeds the total chunk count", () => {
    expect(nextRevealedCount(chunks, 3)).toBe(3);
    expect(nextRevealedCount(chunks, 10)).toBe(3);
  });
});
