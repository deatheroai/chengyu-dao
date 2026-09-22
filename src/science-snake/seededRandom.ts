/**
 * A small deterministic PRNG (mulberry32) — same implementation as
 * `idiom-door/seededRandom.ts`, deliberately duplicated rather than
 * imported: science-snake is a completely independent game (see
 * DECISIONS.md's 2026-09-16 resolution), so it doesn't reach into
 * idiom-door's own source tree for a generic utility, small as this one
 * is. Used by itemSpawner.ts for reproducible item placement/poison
 * rolls — same seed always produces the same sequence, so spawning is
 * exactly as testable as a hand-placed layout.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
