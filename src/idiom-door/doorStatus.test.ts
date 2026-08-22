import { describe, it, expect, beforeEach } from "vitest";
import { updateDoorStatus } from "./doorStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="door-status"></div>`;
});

describe("updateDoorStatus", () => {
  it("sets data attributes and a progress message with nothing found yet", () => {
    updateDoorStatus(0, 4, false, "拔");
    const el = document.getElementById("door-status")!;
    expect(el.getAttribute("data-next-index")).toBe("0");
    expect(el.getAttribute("data-total")).toBe("4");
    expect(el.getAttribute("data-complete")).toBe("false");
    expect(el.getAttribute("data-next-char")).toBe("拔");
    expect(el.textContent).toBe("0 of 4 found");
  });

  it("announces advancing", () => {
    updateDoorStatus(1, 4, false, "苗", "advanced");
    const el = document.getElementById("door-status")!;
    expect(el.getAttribute("data-outcome")).toBe("advanced");
    expect(el.textContent).toBe("Yes! 1 of 4 found");
  });

  it("announces a wrong pick, naming the character still being looked for", () => {
    updateDoorStatus(1, 4, false, "苗", "wrong");
    const el = document.getElementById("door-status")!;
    expect(el.getAttribute("data-outcome")).toBe("wrong");
    expect(el.textContent).toBe("Not that one — look for 苗!");
  });

  it("shows a completion message pointing at the door when done", () => {
    updateDoorStatus(4, 4, true, undefined, "advanced");
    const el = document.getElementById("door-status")!;
    expect(el.getAttribute("data-complete")).toBe("true");
    expect(el.textContent).toBe("You found it! Walk to the door →");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateDoorStatus(0, 4, false, "拔")).not.toThrow();
  });

  it("clears a stale outcome/next-char from a previous call when a fresh render passes none", () => {
    // Simulates starting a new level right after the previous one's
    // last grab — a real bug found via E2E: the attribute used to keep
    // whichever outcome was last set, even once a new level's initial
    // (outcome-less) render happened.
    updateDoorStatus(1, 4, false, "苗", "advanced");
    const el = document.getElementById("door-status")!;
    expect(el.getAttribute("data-outcome")).toBe("advanced");

    updateDoorStatus(0, 4, false, "拔");
    expect(el.getAttribute("data-outcome")).toBeNull();
    expect(el.getAttribute("data-next-char")).toBe("拔");
  });
});
