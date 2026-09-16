/**
 * Pure word-chunk reveal for the science-snake question overlay
 * (BACKLOG.md's "Hint + word-chunk reveal" entry): after a second wrong
 * try, the model answer is revealed a few words at a time via repeated
 * taps rather than dumped all at once, per your "reveal three words at
 * a time... to enforce reading instead of skipping away." Pure state
 * math only — the overlay owns the actual tap handling/DOM.
 */

export const REVEAL_CHUNK_SIZE = 3;

/** Splits text into consecutive word groups of `size` (default 3) — the last chunk may be shorter. */
export function chunkWords(text: string, size = REVEAL_CHUNK_SIZE): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

/** The text revealed so far, given how many chunks have been shown. */
export function revealedText(chunks: string[], revealedCount: number): string {
  return chunks.slice(0, Math.max(0, revealedCount)).join(" ");
}

/** Whether every chunk has been shown — this is what gates the overlay's "Continue" button into existing. */
export function isFullyRevealed(chunks: string[], revealedCount: number): boolean {
  return revealedCount >= chunks.length;
}

/** One "Next →" tap's worth of reveal progress, capped at the total chunk count. */
export function nextRevealedCount(chunks: string[], revealedCount: number): number {
  return Math.min(revealedCount + 1, chunks.length);
}
