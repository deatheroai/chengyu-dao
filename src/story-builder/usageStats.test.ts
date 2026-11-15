import { describe, expect, it } from "vitest";
import { costUsd, lastDays, summarize, toDayUsage } from "./usageStats";

describe("usage stats", () => {
  it("prices tokens at Haiku 5.5 rates", () => {
    expect(costUsd(1_000_000, 0)).toBeCloseTo(0.1);
    expect(costUsd(0, 1_000_000)).toBeCloseTo(0.5);
    expect(costUsd(2000, 400)).toBeCloseTo(0.0004);
  });

  it("reads stored hashes, tolerating strings and missing days", () => {
    expect(toDayUsage("2026-11-15", { calls: "3", endings: "1", input: "6000", output: "1200" })).toEqual({
      day: "2026-11-15",
      calls: 3,
      endings: 1,
      input: 6000,
      output: 1200,
    });
    expect(toDayUsage("2026-11-14", null)).toEqual({ day: "2026-11-14", calls: 0, endings: 0, input: 0, output: 0 });
    expect(toDayUsage("2026-11-13", { calls: "x" }).calls).toBe(0);
  });

  it("sums days and works out cost per finished story", () => {
    const s = summarize([
      { day: "a", calls: 3, endings: 1, input: 6000, output: 1200 },
      { day: "b", calls: 4, endings: 1, input: 8000, output: 1600 },
    ]);
    expect(s).toMatchObject({ days: 2, calls: 7, inputTokens: 14000, outputTokens: 2800, storiesFinished: 2 });
    expect(s.costUsd).toBeCloseTo(0.0028);
    expect(s.costPerStoryUsd).toBeCloseTo(0.0014);
    expect(summarize([{ day: "a", calls: 1, endings: 0, input: 10, output: 10 }]).costPerStoryUsd).toBeNull();
  });

  it("lists the last days newest first", () => {
    expect(lastDays(new Date("2026-11-15T03:00:00Z"), 3)).toEqual(["2026-11-15", "2026-11-14", "2026-11-13"]);
  });
});
