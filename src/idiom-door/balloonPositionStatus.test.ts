import { describe, it, expect, beforeEach } from "vitest";
import { updateBalloonPosition, updateBalloonCameraScroll, syncBalloonTargetPositions } from "./balloonPositionStatus";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="balloon-position"></div>
    <div id="balloon-camera-scroll"></div>
    <div id="balloon-target-positions"></div>
  `;
});

describe("updateBalloonPosition", () => {
  it("mirrors the avatar's rounded x/y", () => {
    updateBalloonPosition(12.6, -3.2);
    const el = document.getElementById("balloon-position")!;
    expect(el.getAttribute("data-x")).toBe("13");
    expect(el.getAttribute("data-y")).toBe("-3");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateBalloonPosition(0, 0)).not.toThrow();
  });
});

describe("updateBalloonCameraScroll", () => {
  it("mirrors the camera's rounded scroll offset", () => {
    updateBalloonCameraScroll(100.4, 250.9);
    const el = document.getElementById("balloon-camera-scroll")!;
    expect(el.getAttribute("data-x")).toBe("100");
    expect(el.getAttribute("data-y")).toBe("251");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateBalloonCameraScroll(0, 0)).not.toThrow();
  });
});

describe("syncBalloonTargetPositions", () => {
  it("renders one span per balloon with its id, correctness, and rounded position", () => {
    syncBalloonTargetPositions([
      { id: "balloon-a", isCorrect: true, x: 10.2, y: 20.7 },
      { id: "balloon-b", isCorrect: false, x: -5.6, y: 0 },
    ]);
    const spans = document.querySelectorAll("#balloon-target-positions span");
    expect(spans.length).toBe(2);
    expect(spans[0].getAttribute("data-balloon-id")).toBe("balloon-a");
    expect(spans[0].getAttribute("data-correct")).toBe("true");
    expect(spans[0].getAttribute("data-x")).toBe("10");
    expect(spans[0].getAttribute("data-y")).toBe("21");
    expect(spans[1].getAttribute("data-balloon-id")).toBe("balloon-b");
    expect(spans[1].getAttribute("data-correct")).toBe("false");
  });

  it("replaces the previous frame's spans rather than accumulating them", () => {
    syncBalloonTargetPositions([{ id: "balloon-a", isCorrect: true, x: 0, y: 0 }]);
    syncBalloonTargetPositions([{ id: "balloon-a", isCorrect: true, x: 1, y: 1 }]);
    const spans = document.querySelectorAll("#balloon-target-positions span");
    expect(spans.length).toBe(1);
    expect(spans[0].getAttribute("data-x")).toBe("1");
  });

  it("does nothing (and does not throw) if the container is missing", () => {
    document.body.innerHTML = "";
    expect(() => syncBalloonTargetPositions([{ id: "balloon-a", isCorrect: true, x: 0, y: 0 }])).not.toThrow();
  });
});
