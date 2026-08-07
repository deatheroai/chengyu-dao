import { describe, it, expect, beforeEach } from "vitest";
import { updateRevealStatus } from "./domStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="reveal-status"></div>`;
});

describe("updateRevealStatus", () => {
  it("sets data attributes and a progress message", () => {
    updateRevealStatus(1, 4, false);
    const el = document.getElementById("reveal-status")!;
    expect(el.getAttribute("data-revealed-count")).toBe("1");
    expect(el.getAttribute("data-total")).toBe("4");
    expect(el.getAttribute("data-complete")).toBe("false");
    expect(el.textContent).toBe("1 of 4 revealed");
  });

  it("announces the just-revealed character when provided", () => {
    updateRevealStatus(2, 4, false, "心");
    expect(document.getElementById("reveal-status")!.textContent).toBe("心 revealed! (2 of 4)");
  });

  it("shows a completion message and sets data-complete when done", () => {
    updateRevealStatus(4, 4, true);
    const el = document.getElementById("reveal-status")!;
    expect(el.getAttribute("data-complete")).toBe("true");
    expect(el.textContent).toBe("All characters revealed!");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateRevealStatus(1, 4, false)).not.toThrow();
  });
});
