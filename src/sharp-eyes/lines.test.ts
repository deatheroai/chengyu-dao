import { describe, expect, it } from "vitest";
import { fixedLine, hintLine, homeLine, openLine, praise, stampLine, wrongPickLine, wrongTapLine } from "./lines";

describe("团团's lines", () => {
  it("ask for help on the first visit and count notes after", () => {
    expect(homeLine(0)).toContain("帮我");
    expect(homeLine(2)).toContain("2 张");
    expect(homeLine(5)).toContain("火眼金睛");
  });

  it("tell the count, except in an essay", () => {
    expect(openLine(3, false, false)).toContain("3 个");
    expect(openLine(3, true, false)).not.toMatch(/\d/);
    expect(openLine(1, false, true)).toContain("一个");
  });

  it("vary the praise from one find to the next", () => {
    expect(praise(1)).not.toBe(praise(2));
    expect(praise(7)).toBe(praise(1));
  });

  it("never call a right character wrong, and count the ink left", () => {
    expect(wrongTapLine(false, 2)).toContain("2 滴");
    expect(wrongTapLine(true, 3)).toContain("不用墨水");
    expect(wrongTapLine(false, 0)).toContain("没墨水");
  });

  it("explain a wrong pick with what that character means", () => {
    expect(wrongPickLine("睛")).toContain("眼睛");
    expect(fixedLine("晴")).toContain("晴天");
    expect(wrongPickLine("？")).toContain("再想想");
  });

  it("narrow hints down and give the clue last", () => {
    expect(hintLine(1)).toContain("这一句");
    expect(hintLine(3, "看偏旁")).toContain("看偏旁");
  });

  it("thank her for each stamp", () => {
    expect(stampLine("优", true)).toContain("妈妈");
    expect(stampLine("加油", false)).toContain("加油");
  });
});
