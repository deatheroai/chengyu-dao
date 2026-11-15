/**
 * The six missions on the spinner (五感 plus 比喻). Each sense has a
 * mission card (title + question 团团 asks) and a small general word
 * bank: the bank is used for 💡 hints when no AI hints are available,
 * and to grey out senses a sentence already uses.
 */
export type SenseId = "see" | "hear" | "smell" | "touch" | "feel" | "pattern";

export interface Sense {
  id: SenseId;
  emoji: string;
  /** Short label on the spinner. */
  label: string;
  /** Mission card title. */
  mission: string;
  /** The question 团团 asks for this mission. */
  question: string;
  /** Words that fit almost any scene. */
  words: string[];
}

export const SENSES: Sense[] = [
  {
    id: "see",
    emoji: "👀",
    label: "看到",
    mission: "看到任务",
    question: "它是什么颜色、什么样子的？把你看到的加进句子里！",
    words: ["红红的", "绿油油的", "金黄色的", "亮晶晶的", "圆圆的", "五颜六色的", "闪闪发光的"],
  },
  {
    id: "hear",
    emoji: "👂",
    label: "听到",
    mission: "声音任务",
    question: "你听到了什么声音？把声音加进句子里！",
    words: ["哗啦啦", "滴答滴答", "叽叽喳喳", "呼呼", "咚咚咚", "沙沙", "轰隆隆"],
  },
  {
    id: "smell",
    emoji: "👃",
    label: "闻到",
    mission: "味道任务",
    question: "你闻到了什么味道？把味道加进句子里！",
    words: ["香喷喷的", "甜甜的", "淡淡的花香", "臭臭的", "清新的空气"],
  },
  {
    id: "touch",
    emoji: "✋",
    label: "摸到",
    mission: "摸一摸任务",
    question: "摸起来是什么感觉？软的、硬的、冷的还是热的？",
    words: ["软软的", "湿湿的", "滑滑的", "毛茸茸的", "冰冰凉凉的", "暖暖的"],
  },
  {
    id: "feel",
    emoji: "💭",
    label: "心情",
    mission: "心情任务",
    question: "他心里觉得怎么样？把心情加进句子里！",
    words: ["开心极了", "有点害怕", "很好奇", "紧张得心怦怦跳", "吓了一跳", "笑眯眯地"],
  },
  {
    id: "pattern",
    emoji: "🪄",
    label: "比喻",
    mission: "比喻任务",
    question: "它像什么？用“像……一样”把它比作别的东西！",
    words: ["像……一样", "好像", "像一个……"],
  },
];

export const SENSE_IDS: SenseId[] = SENSES.map((s) => s.id);

export function getSense(id: SenseId): Sense {
  const sense = SENSES.find((s) => s.id === id);
  if (!sense) throw new Error(`Unknown sense ${id}`);
  return sense;
}
