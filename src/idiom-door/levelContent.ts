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
  /** This glyph's own pinyin syllable (with tone marks), shown right
   * below it on the tile per your 2026-08-24 feedback — looked up from
   * its source idiom's `pinyin` string (space-separated, one syllable
   * per character, same order as `hanzi`), so it's always the correct
   * reading for *this* character, not a guess. */
  pinyin: string;
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

/** Looks up a single character's own pinyin syllable from its source
 * idiom's space-separated `pinyin` string. Used for decoys, whose
 * position within their own idiom isn't otherwise tracked. */
function pinyinForChar(sourceIdiomId: string, char: string): string {
  const sourceIdiom = getIdiom(sourceIdiomId);
  const index = Array.from(sourceIdiom.hanzi).indexOf(char);
  return sourceIdiom.pinyin.split(" ")[index] ?? "";
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
// 2026-08-23 (later) feedback: an earlier version of this layout
// jittered each tile's slot around its own character's index (±1.3
// slots), which unintentionally made the track *harder to predict but
// easier to pace* — since a character's tiles mostly stayed near their
// own neighborhood, each successive character ended up structurally
// farther out than the last (more accumulated repeats+decoys sort
// ahead of it the later its index is), so the 3rd/4th characters could
// take noticeably longer to reach than the 1st/2nd, purely as a side
// effect of the layout, not by design. Confirmed via a Monte Carlo run
// of the old formula: average distance-to-catch climbed steadily
// (~90px → ~980px → ~1620px → ~1790px across the four characters).
//
// This version removes that correlation entirely per your "all four
// jumbled up, even 3rd/4th next to 1st/2nd" request: every tile except
// one guaranteed "anchor" per character is placed by a single flat
// Fisher-Yates shuffle across the *entire* track, with zero regard for
// which character it belongs to or when it was generated — a
// character's repeats can land anywhere from the very first slot to
// the very last. Solvability still doesn't depend on that shuffle: one
// anchor tile per character is reserved and dropped into a random slot
// within that character's own quarter of the track (so anchors alone
// still sort into a valid, complete, in-order path — just a much more
// loosely-spaced one than the old "exactly 1 apart" jitter allowed),
// and every other tile (extra repeats + all decoys, from every
// character) is shuffled freely into whatever slots are left. See
// levelContent.test.ts's greedy-playthrough solvability check, which
// exercises this directly against the real generated content.
const SLOT_WIDTH = 180;
const SLOT_JITTER = 35;
// Worst-case gap between two adjacent tiles' centers once jitter is
// applied — used by the test suite to confirm the no-overlap guarantee
// actually holds against the real generated content, not just in
// theory.
export const MIN_SLOT_GAP = SLOT_WIDTH - 2 * SLOT_JITTER;

const START_OFFSET = 260;
const END_PADDING = 500;

export const HEIGHT_MIN = 90;
export const HEIGHT_MAX = 160;
export const ANGLE_MAX_DEG = 10;

interface Obligation {
  char: string;
  pinyin: string;
  correctIndex?: number;
  sourceIdiomId: string;
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
 * drawn from other idioms are generated. One repeat per character is
 * held out as its "anchor" and dropped into a random slot within that
 * character's own quarter of the track — since the four quarters are
 * strictly increasing ranges, the four anchors alone always form a
 * valid, complete, in-order path through the level, regardless of
 * where anything else lands. Every other tile (the remaining repeats
 * *and* every decoy, pooled together across all four characters) is
 * shuffled with one flat Fisher-Yates pass and dropped into whatever
 * slots are left — so a given character's tiles are otherwise
 * completely uncorrelated with track position: the 3rd or 4th
 * character's repeats can land right at the start, next to the 1st
 * and 2nd's, and vice versa. See levelContent.test.ts's
 * greedy-playthrough solvability check, which exercises this directly
 * against the real generated content rather than trusting the proof.
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
  const idiomSyllables = idiom.pinyin.split(" ");

  const anchors: Obligation[] = [];
  const free: Obligation[] = [];
  let decoyCursor = 0;

  chars.forEach((char, correctIndex) => {
    const repeatCount = randInt(rng, MIN_REPEATS_PER_CHARACTER, MAX_REPEATS_PER_CHARACTER);
    for (let r = 0; r < repeatCount; r++) {
      const tile: Obligation = {
        char,
        pinyin: idiomSyllables[correctIndex] ?? "",
        correctIndex,
        sourceIdiomId: idiom.id,
        id: `${idiom.id}-${correctIndex}-${r}`,
      };
      // Exactly one repeat per character is reserved as its anchor
      // (see buildLevel's doc comment above); every other repeat is
      // free to land anywhere on the track.
      (r === 0 ? anchors : free).push(tile);
    }

    for (let d = 0; d < DECOYS_PER_CHARACTER; d++) {
      const decoy = shuffledDecoys[decoyCursor % shuffledDecoys.length];
      decoyCursor++;
      free.push({
        char: decoy.char,
        pinyin: pinyinForChar(decoy.sourceIdiomId, decoy.char),
        sourceIdiomId: decoy.sourceIdiomId,
        id: `decoy-${idiom.id}-${correctIndex}-${d}`,
      });
    }
  });

  const total = anchors.length + free.length;
  const shuffledFree = fisherYatesShuffle(free, rng);

  // Split the track into as many equal quarters as there are anchors
  // and give each anchor a random slot inside its own quarter — this
  // is the only thing keeping the four characters in a solvable order;
  // everything else is placed with zero regard for character identity.
  const bySlot: (Obligation | undefined)[] = new Array(total).fill(undefined);
  anchors.forEach((anchor, i) => {
    const quarterStart = Math.round((total * i) / anchors.length);
    const quarterEnd = Math.round((total * (i + 1)) / anchors.length);
    const slot = randInt(rng, quarterStart, quarterEnd - 1);
    bySlot[slot] = anchor;
  });
  let freeCursor = 0;
  for (let slot = 0; slot < total; slot++) {
    if (bySlot[slot] === undefined) {
      bySlot[slot] = shuffledFree[freeCursor];
      freeCursor++;
    }
  }

  const tiles: LevelCharacterTile[] = bySlot.map((ob, slotIndex) => {
    if (!ob) throw new Error(`${idiom.id}: slot ${slotIndex} was never filled`);
    const slotCenter = START_OFFSET + slotIndex * SLOT_WIDTH;
    return {
      id: ob.id,
      char: ob.char,
      pinyin: ob.pinyin,
      correctIndex: ob.correctIndex,
      sourceIdiomId: ob.sourceIdiomId,
      x: slotCenter + randRange(rng, -SLOT_JITTER, SLOT_JITTER),
      height: randRange(rng, HEIGHT_MIN, HEIGHT_MAX),
      angle: randRange(rng, -ANGLE_MAX_DEG, ANGLE_MAX_DEG),
    };
  });

  const length = START_OFFSET + total * SLOT_WIDTH + END_PADDING;
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
 * 2026-08-28: swapped from the original ba-miao-zhu-zhang/
 * shu-neng-sheng-qiao/zhi-cuo-jiu-gai trio to this one per your "bored
 * repeatedly testing on these same idioms" feedback — picked to keep
 * the same "4 distinct characters" constraint while spreading across
 * three different theme tags (honesty/kindness/wisdom, vs. the old
 * set's focus/focus/honesty) for more thematic variety. The old trio
 * stays in the decoy pool below rather than disappearing.
 *
 * Drawn from the other 12 approved idioms' own characters (one entry
 * per distinct glyph, de-duplicated across the *whole* pool even
 * across idioms — e.g. 有 appears in both you-shi-you-zhong and this
 * set's yan-er-you-xin, so it's only listed once here, sourced from
 * whichever idiom isn't one of the three below) — expanded well past
 * the original 3-character pool per your 2026-08-23 "mixed with more
 * decoy characters" feedback, so a level's decoys don't feel like the
 * same 2-3 glyphs on repeat. A chosen idiom's own characters get
 * filtered back out per-level regardless (see `validDecoys` below) —
 * e.g. zhu-ren-wei-le itself contains 助, which is also here via
 * ba-miao-zhu-zhang, the same kind of collision the original pool's
 * comment already called out for the previous trio.
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
  { char: "熟", sourceIdiomId: "shu-neng-sheng-qiao" },
  { char: "能", sourceIdiomId: "shu-neng-sheng-qiao" },
  { char: "生", sourceIdiomId: "shu-neng-sheng-qiao" },
  { char: "巧", sourceIdiomId: "shu-neng-sheng-qiao" },
  { char: "磨", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "杵", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "成", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "针", sourceIdiomId: "mo-chu-cheng-zhen" },
  { char: "拔", sourceIdiomId: "ba-miao-zhu-zhang" },
  { char: "苗", sourceIdiomId: "ba-miao-zhu-zhang" },
  { char: "助", sourceIdiomId: "ba-miao-zhu-zhang" },
  { char: "长", sourceIdiomId: "ba-miao-zhu-zhang" },
  { char: "知", sourceIdiomId: "zhi-cuo-jiu-gai" },
  { char: "错", sourceIdiomId: "zhi-cuo-jiu-gai" },
  { char: "就", sourceIdiomId: "zhi-cuo-jiu-gai" },
  { char: "改", sourceIdiomId: "zhi-cuo-jiu-gai" },
  { char: "齐", sourceIdiomId: "qi-xin-xie-li" },
  { char: "协", sourceIdiomId: "qi-xin-xie-li" },
  { char: "力", sourceIdiomId: "qi-xin-xie-li" },
  { char: "相", sourceIdiomId: "xiang-qin-xiang-ai" },
  { char: "亲", sourceIdiomId: "xiang-qin-xiang-ai" },
  { char: "爱", sourceIdiomId: "xiang-qin-xiang-ai" },
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
  buildLevel("yan-er-you-xin", DECOY_POOL), // 言而有信
  buildLevel("zhu-ren-wei-le", DECOY_POOL), // 助人为乐
  buildLevel("wen-gu-zhi-xin", DECOY_POOL), // 温故知新
];
