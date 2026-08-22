import type { IdiomContent } from "../idioms/types";
import { idioms } from "../idioms/idioms";
import { createRng, seedFromString, randRange, randInt } from "./seededRandom";

export interface LevelCharacterTile {
  id: string;
  char: string;
  /** Position (0-based) in this level's idiom character sequence this
   * tile represents — the thing `orderedCatchProgress.ts` checks a
   * catch against. `undefined` for a decoy tile belonging to a
   * different idiom entirely. */
  correctIndex?: number;
  /** Which idiom this glyph actually comes from — always populated,
   * including for decoys. Not used by the current core-puzzle build;
   * kept so the deferred cross-idiom hint/quiz layer
   * (CATCH_MECHANIC_PLAN.md) can be wired in without re-collecting
   * content. */
  sourceIdiomId: string;
  /** Absolute world-space x (px) — not a fraction of viewport/world
   * width like the walking-era version used. 2026-08-23's redesign
   * made the world an auto-runner track whose length is driven purely
   * by content (how many characters, how many repeats), not by
   * viewport size, so absolute positions are the natural fit — the
   * camera just pans a viewport-sized window over however long the
   * track actually is. */
  x: number;
  /** How far above the ground (px) this tile floats. Varied per tile
   * (2026-08-23 feedback: "a little more natural at different heights
   * instead of being so neatly arranged in a line") but always kept
   * within HEIGHT_MIN..HEIGHT_MAX, comfortably inside the jump arc's
   * reachable range (see IdiomDoorScene's jump physics constants), so
   * every tile stays genuinely catchable. */
  height: number;
  /** Cosmetic rotation, in degrees, within ±ANGLE_MAX_DEG. Kept modest
   * so the glyph stays legible — this is a reading game first. */
  angle: number;
}

export interface DoorLevel {
  idiom: IdiomContent;
  tiles: LevelCharacterTile[];
  /** Total track length (px) — where the door sits. */
  length: number;
}

function getIdiom(id: string): IdiomContent {
  const idiom = idioms.find((i) => i.id === id);
  if (!idiom) throw new Error(`Idiom "${id}" not found in idioms.ts`);
  return idiom;
}

interface DecoySpec {
  char: string;
  sourceIdiomId: string;
}

const REPEATS_PER_CHARACTER = 4;
const DECOYS_PER_CHARACTER = 3;

// Each idiom character gets a wide "window" of track it can appear
// within, and those windows overlap heavily with their neighbors — so
// copies of character i and character i+1 (and their decoys) end up
// genuinely mixed together along the track, rather than the old
// "four-in-a-row, then a gap, then the next four" layout your
// 2026-08-23 feedback called boring.
const WINDOW_STEP = 650;
const WINDOW_LENGTH = 1400;
// The previous character's window ends at (this window's start +
// WINDOW_LENGTH - WINDOW_STEP) at the very latest, since window i+1
// starts WINDOW_STEP after window i. Reserving this tail slice (width
// WINDOW_STEP, with a small safety margin) for one guaranteed copy of
// every character (after the first) means that copy always lands
// strictly after every possible position of the *previous* character's
// copies — so the level is provably solvable no matter how the rest of
// that character's copies and all the decoys happen to land. See
// levelContent.test.ts's greedy-playthrough solvability check, and
// DECISIONS.md for the reasoning this replaced (a probabilistic
// argument that turned out to have a real, if small, failure chance).
const GUARANTEED_TAIL_MARGIN = 30;
const GUARANTEED_TAIL_WIDTH = WINDOW_STEP - GUARANTEED_TAIL_MARGIN;

const START_OFFSET = 260;
const END_PADDING = 500;
// Minimum gap (px) enforced between any two tile centers, so a jumbled
// layout never accidentally stacks tiles close enough to look like one
// blob or make a single jump ambiguous about which tile it caught.
const MIN_GAP = 130;
const MIN_GAP_RETRIES = 25;

export const HEIGHT_MIN = 90;
export const HEIGHT_MAX = 160;
export const ANGLE_MAX_DEG = 10;

