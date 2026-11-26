import { describe, expect, it } from "vitest";
import { NOTES, starterNote } from "./notes";
import type { Progress } from "./progress";
import { currentLevel, isFast, levelProgress, nextStageLabel, pickNotes, planSession, report, toNextLevel } from "./session";

const none: Progress = { stamps: {} };
const allBest = (level: number, share = 1): Progress => {
  const notes = NOTES.filter((n) => n.level === level);
  const stamps: Progress["stamps"] = {};
  notes.slice(0, Math.ceil(notes.length * share)).forEach((n) => (stamps[n.id] = "优"));
  return { stamps };
};

describe("levels", () => {
  it("start at P3 and open the next level at 60% 优", () => {
    expect(currentLevel(none)).toBe(3);
    const p3 = levelProgress(none, 3);
    expect(p3.needed).toBe(Math.ceil(p3.total * 0.6));
    expect(toNextLevel(none, 3)).toBe(p3.needed);
    expect(currentLevel(allBest(3, 0.5))).toBe(3);
    expect(currentLevel(allBest(3, 0.6))).toBe(4);
    const both = { stamps: { ...allBest(3).stamps, ...allBest(4).stamps } };
    expect(currentLevel(both)).toBe(5);
    expect(toNextLevel(both, 5)).toBe(0);
  });

  it("don't count 良 or 加油 towards the next level", () => {
    const p: Progress = { stamps: Object.fromEntries(NOTES.filter((n) => n.level === 3).map((n) => [n.id, "良"])) };
    expect(currentLevel(p)).toBe(3);
  });
});

describe("planning a session", () => {
  it("opens the first ever session with the starter", () => {
    const plan = planSession(none);
    expect(plan.map((s) => s.kind)).toEqual(["find", "find", "quick", "essay"]);
    expect(plan[0].notes[0].id).toBe(starterNote().id);
    expect(plan[1].notes[0].starter).toBeFalsy();
    expect(plan[2].notes).toHaveLength(3);
    expect(plan.flatMap((s) => s.notes).every((n) => n.level === 3)).toBe(true);
  });

  it("then plays two notes, 快手改 and the essay at her level, new notes first", () => {
    const p: Progress = { stamps: { [starterNote().id]: "优", "p3-lift": "优" } };
    const plan = planSession(p);
    expect(plan.map((s) => s.kind)).toEqual(["find", "find", "quick", "essay"]);
    const finds = plan.filter((s) => s.kind === "find").map((s) => s.notes[0].id);
    expect(finds).not.toContain("p3-lift");
    expect(finds).not.toContain(starterNote().id);
    const p4 = planSession(p, 4);
    expect(p4.flatMap((s) => s.notes).every((n) => n.level === 4)).toBe(true);
  });

  it("picks not-yet-优 notes before ones already 优, never the same note twice", () => {
    const quick = NOTES.filter((n) => n.level === 3 && n.kind === "quick");
    const p: Progress = { stamps: { [quick[0].id]: "优", [quick[1].id]: "加油" } };
    const picked = pickNotes(p, 3, "quick", quick.length);
    expect(picked.at(-1)!.id).toBe(quick[0].id);
    expect(picked.findIndex((n) => n.id === quick[1].id)).toBeGreaterThan(picked.findIndex((n) => !p.stamps[n.id]));
    expect(pickNotes(p, 3, "quick", 3, [quick[2].id]).map((n) => n.id)).not.toContain(quick[2].id);
    expect(new Set(picked.map((n) => n.id)).size).toBe(picked.length);
  });
});

describe("快手改 and the report card", () => {
  it("gives ⚡ within the time", () => {
    expect(isFast(3, 20)).toBe(true);
    expect(isFast(3, 21)).toBe(false);
    expect(isFast(5, 24)).toBe(true);
  });

  it("counts 优, ⚡ and 金笔, and notices a new best", () => {
    const r = report(
      [
        { kind: "find", stamps: ["优"], pen: true },
        { kind: "find", stamps: ["良"] },
        { kind: "quick", stamps: ["优", "优", "加油"], fast: 2 },
        { kind: "essay", stamps: ["优"], pen: true },
      ],
      3,
    );
    expect(r).toMatchObject({ best: 4, total: 6, fast: 2, pens: 2, beatBest: true });
    expect(r.line).toContain("最好");
    expect(report([{ kind: "find", stamps: ["优"] }], 0).line).toContain("全部");
    expect(report([{ kind: "find", stamps: ["加油"] }], 2).line).toContain("幸好有你");
  });

  it("names the next stage on the button", () => {
    expect(nextStageLabel({ kind: "quick", notes: [] })).toContain("快手改");
    expect(nextStageLabel({ kind: "essay", notes: [] })).toContain("作文");
    expect(nextStageLabel(undefined)).toContain("成绩单");
  });
});
