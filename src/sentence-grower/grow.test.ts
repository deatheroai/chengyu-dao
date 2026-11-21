import { describe, expect, it } from "vitest";
import type { SavedStory } from "../story-builder/library";
import { SENSE_IDS } from "../story-builder/senses";
import {
  EXAMPLES,
  addedHanzi,
  addedRuns,
  charOrigins,
  checkNote,
  dotsLabel,
  insertAt,
  slotOffsets,
  slotWords,
  spotOffset,
  cheerFor,
  legendRows,
  growthText,
  hintsFor,
  isLong,
  layerSteps,
  offlineCheck,
  openSenses,
  questionFor,
  seedsFromLibrary,
  segments,
  starCount,
  type Layer,
} from "./grow";
import { SEEDS, getSeed } from "./seeds";

const puppy = getSeed("puppy")!;

describe("which step added which characters", () => {
  it("finds additions in two places at once", () => {
    expect(addedRuns("小狗在跑。", "白白的小狗在草地上跑。")).toEqual(["白白的", "草地上"]);
    expect(addedHanzi("小狗在跑。", "白白的小狗在草地上跑。")).toBe(6);
  });

  it("ignores punctuation-only changes", () => {
    expect(addedRuns("小狗在跑", "小狗在跑。")).toEqual([]);
    expect(addedHanzi("小狗在跑", "小狗在跑！")).toBe(0);
  });

  it("colours each layer, keeping older layers' colours", () => {
    const layers: Layer[] = [
      { sense: "see", text: "白白的小狗在跑。", done: true },
      { sense: "hear", text: "白白的小狗汪汪叫着在跑。", done: true },
    ];
    expect(segments("小狗在跑。", layerSteps(layers))).toEqual([
      { text: "白白的", origin: "see" },
      { text: "小狗", origin: "plain" },
      { text: "汪汪叫着", origin: "hear" },
      { text: "在跑。", origin: "plain" },
    ]);
  });

  it("marks 改一改 changes as an edit, not a sense", () => {
    const layers: Layer[] = [{ sense: "see", text: "白白的小狗在跑。", done: true }];
    const segs = segments("小狗在跑。", layerSteps(layers, "白白的小狗快快地跑。"));
    expect(segs.map((s) => s.origin)).toEqual(["see", "plain", "edit", "plain"]);
    // No 改一改 when the final sentence is the last layer.
    expect(layerSteps(layers, "白白的小狗在跑。")).toHaveLength(1);
  });

  it("gives new punctuation the colour before it", () => {
    const o = charOrigins("小狗在跑", [{ text: "小狗在跑，汪汪叫。", origin: "hear" }]);
    expect(o.at(-1)).toEqual({ char: "。", origin: "hear" });
    expect(o[4]).toEqual({ char: "，", origin: "plain" });
  });

  it("handles a sentence rewritten from scratch", () => {
    const segs = segments("小狗在跑。", [{ text: "大象", origin: "see" }]);
    expect(segs).toEqual([{ text: "大象", origin: "see" }]);
  });
});

describe("offline check", () => {
  it("accepts any new characters, praising a hint word if used", () => {
    expect(offlineCheck("小狗在跑。", "白白的小狗在跑。", puppy.words.see!)).toEqual({ ok: true, used: "白白的" });
    expect(offlineCheck("小狗在跑。", "黑黑的小狗在跑。", puppy.words.see!)).toEqual({ ok: true });
  });

  it("asks for more when nothing was added", () => {
    expect(offlineCheck("小狗在跑。", "小狗在跑！", [])).toEqual({ ok: false, reason: "unchanged" });
    expect(offlineCheck("小狗在跑。", "小狗", [])).toEqual({ ok: false, reason: "empty" });
    expect(offlineCheck("小狗在跑。", "小狗跑得像……一样", [])).toEqual({ ok: false, reason: "gap" });
    expect(checkNote("unchanged", "hear")).toContain("听到");
  });

  it("doesn't praise a word that was already there", () => {
    expect(offlineCheck("白白的小狗。", "白白的小狗在跑。", ["白白的"])).toEqual({ ok: true });
  });
});

describe("senses, questions and help", () => {
  it("closes senses already used", () => {
    expect(openSenses([{ sense: "see", text: "", done: true }])).toEqual(SENSE_IDS.filter((s) => s !== "see"));
  });

  it("asks about the picture, or a general question", () => {
    expect(questionFor(puppy, "see")).toBe(puppy.questions.see);
    expect(questionFor(undefined, "see")).toContain("颜色");
  });

  it("gives three hints: AI first, then the picture's, then general", () => {
    expect(hintsFor(puppy, "see", ["雪白的"])).toEqual(["雪白的", "白白的", "胖乎乎的"]);
    expect(hintsFor(undefined, "hear")).toHaveLength(3);
  });

  it("never shows an example on a seed's own sentence", () => {
    for (const s of SEEDS) for (const id of SENSE_IDS) expect(EXAMPLES[id].plain).not.toBe(s.plain);
  });

  it("counts growth, stars and long sentences", () => {
    expect(growthText("小狗在跑。", "白白的小狗在草地上跑。")).toBe("从 4 个字长到 10 个字！");
    expect(starCount([{ sense: "see", text: "", done: true }, { sense: "hear", text: "", done: false }])).toBe(1);
    expect(isLong("小".repeat(36))).toBe(true);
    expect(isLong("小".repeat(20))).toBe(false);
  });
});

