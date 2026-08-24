import type { IdiomContent } from "../idioms/types";
import { idioms } from "../idioms/idioms";
import { buildApplicationCheck, type ApplicationCheckOption } from "../meaning-check/applicationCheck";
import { createRng, seedFromString, randRange } from "./seededRandom";
import { BALLOON_COLORWAYS } from "./balloonColors";

export interface BalloonDef {
  id: string;
  hanzi: string;
  pinyin: string;
  isCorrect: boolean;
  /** Which idiom this sentence's structure actually comes from — the
   * target idiom itself for the correct balloon, or whichever other
   * idiom's sentence the target was spliced into for a decoy. Not
   * shown to the child; kept for parity with the door puzzle's tiles
   * and in case a future pass wants to credit/vary by source. */
  sourceIdiomId: string;
  /** Position (0-based) in a shuffled draw order, *not* baked-in x/y —
   * balloon size is content-driven (a spliced sentence can run 14-35+
   * characters) and the actual viewport's aspect ratio varies a lot
   * (phone portrait vs. desktop), so neither is known at content-gen
   * time. BalloonSentenceScene lays slots 0..total-1 onto a row-major
   * grid it sizes itself from the real rendered balloon dimensions and
   * the real viewport, at render time — this only fixes the *order*,
   * which is what needs to be deterministic/reproducible for tests,
   * not the exact pixel geometry. */
  slotIndex: number;
  /** Jitter within whatever cell this slot ends up in, as a fraction of
   * that cell's width/height (each in [-CELL_JITTER_FRACTION,
   * +CELL_JITTER_FRACTION]) — keeps balloons from ever landing exactly
   * center-aligned in a row without needing rejection-sampling, same
   * "guarantee by construction" lesson as the door puzzle's tile layout
   * (see levelContent.ts's 2026-08-24 DECISIONS.md entry). */
  jitterX: number;
  jitterY: number;
  /** Radians — random per-balloon phase offsets for the body's own
   * wind-drift wander (2026-08-28: replaced the old simple up-down bob
   * per your "wider floating radius, like a light wind" feedback).
   * Separate x/y phases give each balloon an elliptical, not just
   * up-down, drift, and no two balloons move in lockstep. */
  driftPhaseX: number;
  driftPhaseY: number;
  /** Radians — the dangling string's own phase offset, deliberately
   * independent from driftPhaseX/Y (a different random draw, not
   * derived from them) per your "let the string float freely,
   * independently of the balloon" request — the string sways on its
   * own timing rather than rigidly following the body's drift. */
  stringPhase: number;
  /** Index into BALLOON_COLORWAYS — randomized per balloon (never tied
   * to `isCorrect`, so color never hints at the answer), and guaranteed
   * distinct within a level as long as there are at least as many
   * colorways as balloons, for a proper rainbow-of-balloons look. */
  colorIndex: number;
}

export interface BalloonLevel {
  idiom: IdiomContent;
  balloons: BalloonDef[];
}

// One correct usage + 3 wrong-usage decoys (via applicationCheck.ts's
// already-approved spliceIdiomInto technique — no new/unverified
// content). Kept deliberately smaller than it might look like it needs
// to be: these are full sentences (some of the approved examples run
// 30+ characters once spliced), not single characters like the door
// puzzle's tiles, so each balloon needs real screen space to stay
// readable — 4 total leaves room for that at typical phone/tablet
// viewport sizes without crowding.
export const DISTRACTOR_COUNT = 3;

// How far (as a fraction of its grid cell) a balloon's position can
// jitter from the cell's center — kept tighter than the door puzzle's
// equivalent since these balloons are large (full sentences) relative
// to their grid cells, especially on narrow mobile viewports.
export const CELL_JITTER_FRACTION = 0.15;

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

/**
 * Builds one balloon stage: `buildApplicationCheck` (Snippet 3's
 * already-approved content generator) supplies one correct-usage option
 * plus DISTRACTOR_COUNT wrong-usage options, each already shuffled;
 * this assigns each a shuffled slot index and a small per-axis jitter.
 * Deliberately does *not* decide the grid's actual shape (columns vs.
 * rows) or pixel positions — found by screenshot that baking a fixed
 * grid in here (e.g. always 2 columns) overlapped badly on a narrow
 * mobile viewport, since a 2-column cell is only ever as wide as
 * whatever fraction of *this* viewport that is, regardless of how wide
 * the actual balloon content needs to be. BalloonSentenceScene works
 * out columns/rows from the real rendered balloon sizes and the real
 * viewport at layout time instead. Seeded by the idiom's own id, same
 * "a fixed seed is the authored content" approach as `levelContent.ts`,
 * so a level's slot order/jitter is exactly reproducible for tests.
 */
export function buildBalloonLevel(idiomId: string): BalloonLevel {
  const idiom = getIdiom(idiomId);
  const rng = createRng(seedFromString(`balloon-${idiom.id}`));

  const options: ApplicationCheckOption[] = buildApplicationCheck(idiom, idioms, DISTRACTOR_COUNT, rng);
  const slotOrder = fisherYatesShuffle(
    options.map((_, i) => i),
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

  const balloons: BalloonDef[] = options.map((opt, i) => ({
    id: `balloon-${idiom.id}-${i}`,
    hanzi: opt.hanzi,
    pinyin: opt.pinyin,
    isCorrect: opt.isCorrect,
    sourceIdiomId: opt.fromIdiomId,
    slotIndex: slotOrder[i],
    jitterX: randRange(rng, -CELL_JITTER_FRACTION, CELL_JITTER_FRACTION),
    jitterY: randRange(rng, -CELL_JITTER_FRACTION, CELL_JITTER_FRACTION),
    driftPhaseX: randRange(rng, 0, Math.PI * 2),
    driftPhaseY: randRange(rng, 0, Math.PI * 2),
    stringPhase: randRange(rng, 0, Math.PI * 2),
    colorIndex: colorOrder[i % colorOrder.length],
  }));

  return { idiom, balloons };
}

// Same 3 idioms as levelContent.ts's doorLevels — this stage follows
// each of those idiom's door, not a separate/different set. (2026-08-28:
// swapped to a different trio per your "bored testing the same idioms"
// feedback — see levelContent.ts's DECOY_POOL comment for which ones
// and why.)
export const balloonLevels: BalloonLevel[] = [
  buildBalloonLevel("yan-er-you-xin"),
  buildBalloonLevel("zhu-ren-wei-le"),
  buildBalloonLevel("wen-gu-zhi-xin"),
];
