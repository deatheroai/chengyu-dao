import { describe, it, expect, beforeEach } from "vitest";
import { renderRubyText } from "./rubyText";

describe("renderRubyText", () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `<div id="target"></div>`;
    container = document.getElementById("target")!;
  });

  it("wraps each character with pinyin in a <ruby><rt> pair", () => {
    renderRubyText(container, "你好", ["nǐ", "hǎo"]);
    const rubies = container.querySelectorAll("ruby");
    expect(rubies.length).toBe(2);
    expect(rubies[0].textContent).toBe("你nǐ");
    expect(rubies[0].querySelector("rt")?.textContent).toBe("nǐ");
    expect(rubies[1].querySelector("rt")?.textContent).toBe("hǎo");
  });

  it("appends punctuation (empty-string pinyin) as plain text, not inside a <ruby>", () => {
    renderRubyText(container, "你好，", ["nǐ", "hǎo", ""]);
    expect(container.querySelectorAll("ruby").length).toBe(2);
    expect(container.textContent).toBe("你nǐ好hǎo，");
  });

  it("clears any previously rendered content before rendering new content", () => {
    renderRubyText(container, "你好", ["nǐ", "hǎo"]);
    renderRubyText(container, "谢谢", ["xiè", "xie"]);
    expect(container.querySelectorAll("ruby").length).toBe(2);
    expect(container.textContent).toBe("谢xiè谢xie");
  });

  it("handles an all-punctuation or empty hanzi string without throwing", () => {
    expect(() => renderRubyText(container, "", [])).not.toThrow();
    expect(container.childNodes.length).toBe(0);
  });
});
