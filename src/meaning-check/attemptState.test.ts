import { describe, it, expect } from "vitest";
import { evaluateAttempt } from "./attemptState";

describe("evaluateAttempt", () => {
  it("marks correct immediately on a correct first pick", () => {
    expect(evaluateAttempt(true, 0)).toEqual({ attempts: 1, status: "correct" });
  });

  it("marks correct even after prior wrong attempts", () => {
    expect(evaluateAttempt(true, 1)).toEqual({ attempts: 2, status: "correct" });
  });

  it("invites another try on the first wrong pick (with default maxAttempts)", () => {
    expect(evaluateAttempt(false, 0)).toEqual({ attempts: 1, status: "wrong-try-again" });
  });

  it("reveals the answer once maxAttempts wrong picks are reached", () => {
    expect(evaluateAttempt(false, 1)).toEqual({ attempts: 2, status: "revealed" });
  });

  it("respects a custom maxAttempts", () => {
    expect(evaluateAttempt(false, 0, 3)).toEqual({ attempts: 1, status: "wrong-try-again" });
    expect(evaluateAttempt(false, 1, 3)).toEqual({ attempts: 2, status: "wrong-try-again" });
    expect(evaluateAttempt(false, 2, 3)).toEqual({ attempts: 3, status: "revealed" });
  });

  it("never returns a failure/game-over status — only choosing states or correct", () => {
    const statuses = new Set<string>();
    for (let i = 0; i < 5; i++) {
      statuses.add(evaluateAttempt(false, i).status);
      statuses.add(evaluateAttempt(true, i).status);
    }
    for (const status of statuses) {
      expect(["correct", "wrong-try-again", "revealed"]).toContain(status);
    }
  });
});
