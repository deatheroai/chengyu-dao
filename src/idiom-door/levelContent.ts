import type { IdiomContent } from "../idioms/types";
import { idioms } from "../idioms/idioms";

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

// Every character on the track floats at the same reachable-by-jump
// height (see IdiomDoorScene's FLOAT_HEIGHT) — running alone never
// catches anything, matching your "only needs to jump" description.
const REPEATS_PER_CHARACTER = 4;
const TILE_SPACING = 260;
const CHARACTER_GAP = 420;
const START_OFFSET = 260;
const END_PADDING = 500;

/**
 * Builds one auto-runner level: for each of the idiom's characters (in
 * order), `REPEATS_PER_CHARACTER` copies spaced along the track — so
 * missing one is never costly, there's always another coming — followed
 * by one decoy from a different idiom before the next character's run
 * starts. Deterministic and content-driven, same "author real content,
 * don't procedurally generate it at runtime" approach as the rest of
 * this project (15 hand-researched idioms, not generated prose), which
 * also keeps E2E positions exactly predictable.
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

  const tiles: LevelCharacterTile[] = [];
  let x = START_OFFSET;

  chars.forEach((char, correctIndex) => {
    for (let r = 0; r < REPEATS_PER_CHARACTER; r++) {
      tiles.push({ id: `${idiom.id}-${correctIndex}-${r}`, char, correctIndex, sourceIdiomId: idiom.id, x });
      x += TILE_SPACING;
    }
    if (correctIndex < chars.length - 1) {
      const decoy = validDecoys[correctIndex % validDecoys.length];
      tiles.push({ id: `decoy-${idiom.id}-${correctIndex}`, char: decoy.char, sourceIdiomId: decoy.sourceIdiomId, x });
    }
    x += CHARACTER_GAP;
  });

  return { idiom, tiles, length: x + END_PADDING };
}

/**
 * Three idioms chosen for having 4 *distinct* characters each (no
 * repeats within the idiom) — 一心一意/有始有终/相亲相爱 all repeat a
 * character, which would mean two physically different tiles sharing a
 * glyph where only one "counts" at a given moment; a real design
 * question worth its own pass before extending this mechanic to the
 * rest of the 15 approved idioms, not something to guess at silently.
 */
const DECOY_POOL: DecoySpec[] = [
  { char: "有", sourceIdiomId: "you-shi-you-zhong" },
  { char: "而", sourceIdiomId: "ban-tu-er-fei" },
  { char: "助", sourceIdiomId: "zhu-ren-wei-le" },
];

export const doorLevels: DoorLevel[] = [
  buildLevel("ba-miao-zhu-zhang", DECOY_POOL), // 拔苗助长
  buildLevel("shu-neng-sheng-qiao", DECOY_POOL), // 熟能生巧
  buildLevel("zhi-cuo-jiu-gai", DECOY_POOL), // 知错就改
];
