import { beforeEach, describe, expect, it } from "vitest";
import { EVERYDAY_CHARS, loadTaught, pickCharsToTeach, saveTaught } from "./teach";
import type { StoryLine } from "./library";

const chars = (lines: StoryLine[], ...rest: Parameters<typeof pickCharsToTeach> extends [unknown, ...infer R] ? R : never) =>
  pickCharsToTeach(lines, ...rest).map((p) => p.char);

describe("pickCharsToTeach", () => {
  it("asks about three characters at most, from the child's lines only", () => {
    const lines: StoryLine[] = [
      { by: "partner", text: "森林里下雨了。" },
      { by: "child", text: "雨点滴答滴答。" },
      { by: "child", text: "小猫躲在树洞。" },
    ];
    const picks = chars(lines);
    expect(picks).toHaveLength(3);
    expect(picks).not.toContain("森");
    expect(picks).toEqual(["雨", "滴", "猫"]);
  });

  it("puts everyday characters last", () => {
    const lines: StoryLine[] = [{ by: "child", text: "我的小狗是白色。" }];
    expect(chars(lines)).toEqual(["狗", "色", "我"]);
    expect(EVERYDAY_CHARS.has("我")).toBe(true);
  });

  it("prefers words the child added in a mission, then starred words", () => {
    const lines: StoryLine[] = [
      { by: "child", text: "猫咪跑过草地。", plain: "猫咪跑过草地。" },
      { by: "child", text: "雨哗啦啦地下。", plain: "雨在下。" },
    ];
    expect(chars(lines)).toEqual(["哗", "猫", "跑"]);
    const feedback = { source: "offline" as const, stars: [{ quote: "草地", why: "好" }] };
    expect(chars(lines, feedback)).toEqual(["草", "哗", "猫"]);
  });

  it("skips characters 团团 already learned when there are others", () => {
    const lines: StoryLine[] = [{ by: "child", text: "雨点滴答响。" }];
    expect(chars(lines, undefined, new Set(["雨", "点"]))).toEqual(["滴", "答", "响"]);
  });

  it("spreads picks over different words when it can", () => {
    expect(chars([{ by: "child", text: "哗啦啦，蝴蝶飞。" }])).toEqual(["哗", "蝴", "飞"]);
    expect(chars([{ by: "child", text: "蝴蝶" }])).toEqual(["蝴", "蝶"]);
  });

  it("keeps the sentence each character came from", () => {
    const picks = pickCharsToTeach([{ by: "child", text: "月亮弯弯。" }]);
    expect(picks[0]).toEqual({ char: "亮", sentence: "月亮弯弯。" });
  });
});

describe("taught characters", () => {
  beforeEach(() => localStorage.clear());

  it("remembers each character once", () => {
    expect(loadTaught()).toEqual([]);
    saveTaught("雨");
    saveTaught("鸟");
    expect(saveTaught("雨")).toEqual(["雨", "鸟"]);
    expect(loadTaught()).toEqual(["雨", "鸟"]);
  });
});
