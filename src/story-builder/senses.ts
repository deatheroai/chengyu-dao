/**
 * The "five senses magnifying glass" (五感放大镜): the helper that sits
 * between "the child wrote a sentence" and "the sentence goes into the
 * story". Each sense is a question to think about plus a general word
 * bank; each adventure beat adds its own scene-specific words on top
 * (see adventures.ts), so the chips always fit what is happening.
 */
export type SenseId = "see" | "hear" | "smell" | "touch" | "feel" | "pattern";

export interface Sense {
  id: SenseId;
  emoji: string;
  /** Short label on the tab. */
  label: string;
  /** The question the helper asks the child. */
  question: string;
  /** Words that fit almost any scene. */
  words: string[];
}

export const SENSES: Sense[] = [
  {
    id: "see",
    emoji: "👀",
    label: "看到",
    question: "你看到了什么？是什么颜色、什么样子的？",
    words: ["红红的", "绿油油的", "金黄色的", "亮晶晶的", "圆圆的", "小小的", "大大的", "五颜六色的", "闪闪发光的"],
  },
  {
    id: "hear",
    emoji: "👂",
    label: "听到",
    question: "你听到了什么声音？",
    words: ["哗啦啦", "滴答滴答", "叽叽喳喳", "呼呼", "咚咚咚", "沙沙", "轰隆隆", "叮叮当当", "静悄悄的"],
  },
  {
    id: "smell",
    emoji: "👃",
    label: "闻到",
    question: "你闻到了什么味道？",
    words: ["香喷喷的", "甜甜的", "淡淡的花香", "臭臭的", "清新的空气", "饭菜的香味"],
  },
  {
    id: "touch",
    emoji: "✋",
    label: "摸到",
    question: "摸起来是什么感觉？",
    words: ["软软的", "硬硬的", "湿湿的", "滑滑的", "毛茸茸的", "冰冰凉凉的", "暖暖的", "粗粗的"],
  },
  {
    id: "feel",
    emoji: "💭",
    label: "心情",
    question: "他心里觉得怎么样？",
    words: ["开心极了", "有点害怕", "很好奇", "紧张得心怦怦跳", "高兴得跳了起来", "难过", "吓了一跳", "笑眯眯地"],
  },
  {
    id: "pattern",
    emoji: "🪄",
    label: "好句子",
    question: "试试用一个好句式，让句子更生动！",
    words: ["像……一样", "一边……一边……", "又……又……", "越来越……", "忽然", "慢慢地", "高高兴兴地"],
  },
];

export function getSense(id: SenseId): Sense {
  const sense = SENSES.find((s) => s.id === id);
  if (!sense) throw new Error(`Unknown sense ${id}`);
  return sense;
}
