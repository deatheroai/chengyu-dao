import { describe, expect, it } from "vitest";
import type { Note } from "./notes";
import { INK, allFixed, choices, correctText, finish, hint, isOver, newRound, parseNote, pick, stamp, tap, writtenText } from "./round";

const note = (over: Partial<Note> = {}): Note => ({
  id: "t",
  level: 3,
  kind: "find",
  emoji: "📝",
  title: "t",
  text: "今天是{睛|晴}天，我们去游{永|泳}。",
  oops: ["睛天！", "游永！"],
  ...over,
});

describe("parseNote", () => {
  it("shows what 团团 wrote and knows the fixed text", () => {
    const p = parseNote(note());
    expect(writtenText(p)).toBe("今天是睛天，我们去游永。");
    expect(correctText(p)).toBe("今天是晴天，我们去游泳。");
    expect(p.mistakes.map((m) => [m.cell, m.wrong, m.right, m.family.id])).toEqual([
      [3, "睛", "晴", "qing"],
      [10, "永", "泳", "yong"],
    ]);
    expect(p.cells[3].mistake).toBe(0);
  });

  it("rejects bad markup", () => {
    expect(() => parseNote(note({ text: "{睛|天}" , oops: ["x"] }))).toThrow(/bad mistake/);
    expect(() => parseNote(note({ text: "{睛晴|晴}", oops: ["x"] }))).toThrow(/bad mistake/);
    expect(() => parseNote(note({ oops: ["x"] }))).toThrow(/oops/);
    expect(() => parseNote(note({ oops: ["x", "y", "z"] }))).toThrow(/oops/);
    expect(() => parseNote(note({ text: "今天{是", oops: [] }))).toThrow(/stray/);
  });
});

describe("a round", () => {
  it("finds mistakes, ignores punctuation and repeats, and fixes with the right pick", () => {
    const p = parseNote(note());
    let s = newRound(p);
    let r = tap(p, s, 3);
    expect(r.result).toEqual({ kind: "found", mistake: 0 });
    s = r.state;
    expect(tap(p, s, 3).result.kind).toBe("nothing");
    expect(tap(p, s, 5).result.kind).toBe("nothing"); // ，
    const wrongPick = pick(p, s, 0, "情");
    expect(wrongPick.right).toBe(false);
    expect(wrongPick.state.ink).toBe(INK); // picking never costs ink
    s = pick(p, wrongPick.state, 0, "晴").state;
    expect(s.fixed).toEqual([0]);
    expect(isOver(p, s)).toBe(false);
    r = tap(p, s, 10);
    s = pick(p, r.state, 1, "泳").state;
    expect(allFixed(p, s)).toBe(true);
    expect(isOver(p, s)).toBe(true);
    expect(stamp(p, s)).toBe("优");
  });

  it("can't fix a mistake before finding it", () => {
    const p = parseNote(note());
    expect(pick(p, newRound(p), 0, "晴").right).toBe(false);
  });

  it("uses a drop of ink per wrong tap, once per character, and ends when it runs out", () => {
    const p = parseNote(note());
    let s = newRound(p);
    let r = tap(p, s, 0);
    expect(r.result).toEqual({ kind: "wrong", out: false });
    s = r.state;
    expect(s.ink).toBe(INK - 1);
    expect(tap(p, s, 0).state.ink).toBe(INK - 1);
    s = tap(p, s, 1).state;
    r = tap(p, s, 2);
    expect(r.result).toEqual({ kind: "wrong", out: true });
    s = r.state;
    expect(s.ended).toBe("ink");
    expect(isOver(p, s)).toBe(true);
    expect(tap(p, s, 3).result.kind).toBe("nothing");
    expect(stamp(p, s)).toBe("加油");
  });

  it("gives 良 for everything found with a few wrong taps", () => {
    const p = parseNote(note());
    let s = newRound(p);
    for (const c of [0, 1, 3, 10]) s = tap(p, s, c).state;
    expect(stamp(p, s)).toBe("良");
  });

  it("costs no ink on the starter note", () => {
    const p = parseNote(note({ starter: true }));
    let s = newRound(p);
    for (const c of [0, 1, 2, 4]) s = tap(p, s, c).state;
    expect(s.ink).toBe(INK);
    expect(s.ended).toBeUndefined();
  });

  it("keeps an essay open until 改好了, and counts what's left as missed", () => {
    const p = parseNote(note({ kind: "essay" }));
    let s = newRound(p);
    s = pick(p, tap(p, s, 3).state, 0, "晴").state;
    expect(isOver(p, s)).toBe(false);
    s = finish(s);
    expect(isOver(p, s)).toBe(true);
    expect(stamp(p, s)).toBe("加油");
    const all = finish(pick(p, tap(p, pick(p, tap(p, newRound(p), 3).state, 0, "晴").state, 10).state, 1, "泳").state);
    expect(stamp(p, all)).toBe("优");
  });
});

describe("choices", () => {
  it("has the right and wrong characters plus family, at most four, in a fixed order", () => {
    const p = parseNote(note());
    const c = choices(p, 0);
    expect(c).toHaveLength(4);
    expect(c).toContain("晴");
    expect(c).toContain("睛");
    expect(new Set(c).size).toBe(4);
    expect(choices(p, 0)).toEqual(c);
    expect(choices(p, 1).sort()).toEqual(["永", "泳"].sort());
  });
});

describe("hint", () => {
  it("narrows down step by step, never costing ink, and starts over for the next mistake", () => {
    const p = parseNote(note());
    let s = newRound(p);
    let h = hint(p, s)!;
    expect(h.hint).toMatchObject({ mistake: 0, step: 1, cells: [0, 1, 2, 3, 4] });
    s = h.state;
    h = hint(p, s)!;
    expect(h.hint.step).toBe(2);
    expect(h.hint.cells).toHaveLength(3);
    expect(h.hint.cells).toContain(3);
    s = h.state;
    h = hint(p, s)!;
    expect(h.hint).toMatchObject({ step: 3, cells: [3] });
    expect(h.hint.clue).toContain("青");
    s = h.state;
    expect(hint(p, s)!.hint.step).toBe(3);
    expect(s.ink).toBe(INK);
    s = tap(p, s, 3).state;
    expect(hint(p, s)!.hint).toMatchObject({ mistake: 1, step: 1, cells: [6, 7, 8, 9, 10] });
    s = tap(p, s, 10).state;
    expect(hint(p, s)).toBeNull();
    expect(stamp(p, { ...s, hints: 9 })).toBe("优"); // hints never lower the stamp
  });
});
