import { describe, expect, it } from "vitest";
import { cleanStartResponse, cleanTurnResponse, parsePartnerRequest } from "./partnerApi";

const hints = { see: ["红红的"], hear: ["哗啦啦"], smell: [], touch: [], feel: [], pattern: [] };
const turn = {
  action: "turn",
  story: [{ by: "partner", text: "下雨了。" }],
  original: "雨很大。",
  sentence: "雨哗啦啦地下着。",
  mission: "hear",
  turnsLeft: 1,
};

describe("parsePartnerRequest", () => {
  it("accepts a valid start and turn, trimming text", () => {
    expect(parsePartnerRequest({ action: "start", idea: " 会飞的小狗 " })).toEqual({ action: "start", idea: "会飞的小狗" });
    expect(parsePartnerRequest(turn)).toEqual(turn);
  });

  it("rejects bad shapes and oversized input", () => {
    expect(parsePartnerRequest(null)).toEqual({ error: "invalid-body" });
    expect(parsePartnerRequest({ action: "nope" })).toEqual({ error: "invalid-action" });
    expect(parsePartnerRequest({ action: "start", idea: "" })).toEqual({ error: "invalid-idea" });
    expect(parsePartnerRequest({ action: "start", idea: "长".repeat(61) })).toEqual({ error: "invalid-idea" });
    expect(parsePartnerRequest({ ...turn, story: [] })).toEqual({ error: "invalid-story" });
    expect(parsePartnerRequest({ ...turn, story: [{ by: "admin", text: "x" }] })).toEqual({ error: "invalid-story" });
    expect(parsePartnerRequest({ ...turn, story: Array(17).fill({ by: "child", text: "好" }) })).toEqual({ error: "invalid-story" });
    expect(parsePartnerRequest({ ...turn, sentence: "长".repeat(121) })).toEqual({ error: "invalid-sentence" });
    expect(parsePartnerRequest({ ...turn, mission: "taste" })).toEqual({ error: "invalid-mission" });
    expect(parsePartnerRequest({ ...turn, turnsLeft: -1 })).toEqual({ error: "invalid-turns" });
    expect(parsePartnerRequest({ ...turn, writer: "teacher" })).toEqual({ error: "invalid-writer" });
  });

  it("accepts a parent's turn without a mission, and parent lines in the story", () => {
    const { mission: _m, ...noMission } = turn;
    const parent = { ...noMission, writer: "parent", story: [...turn.story, { by: "parent", text: "小猫笑了。" }] };
    expect(parsePartnerRequest(parent)).toEqual(parent);
    expect(parsePartnerRequest({ ...parent, mission: "hear" })).not.toHaveProperty("mission");
    expect(parsePartnerRequest(noMission)).toEqual({ error: "invalid-mission" });
  });

  it("keeps a request for choices only while the story goes on", () => {
    expect(parsePartnerRequest({ ...turn, choices: true })).toEqual({ ...turn, choices: true });
    expect(parsePartnerRequest({ ...turn, choices: true, turnsLeft: 0 })).not.toHaveProperty("choices");
    expect(parsePartnerRequest({ ...turn, choices: "yes" })).not.toHaveProperty("choices");
  });
});

describe("cleaning responses", () => {
  it("keeps a good turn response and caps hints at three", () => {
    const out = cleanTurnResponse({
      missionDone: true,
      reaction: " 我听到雨声了！ ",
      hint: "",
      next: { line: "小猫跑了出去。", question: "然后呢？", hints: { ...hints, see: ["a", "b", "c", "d"] } },
    });
    expect(out?.reaction).toBe("我听到雨声了！");
    expect(out?.next.hints.see).toHaveLength(3);
  });

  it("keeps up to two usable alternatives", () => {
    const next = { line: "大家唱生日歌。", question: "然后呢？", hints };
    const alt = (line: string) => ({ line, question: "然后呢？", hints });
    const out = cleanTurnResponse({
      missionDone: true,
      reaction: "",
      hint: "",
      next,
      alternatives: [alt("大家玩捉人游戏。"), "oops", alt("大家唱生日歌。"), alt("大家爬上树屋。"), alt("第四个")],
    });
    expect(out?.alternatives?.map((a) => a.line)).toEqual(["大家玩捉人游戏。", "大家爬上树屋。"]);
    expect(cleanTurnResponse({ missionDone: true, reaction: "", hint: "", next })).not.toHaveProperty("alternatives");
  });

  it("keeps last-turn feedback and leaves it out when absent or broken", () => {
    const base = { missionDone: true, reaction: "", hint: "", next: { line: "完。", question: "", hints } };
    const feedback = { stars: [{ quote: "哗啦啦", why: "好像听到了雨声！" }], wish: { turn: 1, tip: "换个词？", words: ["倾盆大雨"] } };
    expect(cleanTurnResponse({ ...base, feedback })?.feedback).toEqual(feedback);
    expect(cleanTurnResponse(base)).not.toHaveProperty("feedback");
    expect(cleanTurnResponse({ ...base, feedback: "oops" })).not.toHaveProperty("feedback");
  });

  it("keeps 错别字 fixes and a 📗 新词 that is really in the line", () => {
    const base = { missionDone: true, reaction: "", hint: "" };
    const out = cleanTurnResponse({
      ...base,
      fixes: [{ wrong: "芭莎", right: "巴刹", why: "市场" }, { wrong: "x" }],
      next: { line: "婆婆带小明去巴刹。", question: "然后呢？", hints, word: { word: "巴刹", meaning: "卖菜的市场" } },
    });
    expect(out?.fixes).toEqual([{ wrong: "芭莎", right: "巴刹", why: "市场" }]);
    expect(out?.next.word).toEqual({ word: "巴刹", meaning: "卖菜的市场" });
    const noWord = cleanTurnResponse({ ...base, fixes: [], next: { line: "大家回家。", question: "", hints, word: { word: "巴刹", meaning: "市场" } } });
    expect(noWord?.next).not.toHaveProperty("word");
    expect(noWord).not.toHaveProperty("fixes");
  });

  it("rejects responses missing required parts", () => {
    expect(cleanTurnResponse({ reaction: "hi" })).toBeNull();
    expect(cleanTurnResponse({ missionDone: true, next: { line: "", question: "", hints } })).toBeNull();
    expect(cleanStartResponse({ next: { line: "从前……", question: "?", hints: null } })).toBeNull();
    expect(cleanStartResponse({ next: { line: "从前……", question: "?", hints } })?.next.line).toBe("从前……");
  });
});
