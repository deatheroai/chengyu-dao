import { describe, expect, it } from "vitest";
import { ADVENTURES } from "./adventures";
import { TURNS, openingBeat, pickMission, scriptedNext, wheelRotation } from "./flow";
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
