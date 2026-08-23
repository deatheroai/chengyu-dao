import { describe, it, expect, beforeEach } from "vitest";
import { updateSessionProgress } from "./sessionProgressStatus";

beforeEach(() => {
  document.body.innerHTML = `
    <span data-progress-fraction></span>
    <div data-progress-dots></div>
  `;
});

function dotClasses(): string[][] {
  return Array.from(document.querySelectorAll(".progress-dot")).map((dot) => Array.from(dot.classList));
}

describe("updateSessionProgress", () => {
  it("shows '1/3' and marks only the first dot current, for the first idiom", () => {
    updateSessionProgress(0, 3);
    expect(document.querySelector("[data-progress-fraction]")!.textContent).toBe("1/3");
    const classes = dotClasses();
    expect(classes).toHaveLength(3);
    expect(classes[0]).toContain("current");
    expect(classes[0]).not.toContain("done");
    expect(classes[1]).not.toContain("current");
    expect(classes[1]).not.toContain("done");
    expect(classes[2]).not.toContain("current");
  });

  it("shows '2/3' and marks the first dot done, the second current, for the second idiom", () => {
    updateSessionProgress(1, 3);
    expect(document.querySelector("[data-progress-fraction]")!.textContent).toBe("2/3");
    const classes = dotClasses();
    expect(classes[0]).toContain("done");
    expect(classes[0]).not.toContain("current");
    expect(classes[1]).toContain("current");
    expect(classes[1]).not.toContain("done");
    expect(classes[2]).not.toContain("done");
    expect(classes[2]).not.toContain("current");
  });

  it("shows '3/3' with every dot done and none current once the whole session is complete", () => {
    // Callers pass currentIndex === total (past the last real index) to
    // mean "fully complete," e.g. once the session summary is shown.
    updateSessionProgress(3, 3);
    expect(document.querySelector("[data-progress-fraction]")!.textContent).toBe("3/3");
    const classes = dotClasses();
    expect(classes.every((c) => c.includes("done"))).toBe(true);
    expect(classes.some((c) => c.includes("current"))).toBe(false);
  });

  it("rebuilds the dots if the total changes", () => {
    updateSessionProgress(0, 3);
    expect(dotClasses()).toHaveLength(3);
    updateSessionProgress(0, 5);
    expect(dotClasses()).toHaveLength(5);
  });

  it("does nothing (and does not throw) if the elements are missing", () => {
    document.body.innerHTML = "";
    expect(() => updateSessionProgress(0, 3)).not.toThrow();
  });
});
