import { describe, it, expect, beforeEach } from "vitest";
import { updatePlayerPosition } from "./positionStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="player-position"></div>`;
});

describe("updatePlayerPosition", () => {
  it("sets a rounded data-x attribute", () => {
    updatePlayerPosition(123.7);
    expect(document.getElementById("player-position")!.getAttribute("data-x")).toBe("124");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updatePlayerPosition(10)).not.toThrow();
  });
});
