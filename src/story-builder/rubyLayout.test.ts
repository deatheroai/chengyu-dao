import { describe, expect, it } from "vitest";
import { charPinyin } from "./pinyin";
import { renderPinyin } from "./rubyLayout";

function render(text: string): HTMLElement {
  const el = document.createElement("p");
  renderPinyin(el, text, charPinyin(text));
  return el;
}

describe("renderPinyin", () => {
  it("puts each syllable over its own character", () => {
    const el = render("时候");
    expect([...el.querySelectorAll("ruby")].map((r) => r.firstChild?.textContent)).toEqual(["时", "候"]);
    expect([...el.querySelectorAll("rt")].map((r) => r.textContent)).toEqual(["shí", "hou"]);
    expect(el.textContent).toBe("时shí候hou");
  });

  it("gives punctuation its own column, glued to the character before it", () => {
    const el = render("响了！美玲");
    const glue = el.querySelector(".py-glue")!;
    expect(glue.textContent).toBe("了le！");
    expect(glue.querySelector(".py-punct")?.textContent).toBe("！");
    expect(el.querySelectorAll("rt")).toHaveLength(4);
  });

  it("glues an opening quote to the character after it", () => {
    const el = render("说“小息”。");
    const glues = [...el.querySelectorAll(".py-glue")].map((g) => g.textContent);
    expect(glues).toEqual(["“小xiǎo", "息xī”。"]);
  });

  it("keeps spaces and text without pinyin", () => {
    const el = render("ok 好");
    expect(el.textContent).toBe("ok 好hǎo");
  });
});
