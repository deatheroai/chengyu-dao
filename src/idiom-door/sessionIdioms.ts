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

/** 2026-09-07: a dev-only escape hatch from the once-a-day rotation
 * above — great for a real child (same 3 idioms all day, a fresh 3 the
 * next day), tedious for a tester replaying the game many times in one
 * sitting ("I am getting bored testing on these three idioms"). When
 * main.ts's dev-reroll-idioms-btn has written a seed here, it wins over
 * todaySeedString for *this browser only* — nothing in the shipped game
 * ever writes to this key on its own, so a real child's session is
 * never affected. */
const DEV_SEED_OVERRIDE_KEY = "chengyu-dao-dev-idiom-seed-override";

/** Best-effort localStorage read/write, matching shared/sessionHistory.ts's
 * own unguarded localStorage calls elsewhere in this project — except
 * this key is a dev-only nicety, not real save data, so a storage error
 * (privacy mode, quota) should just silently fall back to normal
 * behavior rather than ever crashing the page over it. */
function readDevSeedOverride(): string | null {
  try {
    return localStorage.getItem(DEV_SEED_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

/** Dev-only: picks a new random idiom set for this browser (main.ts's
 * dev-reroll-idioms-btn), overriding the normal daily rotation until
 * `clearDevIdiomSeedOverride` is called — see DEV_SEED_OVERRIDE_KEY's
 * doc comment above. Takes effect on the next page load/reload, same as
 * every other dev control in this game. */
export function setDevIdiomSeedOverride(seed: string = String(Date.now())): void {
  try {
    localStorage.setItem(DEV_SEED_OVERRIDE_KEY, seed);
  } catch {
    // Best-effort — see readDevSeedOverride's doc comment.
  }
}

/** Dev-only: clears the reroll override above, so the next reload goes
 * back to normal date-based rotation. Wired into main.ts's existing
 * "Clear history" dev control (alongside its own resurface-history
 * reset) so one button gets a tester fully back to a normal, fresh
 * state instead of leaving them permanently stuck on a rerolled set
 * they forgot they set. */
export function clearDevIdiomSeedOverride(): void {
  try {
    localStorage.removeItem(DEV_SEED_OVERRIDE_KEY);
  } catch {
    // Best-effort — see readDevSeedOverride's doc comment.
  }
}

/** This session's idiom set — the one source of truth `levelContent.ts`
 * (door levels), `balloonLevelContent.ts` (balloon levels), and
 * `matchLevelContent.ts` (the warm-up) all build from, so the three
 * stages always agree on which idioms today's session covers. Draws
 * from a dev-only reroll override when one's set (see
 * DEV_SEED_OVERRIDE_KEY above), falling back to the normal
 * once-a-day rotation otherwise. */
export const sessionIdiomIds: string[] = pickSessionIdiomIds(readDevSeedOverride() ?? todaySeedString());
