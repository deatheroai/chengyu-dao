import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openDialPuzzle, closeDialPuzzle } from "./puzzleOverlay";
import type { DialPuzzleConfig } from "../state/types";

const config: DialPuzzleConfig = {
  id: "test",
  title: "Test Dial",
  instructions: "Match it.",
  symbols: ["A", "B", "C"],
  answer: ["B", "C"],
  reward: { setsFlag: "solved" },
  successText: "Nice!",
};

beforeEach(() => {
  document.body.innerHTML = `<div id="puzzle-overlay" class="hidden"></div>`;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("openDialPuzzle", () => {
  it("renders one dial per answer ring, each offering every symbol", () => {
    openDialPuzzle(config, () => {});
    const dials = document.querySelectorAll<HTMLSelectElement>(".puzzle-dial");
    expect(dials).toHaveLength(config.answer.length);
    for (const dial of dials) {
      expect(Array.from(dial.options).map((o) => o.value)).toEqual(config.symbols);
    }
    expect(document.getElementById("puzzle-overlay")!.classList.contains("hidden")).toBe(false);
  });

  it("shows an error and does not solve for a wrong combination", () => {
    const onSolved = vi.fn();
    openDialPuzzle(config, onSolved);
    document.getElementById("puzzle-confirm")!.dispatchEvent(new Event("click"));

    expect(onSolved).not.toHaveBeenCalled();
    const feedback = document.querySelector(".puzzle-feedback")!;
    expect(feedback.className).toContain("error");
    expect(document.getElementById("puzzle-overlay")!.classList.contains("hidden")).toBe(false);
  });

  it("calls onSolved and closes the overlay for the correct combination", () => {
    vi.useFakeTimers();
    const onSolved = vi.fn();
    openDialPuzzle(config, onSolved);

    const dials = document.querySelectorAll<HTMLSelectElement>(".puzzle-dial");
    dials[0].value = "B";
    dials[0].dispatchEvent(new Event("change"));
    dials[1].value = "C";
    dials[1].dispatchEvent(new Event("change"));

    document.getElementById("puzzle-confirm")!.dispatchEvent(new Event("click"));
    expect(document.querySelector(".puzzle-feedback")!.className).toContain("success");
    expect(onSolved).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1200);
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(document.getElementById("puzzle-overlay")!.classList.contains("hidden")).toBe(true);
  });
});

describe("closeDialPuzzle", () => {
  it("hides the overlay and clears its content", () => {
    openDialPuzzle(config, () => {});
    closeDialPuzzle();
    const overlay = document.getElementById("puzzle-overlay")!;
    expect(overlay.classList.contains("hidden")).toBe(true);
    expect(overlay.innerHTML).toBe("");
  });
});
