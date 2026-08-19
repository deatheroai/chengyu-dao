import { describe, it, expect, beforeEach } from "vitest";
import { updateCatchStatus } from "./domStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="catch-status"></div>`;
});

describe("updateCatchStatus", () => {
  it("sets data attributes and a progress message with no catch yet", () => {
    updateCatchStatus(0, 4, false);
    const el = document.getElementById("catch-status")!;
    expect(el.getAttribute("data-revealed-count")).toBe("0");
    expect(el.getAttribute("data-total")).toBe("4");
    expect(el.getAttribute("data-complete")).toBe("false");
    expect(el.textContent).toBe("0 of 4 caught");
  });

  it("announces a correct catch", () => {
    updateCatchStatus(1, 4, false, "correct");
    const el = document.getElementById("catch-status")!;
    expect(el.getAttribute("data-just-caught")).toBe("correct");
    expect(el.textContent).toBe("Caught one! (1 of 4)");
  });

  it("announces a decoy catch gently, without changing revealed count", () => {
    updateCatchStatus(1, 4, false, "decoy");
    const el = document.getElementById("catch-status")!;
    expect(el.getAttribute("data-just-caught")).toBe("decoy");
    expect(el.textContent).toBe("Not quite — try another one! (1 of 4)");
  });

  it("shows a completion message and sets data-complete when done", () => {
    updateCatchStatus(4, 4, true, "correct");
    const el = document.getElementById("catch-status")!;
    expect(el.getAttribute("data-complete")).toBe("true");
    expect(el.textContent).toBe("You caught its meaning! 🎉");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateCatchStatus(1, 4, false)).not.toThrow();
  });
});
