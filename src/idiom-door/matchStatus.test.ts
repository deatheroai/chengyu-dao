import { describe, it, expect, beforeEach } from "vitest";
import { updateMatchStatus } from "./matchStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="match-status"></div>`;
});

describe("updateMatchStatus", () => {
  it("sets data attributes and a progress message with nothing matched yet", () => {
    updateMatchStatus(0, 3, false);
    const el = document.getElementById("match-status")!;
    expect(el.getAttribute("data-matched-pairs")).toBe("0");
    expect(el.getAttribute("data-total-pairs")).toBe("3");
    expect(el.getAttribute("data-complete")).toBe("false");
    expect(el.textContent).toBe("0 of 3 joined");
  });

  it("announces a match", () => {
    updateMatchStatus(1, 3, false, "matched");
    const el = document.getElementById("match-status")!;
    expect(el.getAttribute("data-outcome")).toBe("matched");
    expect(el.textContent).toBe("Yes! 1 of 3 joined");
  });

  it("announces a wrong pair", () => {
    updateMatchStatus(1, 3, false, "wrong");
    const el = document.getElementById("match-status")!;
    expect(el.getAttribute("data-outcome")).toBe("wrong");
    expect(el.textContent).toBe("Not quite — try another pair!");
  });

  it("shows a completion message once every pair is joined", () => {
    updateMatchStatus(3, 3, true, "matched");
    const el = document.getElementById("match-status")!;
    expect(el.getAttribute("data-complete")).toBe("true");
    expect(el.textContent).toBe("You joined them all! 🎉");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateMatchStatus(0, 3, false)).not.toThrow();
  });

  it("clears a stale outcome from a previous call when a fresh render passes none", () => {
    updateMatchStatus(1, 3, false, "wrong");
    const el = document.getElementById("match-status")!;
    expect(el.getAttribute("data-outcome")).toBe("wrong");

    updateMatchStatus(1, 3, false);
    expect(el.getAttribute("data-outcome")).toBeNull();
  });
});
