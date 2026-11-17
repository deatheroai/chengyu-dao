import { describe, expect, it } from "vitest";
import {
  addedText,
  cleanFeedbackOut,
  cleanStoryFeedback,
  feedbackFromAi,
  isRewrite,
  offlineFeedback,
  repeatedWord,
  timesUsed,
  type ChildSentence,
} from "./feedback";

/** The child's sentences from the saved story 我养宠物的天 (2026-11-17). */
const PET_DAY: ChildSentence[] = [
  {
    text: "我想一会儿，就叫它小大。我说：“你好。”它叫了一声“咕！”",
    plain: "我想一会儿，就叫它小大。",
    mission: "hear",
    missionDone: true,
  },
  { text: "小兔看到太阳亮亮的，像火一样亮。", plain: "小兔看到太阳亮亮的。", mission: "pattern", missionDone: true },
  { text: "原来是冰淇淋的味道，它心里觉得软软的。", plain: "原来是冰淇淋的味道。", mission: "feel", missionDone: true },
];
const SENTENCES = PET_DAY.map((l) => l.text);

describe("addedText", () => {
  it("finds what the mission added", () => {
    expect(addedText("小兔看到太阳亮亮的。", "小兔看到太阳亮亮的，像火一样亮。")).toBe("像火一样亮");
    expect(addedText("原来是冰淇淋的味道。", "原来是冰淇淋的味道，它心里觉得软软的。")).toBe("它心里觉得软软的");
    expect(addedText("雨很大。", "雨哗啦啦地下着，很大。")).toBe("哗啦啦地下着");
    expect(addedText("一样。", "一样。")).toBe("");
  });
});

describe("repeated everyday words", () => {
  it("counts a doubled word like 亮亮 once", () => {
    expect(timesUsed("太阳亮亮的", "亮")).toBe(1);
    expect(timesUsed("太阳亮亮的，像火一样亮", "亮")).toBe(2);
  });

  it("spots 亮 used twice", () => {
    expect(repeatedWord(SENTENCES[1])).toBe("亮");
    expect(repeatedWord(SENTENCES[2])).toBeUndefined();
  });
});

describe("offline card", () => {
  it("stars what two missions added and wishes on the repeated word", () => {
    const card = offlineFeedback(PET_DAY);
    expect(card.source).toBe("offline");
    expect(card.stars.map((s) => s.quote)).toEqual(["我说：“你好。”它叫了一声“咕！”", "像火一样亮"]);
    expect(card.stars[1].why).toContain("比喻");
    expect(card.wish).toMatchObject({ sentence: SENTENCES[1], words: ["闪闪发光", "亮晶晶的", "金灿灿的"] });
    expect(card.wish?.tip).toContain("亮");
  });

  it("skips missions that weren't done and has no wish without a repeat", () => {
    const card = offlineFeedback([{ text: "小猫跑了。", plain: "小猫跑了。", mission: "see", missionDone: false }]);
    expect(card.stars).toEqual([]);
    expect(card.wish).toBeUndefined();
  });
});

describe("AI feedback", () => {
  const ai = {
    stars: [
      { quote: "咕！", why: "小兔好像真的在说话！" },
      { quote: "像火一样亮", why: "好棒的比喻！" },
    ],
    wish: { turn: 2, tip: "“亮”用了两次哦，换一个词？", words: ["金灿灿的", "红彤彤的", "闪闪发光"] },
  };

  it("matches the wish to the child's sentence by number", () => {
    const card = feedbackFromAi(cleanFeedbackOut(ai), SENTENCES);
    expect(card?.source).toBe("ai");
    expect(card?.stars).toHaveLength(2);
    expect(card?.wish?.sentence).toBe(SENTENCES[1]);
  });

  it("drops quotes the child never wrote and wishes that point nowhere", () => {
    const card = feedbackFromAi(
      { stars: [{ quote: "金灿灿", why: "好！" }, ai.stars[0]], wish: { ...ai.wish, turn: 9 } },
      SENTENCES,
    );
    expect(card?.stars.map((s) => s.quote)).toEqual(["咕！"]);
    expect(card?.wish).toBeUndefined();
    expect(feedbackFromAi({ stars: [], wish: { turn: 0, tip: "", words: [] } }, SENTENCES)).toBeNull();
  });

  it("rejects a malformed shape", () => {
    expect(cleanFeedbackOut({ stars: "no" })).toBeNull();
    expect(cleanFeedbackOut(null)).toBeNull();
  });
});

describe("stored card", () => {
  it("keeps a valid card and the child's rewrite", () => {
    const card = { source: "ai", stars: [{ quote: "咕", why: "好" }], wish: { sentence: "a", tip: "b", words: ["c"], rewritten: "d" } };
    expect(cleanStoryFeedback(card)).toEqual(card);
    expect(cleanStoryFeedback({ source: "x", stars: [] })).toBeUndefined();
  });
});

describe("isRewrite", () => {
  it("needs a real change of words", () => {
    expect(isRewrite("小兔看到太阳亮亮的，像火一样亮。", "小兔看到太阳金灿灿的，像火一样亮。")).toBe(true);
    expect(isRewrite("小兔看到太阳亮亮的。", "小兔看到太阳亮亮的！")).toBe(false);
    expect(isRewrite("小兔看到太阳亮亮的。", "小兔")).toBe(false);
  });
});
