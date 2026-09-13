import { describe, it, expect, beforeEach } from "vitest";
import { updateMatchMilestoneRoundStatus } from "./matchMilestoneRoundStatus";

beforeEach(() => {
  document.body.innerHTML = `
    <span data-milestone-round-fraction></span>
    <div data-milestone-round-dots></div>
  `;
});

function dotClasses(): string[][] {
  return Array.from(document.querySelectorAll(".progress-dot")).map((dot) => Array.from(dot.classList));
}

describe("updateMatchMilestoneRoundStatus", () => {
  it("shows 'Round 1/3' and marks only the first dot current, for the first sub-round", () => {
    updateMatchMilestoneRoundStatus(0, 3);
    expect(document.querySelector("[data-milestone-round-fraction]")!.textContent).toBe("Round 1/3");
    const classes = dotClasses();
    expect(classes).toHaveLength(3);
    expect(classes[0]).toContain("current");
    expect(classes[1]).not.toContain("current");
    expect(classes[1]).not.toContain("done");
  });

  it("shows 'Round 2/3' and marks the first dot done, the second current", () => {
    updateMatchMilestoneRoundStatus(1, 3);
    expect(document.querySelector("[data-milestone-round-fraction]")!.textContent).toBe("Round 2/3");
    const classes = dotClasses();
    expect(classes[0]).toContain("done");
    expect(classes[0]).not.toContain("current");
    expect(classes[1]).toContain("current");
  });

  it("shows every dot done and none current once currentRoundIndex reaches total (fully complete)", () => {
    updateMatchMilestoneRoundStatus(3, 3);
    expect(document.querySelector("[data-milestone-round-fraction]")!.textContent).toBe("Round 3/3");
    const classes = dotClasses();
    expect(classes.every((c) => c.includes("done"))).toBe(true);
    expect(classes.some((c) => c.includes("current"))).toBe(false);
  });

  it("rebuilds the dots if the total changes", () => {
    updateMatchMilestoneRoundStatus(0, 3);
    expect(dotClasses()).toHaveLength(3);
    updateMatchMilestoneRoundStatus(0, 5);
    expect(dotClasses()).toHaveLength(5);
  });

  it("does nothing (and does not throw) if the elements are missing", () => {
    document.body.innerHTML = "";
    expect(() => updateMatchMilestoneRoundStatus(0, 3)).not.toThrow();
  });
});
