import { describe, it, expect, beforeEach } from "vitest";
import { updateWritingStatus, updateWritingFeedback, clearWritingFeedback, updateWritingMeaning, initWritingProgress } from "./writingStatus";

beforeEach(() => {
  document.body.innerHTML = `<div id="writing-status"></div><div id="writing-feedback"></div><p id="writing-meaning"></p><div id="writing-progress"></div>`;
});

describe("updateWritingStatus", () => {
  it("shows the watch phase for the current character", () => {
    updateWritingStatus(0, 4, "拔", "watch");
    const el = document.getElementById("writing-status")!;
    expect(el.getAttribute("data-char-index")).toBe("0");
    expect(el.getAttribute("data-total")).toBe("4");
    expect(el.getAttribute("data-char")).toBe("拔");
    expect(el.getAttribute("data-phase")).toBe("watch");
    expect(el.getAttribute("data-stroke-index")).toBe("0");
    expect(el.textContent).toBe("Watch how to write 拔 (1/4)");
  });

  it("shows the trace phase with the current stroke index", () => {
    updateWritingStatus(1, 4, "苗", "trace", 2);
    const el = document.getElementById("writing-status")!;
    expect(el.getAttribute("data-phase")).toBe("trace");
    expect(el.getAttribute("data-stroke-index")).toBe("2");
    expect(el.textContent).toBe("Your turn — trace 苗");
  });

  it("shows the feedback phase distinctly from trace, so data-phase doesn't linger stale", () => {
    updateWritingStatus(1, 4, "苗", "feedback");
    const el = document.getElementById("writing-status")!;
    expect(el.getAttribute("data-phase")).toBe("feedback");
    expect(el.textContent).toBe("Nicely done, 苗!");
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateWritingStatus(0, 4, "拔", "watch")).not.toThrow();
  });
});

describe("updateWritingFeedback / clearWritingFeedback", () => {
  it("shows a filled-star rating and label, and becomes visible", () => {
    updateWritingFeedback(3, "Perfect writing!", 0);
    const el = document.getElementById("writing-feedback")!;
    expect(el.getAttribute("data-stars")).toBe("3");
    expect(el.getAttribute("data-mistakes")).toBe("0");
    expect(el.textContent).toBe("⭐⭐⭐ Perfect writing!");
    expect(el.classList.contains("visible")).toBe(true);
  });

  it("pads unfilled stars with an empty star, for any rating below the max", () => {
    updateWritingFeedback(1, "Nice try!", 5);
    const el = document.getElementById("writing-feedback")!;
    expect(el.textContent).toBe("⭐☆☆ Nice try!");
  });

  it("shows all empty stars at 0", () => {
    updateWritingFeedback(0, "Keep practicing!", 12);
    const el = document.getElementById("writing-feedback")!;
    expect(el.textContent).toBe("☆☆☆ Keep practicing!");
  });

  it("clearWritingFeedback hides it again", () => {
    updateWritingFeedback(2, "Great job!", 3);
    const el = document.getElementById("writing-feedback")!;
    expect(el.classList.contains("visible")).toBe(true);

    clearWritingFeedback();
    expect(el.classList.contains("visible")).toBe(false);
  });

  it("neither function throws if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateWritingFeedback(2, "Great job!", 1)).not.toThrow();
    expect(() => clearWritingFeedback()).not.toThrow();
  });
});

describe("updateWritingMeaning", () => {
  it("shows the idiom's meaning", () => {
    updateWritingMeaning("to persevere despite difficulty");
    expect(document.getElementById("writing-meaning")!.textContent).toBe('Means: "to persevere despite difficulty"');
  });

  it("does nothing (and does not throw) if the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => updateWritingMeaning("anything")).not.toThrow();
  });
});

describe("initWritingProgress / updateWritingStatus's progress trail", () => {
  it("renders one dot per character, labeled with that character", () => {
    initWritingProgress(["拔", "苗", "助", "长"]);
    const dots = document.querySelectorAll("#writing-progress .writing-progress-dot");
    expect(dots).toHaveLength(4);
    expect(Array.from(dots).map((d) => d.textContent)).toEqual(["拔", "苗", "助", "长"]);
  });

  it("re-rendering (a fresh idiom) replaces the previous dots rather than appending", () => {
    initWritingProgress(["拔", "苗"]);
    initWritingProgress(["再", "接", "再", "厉"]);
    expect(document.querySelectorAll("#writing-progress .writing-progress-dot")).toHaveLength(4);
  });

  it("marks the current character's dot active, and leaves later ones untouched", () => {
    initWritingProgress(["拔", "苗", "助", "长"]);
    updateWritingStatus(1, 4, "苗", "trace", 2);
    const dots = document.querySelectorAll(".writing-progress-dot");
    expect(dots[0].classList.contains("done")).toBe(true);
    expect(dots[1].classList.contains("active")).toBe(true);
    expect(dots[1].classList.contains("done")).toBe(false);
    expect(dots[2].classList.contains("active")).toBe(false);
    expect(dots[2].classList.contains("done")).toBe(false);
  });

  it("marks the current character's dot done once its feedback beat starts, ahead of charIndex advancing", () => {
    initWritingProgress(["拔", "苗", "助", "长"]);
    updateWritingStatus(1, 4, "苗", "feedback");
    const dots = document.querySelectorAll(".writing-progress-dot");
    expect(dots[1].classList.contains("done")).toBe(true);
    expect(dots[1].classList.contains("active")).toBe(false);
  });

  it("does nothing (and does not throw) if the progress element is missing", () => {
    document.body.innerHTML = "";
    expect(() => initWritingProgress(["拔"])).not.toThrow();
    expect(() => updateWritingStatus(0, 4, "拔", "watch")).not.toThrow();
  });
});
