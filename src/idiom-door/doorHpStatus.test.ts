import { describe, it, expect, beforeEach } from "vitest";
import { updateDoorHpStatus } from "./doorHpStatus";
import { LOW_HP_THRESHOLD } from "./doorHp";

beforeEach(() => {
  document.body.innerHTML = `<div id="door-hp"></div><div id="low-hp-vignette"></div>`;
});

describe("updateDoorHpStatus", () => {
  it("shows the plain HP with no warning while comfortably above the low threshold", () => {
    updateDoorHpStatus(100);
    const el = document.getElementById("door-hp")!;
    expect(el.getAttribute("data-hp")).toBe("100");
    expect(el.getAttribute("data-low")).toBe("false");
    expect(el.textContent).toBe("❤️ 100");
    expect(document.getElementById("low-hp-vignette")!.getAttribute("data-visible")).toBe("false");
  });

  it("flags the low-HP warning at and below the threshold", () => {
    updateDoorHpStatus(LOW_HP_THRESHOLD);
    const el = document.getElementById("door-hp")!;
    expect(el.getAttribute("data-low")).toBe("true");
    expect(el.textContent).toBe(`⚠️ ❤️ ${LOW_HP_THRESHOLD}`);
    expect(document.getElementById("low-hp-vignette")!.getAttribute("data-visible")).toBe("true");
  });

  it("does not flag the warning at 0 HP — that's empty, handled as its own distinct case", () => {
    updateDoorHpStatus(0);
    const el = document.getElementById("door-hp")!;
    expect(el.getAttribute("data-low")).toBe("false");
    expect(el.textContent).toBe("❤️ 0");
    expect(document.getElementById("low-hp-vignette")!.getAttribute("data-visible")).toBe("false");
  });

  it("does nothing (and does not throw) if the door-hp element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateDoorHpStatus(50)).not.toThrow();
  });

  it("does not throw if the vignette element is missing (door-hp still updates)", () => {
    document.body.innerHTML = `<div id="door-hp"></div>`;
    expect(() => updateDoorHpStatus(5)).not.toThrow();
    expect(document.getElementById("door-hp")!.getAttribute("data-low")).toBe("true");
  });
});
