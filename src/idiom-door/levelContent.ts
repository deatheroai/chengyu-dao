import type { IdiomContent } from "../idioms/types";
import { idioms } from "../idioms/idioms";

export type SurfaceKind = "ground" | "platformA" | "platformB";

export interface LevelCharacterTile {
  id: string;
  char: string;
  /** Position (0-based) in this level's idiom character sequence this
   * tile represents — the thing `orderedCatchProgress.ts` checks a grab
   * against. `undefined` for a decoy tile belonging to a different
   * idiom entirely. */
  correctIndex?: number;
  /** Which idiom this glyph actually comes from — always populated,
   * including for decoys. Not used by the current core-puzzle build;
   * kept so the deferred cross-idiom hint/quiz layer
   * (CATCH_MECHANIC_PLAN.md) can be wired in without re-collecting
   * content. */
  sourceIdiomId: string;
  xFrac: number;
  surface: SurfaceKind;
}

export interface DoorLevel {
  idiom: IdiomContent;
  tiles: LevelCharacterTile[];
}

/**
 * The single source of truth for each platform's horizontal footprint,
 * as a fraction of world width — IdiomDoorScene's `setupSurfaces` reads
 * these same constants rather than hardcoding its own copy, so a tile
 * placed here as "platformA"/"platformB" is guaranteed to actually be
 * reachable there. Found the hard way: an earlier version of this file
 * placed a tile at an xFrac outside its tagged platform's real range
 * (0.62 tagged "platformB" when platformB was actually 0.72-0.88) —
 * jumping to it could never succeed, since the character could never
 * physically be at that platform's height at that x. See
 * `levelContent.test.ts`'s "every platform tile sits within its
 * platform's actual footprint" check, added after this was found.
 */
export const PLATFORM_XFRAC_RANGES = {
  platformA: { min: 0.44, max: 0.6 },
  platformB: { min: 0.72, max: 0.88 },
} as const;

function getIdiom(id: string): IdiomContent {
  const idiom = idioms.find((i) => i.id === id);
  if (!idiom) throw new Error(`Idiom "${id}" not found in idioms.ts`);
  return idiom;
}

function correctTiles(idiom: IdiomContent, placements: Array<{ xFrac: number; surface: SurfaceKind }>): LevelCharacterTile[] {
  const chars = Array.from(idiom.hanzi);
  if (placements.length !== chars.length) {
    throw new Error(`${idiom.id}: expected ${chars.length} placements, got ${placements.length}`);
  }
  return chars.map((char, correctIndex) => ({
    id: `${idiom.id}-${correctIndex}`,
    char,
    correctIndex,
    sourceIdiomId: idiom.id,
    xFrac: placements[correctIndex].xFrac,
    surface: placements[correctIndex].surface,
  }));
}

function decoyTile(char: string, sourceIdiomId: string, xFrac: number, surface: SurfaceKind, uniq: string): LevelCharacterTile {
  return { id: `decoy-${uniq}`, char, sourceIdiomId, xFrac, surface };
}

/**
 * Three idioms chosen for having 4 *distinct* characters each (no
 * repeats within the idiom) — 一心一意/有始有终/相亲相爱 all repeat a
 * character, which would mean two tiles sharing a glyph where only one
 * "counts" at a given moment; a real design question worth its own
 * pass before extending this mechanic to the rest of the 15 approved
 * idioms, not something to guess at silently for this first build.
 *
 * Tile placement is deliberately *not* in the idiom's own left-to-right
 * order — the point is to make the child read the currently-highlighted
 * target character (see IdiomDoorScene's slot hint) and search for a
 * matching glyph, not just walk rightward grabbing things in sequence.
 */
export const doorLevels: DoorLevel[] = [
  {
    idiom: getIdiom("ba-miao-zhu-zhang"), // 拔苗助长
    tiles: [
      ...correctTiles(getIdiom("ba-miao-zhu-zhang"), [
        { xFrac: 0.5, surface: "platformA" }, // 拔 (0)
        { xFrac: 0.25, surface: "ground" }, // 苗 (1)
        { xFrac: 0.9, surface: "ground" }, // 助 (2)
        { xFrac: 0.62, surface: "ground" }, // 长 (3)
      ]),
      decoyTile("有", "you-shi-you-zhong", 0.12, "ground", "bmzz-you"),
      decoyTile("而", "ban-tu-er-fei", 0.38, "ground", "bmzz-er"),
      decoyTile("知", "zhi-cuo-jiu-gai", 0.78, "platformB", "bmzz-zhi"),
    ],
  },
  {
    idiom: getIdiom("shu-neng-sheng-qiao"), // 熟能生巧
    tiles: [
      ...correctTiles(getIdiom("shu-neng-sheng-qiao"), [
        { xFrac: 0.48, surface: "platformA" }, // 熟 (0)
        { xFrac: 0.9, surface: "ground" }, // 能 (1)
        { xFrac: 0.12, surface: "ground" }, // 生 (2)
        { xFrac: 0.74, surface: "platformB" }, // 巧 (3)
      ]),
      decoyTile("助", "zhu-ren-wei-le", 0.25, "ground", "sngq-zhu"),
      decoyTile("有", "you-shi-you-zhong", 0.6, "ground", "sngq-you"),
      decoyTile("而", "ban-tu-er-fei", 0.85, "ground", "sngq-er"),
    ],
  },
  {
    idiom: getIdiom("zhi-cuo-jiu-gai"), // 知错就改
    tiles: [
      ...correctTiles(getIdiom("zhi-cuo-jiu-gai"), [
        { xFrac: 0.5, surface: "platformA" }, // 知 (0)
        { xFrac: 0.9, surface: "ground" }, // 错 (1)
        { xFrac: 0.25, surface: "ground" }, // 就 (2)
        { xFrac: 0.62, surface: "ground" }, // 改 (3)
      ]),
      decoyTile("有", "you-shi-you-zhong", 0.12, "ground", "zcjg-you"),
      decoyTile("助", "zhu-ren-wei-le", 0.38, "ground", "zcjg-zhu"),
      decoyTile("而", "ban-tu-er-fei", 0.78, "platformB", "zcjg-er"),
    ],
  },
];