describe("end card", () => {
  it("lists what each sense added", () => {
    const layers: Layer[] = [
      { sense: "see", text: "白白的小狗在草地上跑。", done: true },
      { sense: "hear", text: "白白的小狗汪汪叫着在草地上跑。", done: false },
    ];
    expect(legendRows("小狗在跑。", layers)).toEqual([
      { sense: "see", added: ["白白的", "草地上"], done: true },
      { sense: "hear", added: ["汪汪叫着"], done: false },
    ]);
  });

  it("cheers, quoting a hint word the child used", () => {
    expect(cheerFor("hear", "汪汪汪")).toContain("“汪汪汪”");
    expect(cheerFor("hear")).toContain("听到");
  });
});

describe("seeds", () => {
  it("every picture seed has a question and three words for every sense", () => {
    expect(new Set(SEEDS.map((s) => s.id)).size).toBe(SEEDS.length);
    for (const s of SEEDS) {
      expect(s.plain).toMatch(/。$/);
      for (const id of SENSE_IDS) {
        expect(s.questions[id], `${s.id} ${id}`).toBeTruthy();
        expect(s.words[id], `${s.id} ${id}`).toHaveLength(3);
      }
    }
  });

  it("takes short child sentences from 我的故事书, plain version first", () => {
    const story: SavedStory = {
      id: "s1",
      adventureId: "idea",
      title: "会飞的小狗",
      savedAt: 1,
      lines: [
        { by: "partner", text: "从前有一只小狗。" },
        { by: "child", text: "蓝蓝的大海哗哗地响。", plain: "大海很大", mission: "hear", missionDone: true },
        { by: "child", text: "雨" },
        { by: "parent", text: "爸爸也来了海边。" },
        { by: "child", text: "小狗跳进了水里，开心地游来游去，游了很久很久才上岸。" },
        { by: "child", text: "大海很大。" },
      ],
    };
    const seeds = seedsFromLibrary([story]);
    expect(seeds.map((s) => s.plain)).toEqual(["大海很大。"]);
    expect(seeds[0]).toMatchObject({ id: "story:s1:1", fromStory: true, title: "会飞的小狗" });
  });
});

describe("where the new words go", () => {
  it("puts ＋ between words, ending before the full stop", () => {
    const slots = slotOffsets("小狗在跑。");
    expect(slots[0]).toBe(0);
    expect(slots.at(-1)).toBe(4);
    expect(slots).toEqual([...new Set(slots)].sort((a, b) => a - b));
    expect(slotWords("小狗在跑。", slots).join("")).toBe("小狗在跑");
  });

  it("always offers 团团's spot, even inside a word", () => {
    // 我在 can come out of the word splitter as one word.
    expect(slotOffsets("我在玩滑梯。", 1)).toContain(1);
  });

  it("finds 团团's suggested spot", () => {
    expect(spotOffset("小狗在跑。", "<小狗")).toBe(0);
    expect(spotOffset("白白的小狗在跑。", ">小狗")).toBe(5);
    expect(spotOffset("小狗在跑！", "$")).toBe(4);
    expect(spotOffset("大象在跑。", "<小狗")).toBeUndefined();
    expect(spotOffset("小狗在跑。", undefined)).toBeUndefined();
  });

  it("inserts the child's words at a spot", () => {
    expect(insertAt("小狗在跑。", 0, " 白白的 ")).toBe("白白的小狗在跑。");
    expect(insertAt("小狗在跑。", 4, "，像一阵风")).toBe("小狗在跑，像一阵风。");
  });

  it("every picture seed's spots work on its sentence", () => {
    for (const seed of SEEDS) {
      for (const id of SENSE_IDS) {
        const at = spotOffset(seed.plain, seed.spots?.[id]);
        expect(at, `${seed.id} ${id}`).toBeDefined();
        expect(slotOffsets(seed.plain, at)).toContain(at);
      }
    }
  });

  it("counts down the senses left", () => {
    expect(dotsLabel(0)).toBe("还要加 3 个感觉");
    expect(dotsLabel(2)).toBe("还要加 1 个感觉");
    expect(dotsLabel(3)).toBe("完成！");
  });
});