function windowFor(charIndex: number): { start: number; end: number } {
  const start = START_OFFSET + charIndex * WINDOW_STEP;
  return { start, end: start + WINDOW_LENGTH };
}

/** Picks an x within [rangeMin, rangeMax) that's at least MIN_GAP away
 * from every already-placed tile, retrying a bounded number of times.
 * A rare near-overlap after exhausting retries is an acceptable, purely
 * cosmetic trade for never failing level generation outright. */
function pickX(rng: () => number, placed: number[], rangeMin: number, rangeMax: number): number {
  let candidate = randRange(rng, rangeMin, rangeMax);
  for (let attempt = 0; attempt < MIN_GAP_RETRIES; attempt++) {
    if (placed.every((p) => Math.abs(p - candidate) >= MIN_GAP)) return candidate;
    candidate = randRange(rng, rangeMin, rangeMax);
  }
  return candidate;
}

function fisherYatesShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds one auto-runner level: for each of the idiom's characters (in
 * order), REPEATS_PER_CHARACTER copies scattered across that
 * character's window (one guaranteed to land in the always-safe tail
 * slice; the rest placed freely across the whole window, which is what
 * actually creates the jumbled look), plus DECOYS_PER_CHARACTER decoys
 * drawn from other idioms scattered across the same window. Positions,
 * heights and rotation angles are all driven by a PRNG seeded from the
 * idiom's own id — so the layout looks organic and jumbled but is still
 * exactly reproducible, same "author real content, don't procedurally
 * generate it at runtime" approach as the rest of this project (a fixed
 * seed *is* the authored content here, same as a fixed number would
 * be), which also keeps E2E/unit tests exact.
 */
function buildLevel(idiomId: string, decoyPool: DecoySpec[]): DoorLevel {
  const idiom = getIdiom(idiomId);
  const chars = Array.from(idiom.hanzi);
  const ownChars = new Set(chars);
  // Filtered per level, not just per project: 拔苗助长 itself contains
  // 助, which is also in the shared decoy pool (from 助人为乐) — used
  // unfiltered, that decoy would collide with the idiom's own 3rd
  // character in the very same level.
  const validDecoys = decoyPool.filter((d) => !ownChars.has(d.char));
  if (validDecoys.length === 0) {
    throw new Error(`${idiom.id}: every decoy in the pool collides with this idiom's own characters`);
  }

  const rng = createRng(seedFromString(idiom.id));
  const shuffledDecoys = fisherYatesShuffle(validDecoys, rng);

  const tiles: LevelCharacterTile[] = [];
  const placedX: number[] = [];
  let decoyCursor = 0;

  chars.forEach((char, correctIndex) => {
    const win = windowFor(correctIndex);

    for (let r = 0; r < REPEATS_PER_CHARACTER; r++) {
      const isGuaranteedCopy = r === 0 && correctIndex > 0;
      const rangeMin = isGuaranteedCopy ? win.end - GUARANTEED_TAIL_WIDTH : win.start;
      const x = pickX(rng, placedX, rangeMin, win.end);
      placedX.push(x);
      tiles.push({
        id: `${idiom.id}-${correctIndex}-${r}`,
        char,
        correctIndex,
        sourceIdiomId: idiom.id,
        x,
        height: randRange(rng, HEIGHT_MIN, HEIGHT_MAX),
        angle: randRange(rng, -ANGLE_MAX_DEG, ANGLE_MAX_DEG),
      });
    }

    for (let d = 0; d < DECOYS_PER_CHARACTER; d++) {
      const decoy = shuffledDecoys[decoyCursor % shuffledDecoys.length];
      decoyCursor++;
      const x = pickX(rng, placedX, win.start, win.end);
      placedX.push(x);
      tiles.push({
        id: `decoy-${idiom.id}-${correctIndex}-${d}`,
        char: decoy.char,
        sourceIdiomId: decoy.sourceIdiomId,
        x,
        height: randRange(rng, HEIGHT_MIN, HEIGHT_MAX),
        angle: randRange(rng, -ANGLE_MAX_DEG, ANGLE_MAX_DEG),
      });
    }
  });

  const length = windowFor(chars.length - 1).end + END_PADDING;
  return { idiom, tiles, length };
}

