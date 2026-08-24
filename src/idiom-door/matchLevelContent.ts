import { idiomsById } from "../idioms/idioms";
import { createRng, seedFromString } from "./seededRandom";

/**
 * One half-idiom tile: the first two hanzi of a 4-character idiom, or
 * the last two. `half` is which one — the pairing puzzle
 * (matchProgress.ts) considers two tiles a match only when they share
 * `idiomId` *and* have different halves, so a first-half tile can never
 * "match" itself or another first-half tile.
 */
export interface MatchTile {
  id: string;
  text: string;
  pinyin: string;
  idiomId: string;
  half: "first" | "second";
}

export interface MatchLevel {
  idiomIds: string[];
  /** Shuffled once at build time (seeded by the idiom set, so a given
   * session's layout is reproducible) — display order, not pairing
   * order; IdiomMatchScene just lays these out in sequence. */
  tiles: MatchTile[];
}

function fisherYatesShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds the "join the two halves" warm-up level: for each idiom, one
 * tile carrying its first two characters and one carrying its last two.
 * Only defined for 4-character idioms — every idiom currently in
 * idioms.ts is exactly 4 characters, but this is a game about splitting
 * an idiom in half, so a mis-sized entry should fail loudly here rather
 * than silently produce a lopsided or empty tile.
 *
 * Guards against an ambiguous puzzle: if two idioms in the given set
 * happen to share the same first-two or last-two characters, more than
 * one pairing would read as "correct," which this mechanic can't
 * represent (matchProgress.ts only checks idiomId, not text, so a
 * silent collision would just let a wrong pair through undetected).
 * Verified by hand against the current 15-idiom pool (no collisions —
 * see idioms.test.ts), but re-checked here per-level so a future
 * content addition that breaks that can't ship unnoticed.
 */
export function buildMatchLevel(idiomIds: string[]): MatchLevel {
  const tiles: MatchTile[] = [];
  const seenFirsts = new Map<string, string>();
  const seenSeconds = new Map<string, string>();

  for (const id of idiomIds) {
    const idiom = idiomsById[id];
    if (!idiom) throw new Error(`Idiom "${id}" not found in idioms.ts`);
    const chars = Array.from(idiom.hanzi);
    if (chars.length !== 4) {
      throw new Error(`${id}: match level only supports 4-character idioms, got ${chars.length} ("${idiom.hanzi}")`);
    }
    const syllables = idiom.pinyin.split(" ");

    const firstText = chars.slice(0, 2).join("");
    const secondText = chars.slice(2, 4).join("");
    const firstClash = seenFirsts.get(firstText);
    if (firstClash) throw new Error(`Match level: "${id}" and "${firstClash}" share the same first half (${firstText}) — ambiguous pairing`);
    const secondClash = seenSeconds.get(secondText);
    if (secondClash) throw new Error(`Match level: "${id}" and "${secondClash}" share the same second half (${secondText}) — ambiguous pairing`);
    seenFirsts.set(firstText, id);
    seenSeconds.set(secondText, id);

    tiles.push({
      id: `${id}-first`,
      text: firstText,
      pinyin: syllables.slice(0, 2).join(" "),
      idiomId: id,
      half: "first",
    });
    tiles.push({
      id: `${id}-second`,
      text: secondText,
      pinyin: syllables.slice(2, 4).join(" "),
      idiomId: id,
      half: "second",
    });
  }

  const rng = createRng(seedFromString(idiomIds.join("|")));
  return { idiomIds, tiles: fisherYatesShuffle(tiles, rng) };
}

/**
 * The session's warm-up level, drawn from the same 3 idioms
 * levelContent.ts's `doorLevels` uses (yan-er-you-xin / zhu-ren-wei-le
 * / wen-gu-zhi-xin) — this stage runs once, before that per-idiom
 * door/balloon sequence, on the same idiom set rather than a different
 * one, so the halves the child just joined here are the same idioms
 * they immediately go on to practice. Hardcoded rather than imported
 * from levelContent.ts's `doorLevels` to keep this module content-only
 * and decoupled from that one's decoy-pool machinery — see
 * levelContent.ts's own comment on why those 3 were chosen.
 */
export const matchLevel: MatchLevel = buildMatchLevel(["yan-er-you-xin", "zhu-ren-wei-le", "wen-gu-zhi-xin"]);
