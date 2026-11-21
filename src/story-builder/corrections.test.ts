import { describe, expect, it } from "vitest";
import { COMMON_SLIPS, applyFixes, cleanFixes, findFixes, fixedChars, fixesLeft } from "./corrections";

describe("findFixes", () => {
  it("catches common slips without AI", () => {
    expect(findFixes("我和婆婆去芭莎买菜。")).toEqual([{ wrong: "芭莎", right: "巴刹", why: expect.stringContaining("市场") }]);
    expect(findFixes("我和婆婆去巴刹买菜。")).toEqual([]);
  });

  it("keeps the AI's fixes only when they point at the sentence", () => {
    const ai = [
      { wrong: "蓝球", right: "篮球", why: "投进篮子里" },
      { wrong: "眼镜", right: "眼睛", why: "不在句子里" },
      { wrong: "跑", right: "跑步", why: "长度不同，是改写" },
      { wrong: "他", right: "他", why: "没变" },
      "nonsense",
    ];
    expect(findFixes("我们在操场打蓝球，他跑得很快。", ai)).toEqual([{ wrong: "蓝球", right: "篮球", why: "投进篮子里" }]);
  });

  it("adds slips the AI missed, without doubling one it found", () => {
    const ai = [{ wrong: "芭莎", right: "巴刹", why: "AI 的解释" }];
    const fixes = findFixes("我以经去过芭莎了。", ai);
    expect(fixes.map((f) => f.wrong)).toEqual(["芭莎", "以经"]);
    expect(fixes[0].why).toBe("AI 的解释");
  });

  it("never lists more than three", () => {
    expect(findFixes("芭莎、以经、眼晴、睛天、游永").length).toBe(3);
  });

  it("common slips are never right as written", () => {
    for (const s of COMMON_SLIPS) {
      expect(s.wrong).not.toBe(s.right);
      expect(Array.from(s.wrong).length, s.wrong).toBe(Array.from(s.right).length);
      expect(s.why.length, s.wrong).toBeGreaterThan(3);
    }
    // Safe to match anywhere: these real phrases must not trigger a fix.
    for (const ok of ["现在见面", "他重重地跌倒了", "一个蓝球", "巴沙鱼"]) expect(findFixes(ok), ok).toEqual([]);
  });
});

describe("applying fixes", () => {
  const fixes = [{ wrong: "芭莎", right: "巴刹", why: "" }];
  it("replaces every wrong word and tracks what is left", () => {
    expect(applyFixes("芭莎里，芭莎外。", fixes)).toBe("巴刹里，巴刹外。");
    expect(fixesLeft("芭莎里", fixes)).toHaveLength(1);
    expect(fixesLeft("巴刹里", fixes)).toHaveLength(0);
  });
  it("knows which characters were wrong", () => {
    expect(fixedChars({ wrong: "芭莎", right: "巴刹", why: "" })).toEqual(["巴", "刹"]);
    expect(fixedChars({ wrong: "眼晴", right: "眼睛", why: "" })).toEqual(["睛"]);
  });
  it("cleans stored fixes", () => {
    expect(cleanFixes([{ wrong: "芭莎", right: "巴刹", why: "市场" }, { wrong: "a", right: "a" }, null])).toEqual([
      { wrong: "芭莎", right: "巴刹", why: "市场" },
    ]);
    expect(cleanFixes("x")).toEqual([]);
  });
});
