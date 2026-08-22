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

export const MIN_REPEATS_PER_CHARACTER = 5;
export const MAX_REPEATS_PER_CHARACTER = 9;
const DECOYS_PER_CHARACTER = 3;

// --- Track layout: a fixed-width "slot" grid -------------------------
//
// 2026-08-24 feedback found two real problems with the previous
// (window-based, purely-random-x) layout: decoy tiles could end up
// close enough to visually overlap, and the correct next character
// didn't come around often enough. This version fixes both at once by
// building the track as a sequence of evenly-spaced slots (so no two
// tiles can ever land close enough to overlap — guaranteed by
// construction, not by hopeful rejection-sampling) and by giving each
// character a randomized 5-9 repeats (up from a flat 4), so the
// correct next character shows up more often no matter how the shuffle
// falls.
//
// The *order* tiles are assigned to slots (which is what actually
// creates the jumbled look) comes from sorting every tile by a
// "sortKey" centered on its own character's index, plus random jitter
// that deliberately overlaps into neighboring characters' territory.
// Solvability doesn't depend on that shuffle at all: for every
// character after the first, exactly one of its copies (the "anchor")
// gets sortKey === charIndex with no jitter, and since anchor keys are
// spaced exactly 1 apart in strictly increasing character order, the
// anchors alone always sort into a valid, complete, in-order path
// through the level — regardless of where every other (freely
// jittered) tile and decoy ends up. See levelContent.test.ts's
// greedy-playthrough solvability check, which exercises this directly
// against the real generated content rather than trusting the proof.
const SLOT_WIDTH = 180;
const SLOT_JITTER = 35;
// Worst-case gap between two adjacent tiles' centers once jitter is
// applied — used by the test suite to confirm the no-overlap guarantee
// actually holds against the real generated content, not just in
// theory.
export const MIN_SLOT_GAP = SLOT_WIDTH - 2 * SLOT_JITTER;
// How far (in character-index units) a non-anchor tile's sortKey can
// drift from its own character's index — large enough to mix solidly
// into both neighbors' territory (this is what makes the layout feel
// jumbled rather than neatly sequential) without needing to reach a
// second character away.
const SORT_JITTER = 1.3;

const START_OFFSET = 260;
const END_PADDING = 500;

export const HEIGHT_MIN = 90;
export const HEIGHT_MAX = 160;
export const ANGLE_MAX_DEG = 10;

interface Obligation {
  char: string;
  correctIndex?: number;
  sourceIdiomId: string;
  sortKey: number;
  id: string;
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
 * Builds one auto-runner level. For each of the idiom's characters (in
 * order), a randomized 5-9 repeats plus DECOYS_PER_CHARACTER decoys
 * drawn from other idioms are generated as "obligations," each given a
 * sortKey centered on that character's index (jittered, except for one
 * guaranteed "anchor" repeat per character). Sorting all obligations by
 * that key and then laying them out on evenly-spaced track slots (in
 * that sorted order) produces a track that's genuinely jumbled and
 * mixed together, provably solvable, and physically non-overlapping —
 * all from one pass, rather than random placement plus after-the-fact
 * rejection sampling. Positions/heights/angles are all driven by a PRNG
 * seeded from the idiom's own id, so the layout looks organic but is
 * still exactly reproducible — same "author real content, don't
 * procedurally generate it at runtime" approach as the rest of this
 * project (a fixed seed *is* the authored content here, same as a fixed
 * number would be), which also keeps unit/E2E tests exact.
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

  const obligations: Obligation[] = [];
  let decoyCursor = 0;

  chars.forEach((char, correctIndex) => {
    const repeatCount = randInt(rng, MIN_REPEATS_PER_CHARACTER, MAX_REPEATS_PER_CHARACTER);
    for (let r = 0; r < repeatCount; r++) {
      const isAnchor = r === 0;
      obligations.push({
        char,
        correctIndex,
        sourceIdiomId: idiom.id,
        // The anchor's sortKey is exactly correctIndex — no jitter —
        // so anchors always sort in strict character order regardless
        // of anything else. Every other repeat is free to drift.
        sortKey: isAnchor ? correctIndex : correctIndex + randRange(rng, -SORT_JITTER, SORT_JITTER),
        id: `${idiom.id}-${correctIndex}-${r}`,
      });
    }

    for (let d = 0; d < DECOYS_PER_CHARACTER; d++) {
      const decoy = shuffledDecoys[decoyCursor % shuffledDecoys.length];
      decoyCursor++;
      obligations.push({
        char: decoy.char,
        sourceIdiomId: decoy.sourceIdiomId,
        sortKey: correctIndex + randRange(rng, -SORT_JITTER, SORT_JITTER),
        id: `decoy-${idiom.id}-${correctIndex}-${d}`,
      });
    }
  });

  // This is the whole "jumbling" step: sort by the (mostly-jittered)
  // key, then lay the result out left-to-right onto the slot grid.
  obligations.sort((a, b) => a.sortKey - b.sortKey);

  const tiles: LevelCharacterTile[] = obligations.map((ob, slotIndex) => {
    const slotCenter = START_OFFSET + slotIndex * SLOT_WIDTH;
    return {
      id: ob.id,
      char: ob.char,
      correctIndex: ob.correctIndex,
      sourceIdiomId: ob.sourceIdiomId,
      x: slotCenter + randRange(rng, -SLOT_JITTER, SLOT_JITTER),
      height: randRange(rng, HEIGHT_MIN, HEIGHT_MAX),
      angle: randRange(rng, -ANGLE_MAX_DEG, ANGLE_MAX_DEG),
    };
  });

  const length = START_OFFSET + obligations.length * SLOT_WIDTH + END_PADDING;
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
