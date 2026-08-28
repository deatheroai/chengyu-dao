import { idioms } from "../idioms/idioms";
import { createRng, seedFromString, randInt } from "./seededRandom";

/**
 * Idioms eligible for the door/balloon/match mechanics: a level needs 4
 * *distinct* characters per idiom (see levelContent.ts's buildLevel doc
 * comment — a repeated glyph would mean two physically different tiles
 * sharing one character where only one "counts" at a time, a real design
 * question of its own). Of the 15 approved idioms in idioms.ts, three
 * repeat a character (一心一意, 有始有终, 相亲相爱) and are excluded here;
 * the other 12 all qualify.
 */
export const ELIGIBLE_IDIOM_IDS: string[] = idioms
  .filter((idiom) => {
    const chars = Array.from(idiom.hanzi);
    return new Set(chars).size === chars.length;
  })
  .map((idiom) => idiom.id);

/** How many idioms make up one door/balloon/match session. */
export const IDIOMS_PER_SESSION = 3;

function fisherYatesShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks `count` distinct idiom ids from `ELIGIBLE_IDIOM_IDS`, seeded by
 * `seed` — same seed always produces the same set (this project's usual
 * "a fixed seed is the authored content" approach, same as
 * levelContent.ts/balloonLevelContent.ts), so a test importing this
 * module gets exactly what a browser evaluating the same module at the
 * same moment would show. Safe against `matchLevelContent.ts`'s
 * first-half/last-half ambiguity guard for *any* subset, since
 * `sessionIdioms.test.ts` confirms the whole eligible pool is already
 * collision-free — no need to retry or special-case a bad draw here.
 */
export function pickSessionIdiomIds(seed: string, count: number = IDIOMS_PER_SESSION): string[] {
  const rng = createRng(seedFromString(seed));
  return fisherYatesShuffle(ELIGIBLE_IDIOM_IDS, rng).slice(0, count);
}

/** Today's UTC calendar date as `YYYY-MM-DD` — the seed for which idioms
 * this session draws. Rotating by calendar day (rather than per page
 * load) means a Playwright test importing this module and the browser
 * page it drives, evaluated moments apart on the same machine, always
 * land on the same day string and therefore the same selection — real
 * page-load randomness would make the two diverge, since each side
 * would call `Math.random()` independently. It also means a child
 * replaying the game later the same day keeps seeing the same 3 idioms
 * they started with, and gets a fresh 3 (drawn from the same pool of 12)
 * the next day. */
export function todaySeedString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** This session's idiom set — the one source of truth `levelContent.ts`
 * (door levels), `balloonLevelContent.ts` (balloon levels), and
 * `matchLevelContent.ts` (the warm-up) all build from, so the three
 * stages always agree on which idioms today's session covers. */
export const sessionIdiomIds: string[] = pickSessionIdiomIds(todaySeedString());
