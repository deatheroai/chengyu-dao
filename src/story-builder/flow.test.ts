import { describe, expect, it } from "vitest";
import { ADVENTURES } from "./adventures";
import { TURNS, isChoiceTurn, openingBeat, pickMission, scriptedChoices, scriptedNext, shuffled, wheelRotation } from "./flow";
import { SENSE_IDS } from "./senses";

const adventure = ADVENTURES[0];

describe("scripted beats", () => {
  it("opens with the adventure's first beat and hints for every mission", () => {
    const beat = openingBeat(adventure);
    expect(beat.line).toBe(adventure.beats[0].partner);
    expect(beat.question).toBe(adventure.beats[0].prompt);
    for (const s of SENSE_IDS) expect(beat.hints[s].length).toBeGreaterThan(0);
    expect(beat.hints.hear[0]).toBe(adventure.beats[0].words.hear![0]);
  });

  it("continues with the next beat, then ends after the last turn", () => {
    expect(scriptedNext(adventure, 0).line).toBe(adventure.beats[1].partner);
    const end = scriptedNext(adventure, TURNS - 1);
    expect(end.line).toBe(adventure.ending);
    expect(end.question).toBe("");
  });

  it("has generic beats for a child's own story", () => {
    for (let t = 0; t < TURNS - 1; t++) expect(scriptedNext(undefined, t).question).not.toBe("");
    expect(scriptedNext(undefined, TURNS - 1).question).toBe("");
  });

  it("carries each beat's 🤔 guide, including the choices and a child's own story", () => {
    const opening = openingBeat(adventure).guide;
    expect(opening?.explain).toBe(adventure.beats[0].explain);
    expect(opening?.starters).toEqual(adventure.beats[0].starters);
    expect(opening?.example).toBe(adventure.beats[0].example.rich);
    for (const c of scriptedChoices(adventure, 0)) expect(c.guide?.explain).toBeTruthy();
    for (const c of scriptedChoices(undefined, 0)) expect(c.guide?.starters.length).toBeGreaterThan(0);
  });

  it("every adventure has enough beats for a full story", () => {
    for (const a of ADVENTURES) expect(a.beats.length).toBeGreaterThanOrEqual(TURNS);
  });
});

describe("pickMission", () => {
  it("avoids senses already used", () => {
    for (let i = 0; i < 20; i++) {
      expect(["smell", "touch", "feel", "pattern"]).toContain(pickMission(["see", "hear"], () => i / 20));
    }
  });
  it("falls back to any sense when all are used", () => {
    expect(SENSE_IDS).toContain(pickMission([...SENSE_IDS], () => 0.99));
  });
});

describe("wheelRotation", () => {
  it("lands the chosen slot under the pointer after at least three turns", () => {
    let angle = 0;
    for (const i of [0, 3, 5, 1]) {
      const next = wheelRotation(angle, i);
      expect(next - angle).toBeGreaterThanOrEqual(3 * 360);
      expect((((i * 60 + next) % 360) + 360) % 360).toBe(0);
      angle = next;
    }
  });
});

describe("团团's choices", () => {
  it("happens once, in the middle of the story", () => {
    const turns = Array.from({ length: TURNS }, (_, t) => t).filter(isChoiceTurn);
    expect(turns).toHaveLength(1);
    expect(turns[0] + 1).toBeLessThan(TURNS);
  });

  it("offers three different pre-written ways for every adventure, sharing the beat's hints", () => {
    const t = Array.from({ length: TURNS }, (_, i) => i).find(isChoiceTurn)!;
    for (const a of ADVENTURES) {
      const choices = scriptedChoices(a, t);
      expect(choices).toHaveLength(3);
      expect(choices[0]).toEqual(scriptedNext(a, t));
      expect(new Set(choices.map((c) => c.line)).size).toBe(3);
      for (const c of choices) {
        expect(c.question).not.toBe("");
        expect(c.hints).toEqual(choices[0].hints);
      }
    }
    expect(scriptedChoices(undefined, t)).toHaveLength(3);
  });

  it("shuffles without losing or adding anything", () => {
    const items = ["a", "b", "c"];
    for (const r of [0, 0.5, 0.99]) expect(shuffled(items, () => r).sort()).toEqual(items);
    expect(items).toEqual(["a", "b", "c"]);
  });
});
