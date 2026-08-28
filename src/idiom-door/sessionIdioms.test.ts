import { describe, it, expect } from "vitest";
import { idioms, idiomsById } from "../idioms/idioms";
import { ELIGIBLE_IDIOM_IDS, IDIOMS_PER_SESSION, pickSessionIdiomIds, todaySeedString, sessionIdiomIds } from "./sessionIdioms";
import { buildMatchLevel } from "./matchLevelContent";

describe("ELIGIBLE_IDIOM_IDS", () => {
  it("contains only real idioms.ts entries", () => {
    for (const id of ELIGIBLE_IDIOM_IDS) expect(idiomsById[id]).toBeDefined();
  });

  it("contains every idiom whose 4 characters are all distinct, and excludes every idiom that repeats one", () => {
    for (const idiom of idioms) {
      const chars = Array.from(idiom.hanzi);
      const isDistinct = new Set(chars).size === chars.length;
      expect(ELIGIBLE_IDIOM_IDS.includes(idiom.id), idiom.id).toBe(isDistinct);
    }
  });

  it("has at least IDIOMS_PER_SESSION entries to draw from", () => {
    expect(ELIGIBLE_IDIOM_IDS.length).toBeGreaterThanOrEqual(IDIOMS_PER_SESSION);
  });

  // The real invariant matchLevelContent.ts's buildMatchLevel depends on:
  // every idiom's "join the halves" puzzle must have exactly one correct
  // answer, even if every eligible idiom were drawn into the same
  // session's match level at once. Checked here (not just against the
  // full 15-idiom pool, as matchLevelContent.test.ts already does) so a
  // future idiom addition that's eligible but collides can't silently
  // break whichever day happens to draw it alongside its collision
  // partner.
  it("has no first-half or last-half collisions across the whole eligible pool", () => {
    expect(() => buildMatchLevel(ELIGIBLE_IDIOM_IDS)).not.toThrow();
  });
});

describe("pickSessionIdiomIds", () => {
  it("returns IDIOMS_PER_SESSION distinct ids, all from the eligible pool", () => {
    const picked = pickSessionIdiomIds("some-seed");
    expect(picked).toHaveLength(IDIOMS_PER_SESSION);
    expect(new Set(picked).size).toBe(picked.length);
    for (const id of picked) expect(ELIGIBLE_IDIOM_IDS).toContain(id);
  });

  it("is deterministic — the same seed always produces the same set, in the same order", () => {
    const a = pickSessionIdiomIds("2026-08-28");
    const b = pickSessionIdiomIds("2026-08-28");
    expect(a).toEqual(b);
  });

  it("different seeds can produce different sets (not hardcoded to one fixed trio)", () => {
    const seeds = Array.from({ length: 20 }, (_, i) => `seed-${i}`);
    const results = new Set(seeds.map((seed) => pickSessionIdiomIds(seed).join(",")));
    expect(results.size).toBeGreaterThan(1);
  });

  it("respects a smaller or larger requested count", () => {
    expect(pickSessionIdiomIds("x", 1)).toHaveLength(1);
    expect(pickSessionIdiomIds("x", ELIGIBLE_IDIOM_IDS.length)).toHaveLength(ELIGIBLE_IDIOM_IDS.length);
  });
});

describe("todaySeedString", () => {
  it("formats a date as its UTC calendar day", () => {
    expect(todaySeedString(new Date("2026-08-28T23:59:00Z"))).toBe("2026-08-28");
    expect(todaySeedString(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("sessionIdiomIds (today's actual session)", () => {
  it("has IDIOMS_PER_SESSION distinct ids, all eligible, matching today's seed", () => {
    expect(sessionIdiomIds).toHaveLength(IDIOMS_PER_SESSION);
    expect(new Set(sessionIdiomIds).size).toBe(sessionIdiomIds.length);
    expect(sessionIdiomIds).toEqual(pickSessionIdiomIds(todaySeedString()));
  });
});
