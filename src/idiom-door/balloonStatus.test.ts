import { describe, it, expect, beforeEach } from "vitest";
import { updateBalloonStatus } from "./balloonStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="balloon-status"></div>`;
});

describe("updateBalloonStatus", () => {
  it("sets an unresolved prompt with no outcome yet", () => {
    updateBalloonStatus(false);
    const el = document.getElementById("balloon-status")!;
    expect(el.getAttribute("data-resolved")).toBe("false");
    expect(el.getAttribute("data-outcome")).toBeNull();
    expect(el.textContent).toBe("Fly around and catch the balloon with the idiom that fits!");
  });

  it("announces a wrong (decoy) catch without resolving", () => {
    updateBalloonStatus(false, "wrong");
    const el = document.getElementById("balloon-status")!;
    expect(el.getAttribute("data-resolved")).toBe("false");
    expect(el.getAttribute("data-outcome")).toBe("wrong");
    expect(el.textContent).toBe("Not quite — try another balloon!");
  });

  it("announces resolving on the correct catch", () => {
    updateBalloonStatus(true, "correct");
    const el = document.getElementById("balloon-status")!;
    expect(el.getAttribute("data-resolved")).toBe("true");
    expect(el.getAttribute("data-outcome")).toBe("correct");
    expect(el.textContent).toBe("That's the one! Great reading. 🎈");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateBalloonStatus(false)).not.toThrow();
  });

  it("clears a stale outcome from a previous stage when a fresh render passes none — same lesson as doorStatus.ts", () => {
    updateBalloonStatus(false, "wrong");
    const el = document.getElementById("balloon-status")!;
    expect(el.getAttribute("data-outcome")).toBe("wrong");

    updateBalloonStatus(false);
    expect(el.getAttribute("data-outcome")).toBeNull();
  });
});
