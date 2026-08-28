import type { IdiomContent } from "../idioms/types";
import { idioms } from "../idioms/idioms";
import { createRng, seedFromString, randRange } from "./seededRandom";
import { BALLOON_COLORWAYS } from "./balloonColors";
import { sessionIdiomIds } from "./sessionIdioms";

export interface BalloonDef {
  id: string;
  /** The candidate idiom's own hanzi — the target idiom itself for the
   * correct balloon, or another idiom's hanzi for a decoy. 2026-08-26
   * redesign: a balloon used to hold a whole spliced example sentence
   * (14-35+ characters, cramped and hard to read while flying); it now
   * holds just one short (4-character) idiom, with the sentence itself
   * shown fixed/readable in the balloon-prompt UI instead — see
   * `MaskedSentence` below. */
  hanzi: string;
  pinyin: string;
  charPinyin: string[];
  isCorrect: boolean;
  /** Which idiom this candidate actually is — same as `hanzi`/`pinyin`
   * already identify it, kept as an explicit id for parity with the
   * door puzzle's tiles and easier test/debug reference. */
  sourceIdiomId: string;
  /** Position (0-based) in a shuffled draw order, *not* baked-in x/y —
   * BalloonSentenceScene lays slots 0..total-1 onto a row-major grid it
   * sizes itself from the real rendered balloon dimensions and the real
   * viewport, at render time — this only fixes the *order*, which is
   * what needs to be deterministic/reproducible for tests. */
  slotIndex: number;
  /** Jitter within whatever cell this slot ends up in, as a fraction of
   * that cell's width/height (each in [-CELL_JITTER_FRACTION,
   * +CELL_JITTER_FRACTION]) — keeps balloons from ever landing exactly
   * center-aligned in a row without needing rejection-sampling, same
   * "guarantee by construction" lesson as the door puzzle's tile layout. */
  jitterX: number;
  jitterY: number;
  /** Radians — random per-balloon phase offsets for the body's own
   * wind-drift wander. Separate x/y phases give each balloon an
   * elliptical, not just up-down, drift, and no two balloons move in
   * lockstep. */
  driftPhaseX: number;
  driftPhaseY: number;
  /** Radians — the dangling string's own phase offset, deliberately
   * independent from driftPhaseX/Y (a different random draw, not
   * derived from them) — the string sways on its own timing rather than
   * rigidly following the body's drift. */
  stringPhase: number;
  /** Index into BALLOON_COLORWAYS — randomized per balloon (never tied
   * to `isCorrect`, so color never hints at the answer), and guaranteed
   * distinct within a level as long as there are at least as many
   * colorways as balloons, for a proper rainbow-of-balloons look. */
  colorIndex: number;
}

/** The idiom's own approved example sentence, with its own hanzi blanked
 * out (see buildMaskedSentence) — shown fixed and readable in the
 * balloon-prompt UI, not inside any one balloon. The child reads this
 * once and judges which balloon's *idiom* (not sentence) fills the
 * blank, rather than having to read a whole spliced sentence packed
 * into every balloon. */
export interface MaskedSentence {
  hanzi: string;
  /** Per-character pinyin, one entry per `Array.from(hanzi)` character —
   * empty for the blanked-out run (no reading to show for a placeholder)
   * and for punctuation, same shape/convention as
   * IdiomExampleSentence.charPinyin. */
  charPinyin: string[];
}

export interface BalloonLevel {
  idiom: IdiomContent;
  maskedSentence: MaskedSentence;
  balloons: BalloonDef[];
}

// One correct idiom + 3 decoy idioms as balloon candidates. Kept
// deliberately small (not "as many as fit"): more candidates means more
// short 4-character idioms to visually tell apart while flying, which
// works against the "easier to read while flying" point of this
// redesign just as much as long sentences did.
export const DISTRACTOR_COUNT = 3;

// How far (as a fraction of its grid cell) a balloon's position can
// jitter from the cell's center. Balloons are now small and uniformly
// sized (a single 4-character idiom, not a variable-length sentence),
// so this can be looser than the old full-sentence balloons' jitter
// without risking overlap — BalloonSentenceScene's cell sizing still
// accounts for it exactly the same way.
export const CELL_JITTER_FRACTION = 0.2;

const BLANK_CHAR = "○";

function fisherYatesShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getIdiom(id: string): IdiomContent {
  const idiom = idioms.find((i) => i.id === id);
  if (!idiom) throw new Error(`Idiom "${id}" not found in idioms.ts`);
  return idiom;
}

/** Finds the start index of `needle` as a contiguous run within
 * `haystack`, or -1 if it doesn't occur. */
function indexOfSubarray(haystack: string[], needle: string[]): number {
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((ch, j) => haystack[i + j] === ch)) return i;
  }
  return -1;
}