/**
 * Three idioms chosen for having 4 *distinct* characters each (no
 * repeats within the idiom) — 一心一意/有始有终/相亲相爱 all repeat a
 * character, which would mean two physically different tiles sharing a
 * glyph where only one "counts" at a given moment; a real design
 * question worth its own pass before extending this mechanic to the
 * rest of the 15 approved idioms, not something to guess at silently.
 *
 * Drawn from the other 12 approved idioms' own characters (one entry
 * per distinct glyph) — expanded well past the original 3-character
 * pool per your 2026-08-23 "mixed with more decoy characters" feedback,
 * so a level's decoys don't feel like the same 2-3 glyphs on repeat.
 */
const DECOY_POOL: DecoySpec[] = [
  { char: "一", sourceIdiomId: "yi-xin-yi-yi" },
  { char: "心", sourceIdiomId: "yi-xin-yi-yi" },
  { char: "意", sourceIdiomId: "yi-xin-yi-yi" },
  { char: "有", sourceIdiomId: "you-shi-you-zhong" },
  { char: "始", sourceIdiomId: "you-shi-you-zhong" },
  { char: "终", sourceIdiomId: "you-shi-you-zhong" },
  { char: "半", sourceIdiomId: "ban-tu-er-fei" },
  { char: "途", sourceIdiomId: "ban-tu-er-fei" },
  { char: "而", sourceIdiomId: "ban-tu-er-fei" },
  { char: "废", sourceIdiomId: "ban-tu-er-fei" },
  { char: "磨", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "杵", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "成", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "针", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "言", sourceIdiomId: "yan-er-you-xin" },
  { char: "信", sourceIdiomId: "yan-er-you-xin" },
  { char: "助", sourceIdiomId: "zhu-ren-wei-le" },
  { char: "人", sourceIdiomId: "zhu-ren-wei-le" },
  { char: "为", sourceIdiomId: "zhu-ren-wei-le" },
  { char: "乐", sourceIdiomId: "zhu-ren-wei-le" },
  { char: "齐", sourceIdiomId: "qi-xin-xie-li" },
  { char: "协", sourceIdiomId: "qi-xin-xie-li" },
  { char: "力", sourceIdiomId: "qi-xin-xie-li" },
  { char: "相", sourceIdiomId: "xiang-qin-xiang-ai" },
  { char: "亲", sourceIdiomId: "xiang-qin-xiang-ai" },
  { char: "爱", sourceIdiomId: "xiang-qin-xiang-ai" },
  { char: "温", sourceIdiomId: "wen-gu-zhi-xin" },
  { char: "故", sourceIdiomId: "wen-gu-zhi-xin" },
  { char: "新", sourceIdiomId: "wen-gu-zhi-xin" },
  { char: "守", sourceIdiomId: "shou-zhu-dai-tu" },
  { char: "株", sourceIdiomId: "shou-zhu-dai-tu" },
  { char: "待", sourceIdiomId: "shou-zhu-dai-tu" },
  { char: "兔", sourceIdiomId: "shou-zhu-dai-tu" },
  { char: "井", sourceIdiomId: "jing-di-zhi-wa" },
  { char: "底", sourceIdiomId: "jing-di-zhi-wa" },
  { char: "之", sourceIdiomId: "jing-di-zhi-wa" },
  { char: "蛙", sourceIdiomId: "jing-di-zhi-wa" },
  { char: "举", sourceIdiomId: "yi-ju-liang-de" },
  { char: "两", sourceIdiomId: "yi-ju-liang-de" },
  { char: "得", sourceIdiomId: "yi-ju-liang-de" },
];

export const doorLevels: DoorLevel[] = [
  buildLevel("ba-miao-zhu-zhang", DECOY_POOL), // 拔苗助长
  buildLevel("shu-neng-sheng-qiao", DECOY_POOL), // 熟能生巧
  buildLevel("zhi-cuo-jiu-gai", DECOY_POOL), // 知错就改
];
