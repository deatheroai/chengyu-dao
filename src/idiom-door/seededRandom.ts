/**
 * A small deterministic PRNG (mulberry32) — used to give each level's
 * layout an organic, jumbled feel (varied positions/heights/angles,
 * per your 2026-08-23 feedback that the neat repeated-block layout felt
 * boring) while keeping the *content* itself fixed and reproducible,
 * same "real authored content, not runtime randomness" approach as the
 * rest of this project. The same seed always produces the same level,
 * so it's exactly as testable as a hand-placed layout.
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

/** Deterministic string → 32-bit seed, so a level can be seeded by its
 * idiom id rather than a magic number. */
export function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** A random number in [min, max). */
export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** A random integer in [min, max]. */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}