/**
 * Blanks out the idiom's own characters within its exampleSentence,
 * replacing each with BLANK_CHAR (so the sentence's length/rhythm stays
 * visually intact) and clearing their pinyin. Every approved idiom's
 * exampleSentence is written to actually contain its own hanzi verbatim
 * (the same assumption this project's application-check content used to
 * rely on), so this throws rather than silently producing an unmasked
 * sentence if that's ever not true.
 */
function buildMaskedSentence(idiom: IdiomContent): MaskedSentence {
  const sentenceChars = Array.from(idiom.exampleSentence.hanzi);
  const idiomChars = Array.from(idiom.hanzi);
  const start = indexOfSubarray(sentenceChars, idiomChars);
  if (start === -1) {
    throw new Error(`buildMaskedSentence: "${idiom.id}"'s own hanzi not found in its exampleSentence`);
  }
  const hanzi = [...sentenceChars.slice(0, start), ...idiomChars.map(() => BLANK_CHAR), ...sentenceChars.slice(start + idiomChars.length)].join("");
  const charPinyin = [
    ...idiom.exampleSentence.charPinyin.slice(0, start),
    ...idiomChars.map(() => ""),
    ...idiom.exampleSentence.charPinyin.slice(start + idiomChars.length),
  ];
  return { hanzi, charPinyin };
}

/** Picks `count` other idioms as decoys, preferring a different theme
 * from the target first (falling back to same-theme idioms only if
 * there aren't enough) — same distractor-variety heuristic this
 * project's retired application-check content generator used. */
function pickDistractors(target: IdiomContent, pool: IdiomContent[], count: number, rng: () => number): IdiomContent[] {
  const others = pool.filter((i) => i.id !== target.id);
  const differentTheme = others.filter((i) => i.theme !== target.theme);
  const sameTheme = others.filter((i) => i.theme === target.theme);
  const source = differentTheme.length >= count ? differentTheme : [...differentTheme, ...sameTheme];
  return fisherYatesShuffle(source, rng).slice(0, count);
}

/**
 * Builds one balloon stage: one correct-idiom balloon (the target
 * itself) plus DISTRACTOR_COUNT decoy-idiom balloons, alongside the
 * fixed masked sentence the child reads to judge which idiom fits.
 * Deliberately does *not* decide the grid's actual shape or pixel
 * positions — BalloonSentenceScene works those out from the real
 * rendered balloon sizes and the real viewport at layout time. Seeded
 * by the idiom's own id, same "a fixed seed is the authored content"
 * approach as `levelContent.ts`, so a level's slot order/jitter is
 * exactly reproducible for tests.
 */
export function buildBalloonLevel(idiomId: string): BalloonLevel {
  const idiom = getIdiom(idiomId);
  const rng = createRng(seedFromString(`balloon-${idiom.id}`));

  const maskedSentence = buildMaskedSentence(idiom);
  const distractors = pickDistractors(idiom, idioms, DISTRACTOR_COUNT, rng);
  const candidates: IdiomContent[] = [idiom, ...distractors];

  const slotOrder = fisherYatesShuffle(
    candidates.map((_, i) => i),
    rng,
  );
  // Shuffled once per level and sliced to `total` — guarantees every
  // balloon in a level gets a *distinct* color (as long as there are at
  // least as many colorways as balloons), rather than risking two
  // colors repeating by chance.
  const colorOrder = fisherYatesShuffle(
    BALLOON_COLORWAYS.map((_, i) => i),
    rng,
  );

  const balloons: BalloonDef[] = candidates.map((candidate, i) => ({
    id: `balloon-${idiom.id}-${candidate.id}`,
    hanzi: candidate.hanzi,
    pinyin: candidate.pinyin,
    charPinyin: candidate.pinyin.split(" "),
    isCorrect: candidate.id === idiom.id,
    sourceIdiomId: candidate.id,
    slotIndex: slotOrder[i],
    jitterX: randRange(rng, -CELL_JITTER_FRACTION, CELL_JITTER_FRACTION),
    jitterY: randRange(rng, -CELL_JITTER_FRACTION, CELL_JITTER_FRACTION),
    driftPhaseX: randRange(rng, 0, Math.PI * 2),
    driftPhaseY: randRange(rng, 0, Math.PI * 2),
    stringPhase: randRange(rng, 0, Math.PI * 2),
    colorIndex: colorOrder[i % colorOrder.length],
  }));

  return { idiom, maskedSentence, balloons };
}

// Same idiom set as levelContent.ts's doorLevels (sessionIdioms.ts's
// sessionIdiomIds) — this stage follows each of those idiom's door, not
// a separate/different set.
export const balloonLevels: BalloonLevel[] = sessionIdiomIds.map((id) => buildBalloonLevel(id));
