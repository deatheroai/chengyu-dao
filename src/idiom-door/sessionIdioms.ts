import { idioms } from "../idioms/idioms";
import { createRng, seedFromString, randInt } from "./seededRandom";

/**
 * Every approved idiom's id — the pool the door/balloon/match mechanics
 * draw a session's idioms from. Used to exclude the three idioms that
 * repeat a character (一心一意, 有始有终, 相亲相爱), back when
 * `levelContent.ts`'s door puzzle matched a caught tile against a
 * pre-baked position index — a repeated glyph produced two tiles that
 * looked identical on screen but were tagged for different positions,
 * so grabbing the exact glyph asked for could still read as "wrong".
 * 2026-09-09: `orderedCatchProgress.ts`'s `attemptGrab` now matches a
 * caught tile by its glyph against the *next needed* character instead
 * of a baked-in index, so a repeated glyph just satisfies whichever
 * occurrence is still outstanding — nothing left to exclude here.
 */
export const ELIGIBLE_IDIOM_IDS: string[] = idioms.map((idiom) => idiom.id);

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
 * (door levels) and `balloonLevelContent.ts` (balloon levels) both build
 * from, so those two stages always agree on which idioms today's
 * session covers. 2026-09-08 ("milestone-only matching"): the matching
 * mechanic (`matchLevelContent.ts`'s `buildMatchLevel`) no longer draws
 * from this at all — it's milestone-finale-only now, built instead from
 * whichever idioms `shared/matchMilestoneHistory.ts`'s
 * `pendingMatchMilestone` says are due, which can span many sessions'
 * worth of `sessionIdiomIds`, not just this one's. Draws from a dev-only
 * reroll override when one's set (see DEV_SEED_OVERRIDE_KEY above),
 * falling back to the normal once-a-day rotation otherwise. */
export const sessionIdiomIds: string[] = pickSessionIdiomIds(readDevSeedOverride() ?? todaySeedString());
