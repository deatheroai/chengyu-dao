// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { preventDoubleTapZoom, DOUBLE_TAP_MS } from "./noZoom";

function tap(target: EventTarget, timeStamp: number): Event {
  const event = new Event("touchend", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  target.dispatchEvent(event);
  return event;
}

describe("preventDoubleTapZoom", () => {
  it("cancels the zoom on a quick second tap on the game, but not on a single tap or a slow second one", () => {
    const doc = document.implementation.createHTMLDocument();
    const board = doc.body.appendChild(doc.createElement("div"));
    preventDoubleTapZoom(doc);
    expect(tap(board, 1000).defaultPrevented).toBe(false);
    expect(tap(board, 1000 + DOUBLE_TAP_MS - 50).defaultPrevented).toBe(true);
    expect(tap(board, 5000).defaultPrevented).toBe(false);
  });

  it("leaves buttons alone, so a quick second press still clicks", () => {
    const doc = document.implementation.createHTMLDocument();
    const button = doc.body.appendChild(doc.createElement("button"));
    preventDoubleTapZoom(doc);
    tap(button, 1000);
    expect(tap(button, 1100).defaultPrevented).toBe(false);
  });
});
