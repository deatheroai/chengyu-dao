/**
 * 火眼金睛: families of characters children mix up, because they look
 * alike (晴/睛), sound alike (在/再), or both. Each family has a clue
 * 团团 gives as the last hint (usually the radical), and the level it is
 * first taught at. Notes in `notes.ts` only swap a character for another
 * one in the same family, so the fix choices always come from here.
 */

export type Level = 3 | 4 | 5;
export const LEVELS: readonly Level[] = [3, 4, 5];

export interface FamilyChar {
  char: string;
  /** What it means, in words a child can read. */
  meaning: string;
  /** A short word using it, to remember it by. */
  word: string;
}

export interface Family {
  id: string;
  level: Level;
  /** "look": look alike; "sound": sound alike; "both". */
  kind: "look" | "sound" | "both";
  /** 团团's clue for telling them apart. */
  clue: string;
  chars: FamilyChar[];
}

export const FAMILIES: readonly Family[] = [
  // ── P3 ──
  {
    id: "qing",
    level: 3,
    kind: "both",
    clue: "这几个字都有“青”。看左边：日是太阳，目是眼睛，氵是水，忄是心，讠是说话。",
    chars: [
      { char: "晴", meaning: "有太阳，没有雨", word: "晴天" },
      { char: "睛", meaning: "用来看东西的眼睛", word: "眼睛" },
      { char: "清", meaning: "水很干净，看得清楚", word: "清水" },
      { char: "情", meaning: "心里的感觉", word: "心情" },
      { char: "请", meaning: "有礼貌地说话", word: "请坐" },
    ],
  },
  {
    id: "bao",
    level: 3,
    kind: "both",
    clue: "这几个字都有“包”。扌是手，⻊是脚，氵是水，饣是吃的东西。",
    chars: [
      { char: "包", meaning: "装东西的包", word: "书包" },
      { char: "抱", meaning: "用手抱住", word: "拥抱" },
      { char: "跑", meaning: "用脚快快地跑", word: "跑步" },
      { char: "泡", meaning: "水里的泡泡", word: "泡泡" },
      { char: "饱", meaning: "吃得很饱", word: "吃饱" },
    ],
  },
  {
    id: "ba",
    level: 3,
    kind: "both",
    clue: "这几个字都有“巴”。父是爸爸，口是说话，扌是手，爪是爬。",
    chars: [
      { char: "巴", meaning: "嘴巴的巴", word: "嘴巴" },
      { char: "爸", meaning: "爸爸", word: "爸爸" },
      { char: "吧", meaning: "说话时用，像“好吧”", word: "好吧" },
      { char: "把", meaning: "用手拿着、放好", word: "把书放好" },
      { char: "爬", meaning: "用手和脚爬", word: "爬山" },
    ],
  },
  {
    id: "ma",
    level: 3,
    kind: "both",
    clue: "这几个字都有“马”。女是妈妈，口是问问题，石是号码。",
    chars: [
      { char: "马", meaning: "会跑的马", word: "骑马" },
      { char: "妈", meaning: "妈妈", word: "妈妈" },
      { char: "吗", meaning: "问问题时用", word: "好吗" },
      { char: "码", meaning: "号码、数字", word: "号码" },
    ],
  },
  {
    id: "zai",
    level: 3,
    kind: "sound",
    clue: "读音一样。“在”是在哪里、正在做；“再”是又一次。",
    chars: [
      { char: "在", meaning: "在哪里；正在做", word: "在家" },
      { char: "再", meaning: "又一次", word: "再见" },
    ],
  },
  {
    id: "chang",
    level: 3,
    kind: "sound",
    clue: "“场”有土字旁，是一大片地方；“厂”是做东西的工厂。",
    chars: [
      { char: "场", meaning: "一大片地方", word: "操场" },
      { char: "厂", meaning: "做东西的地方", word: "工厂" },
    ],
  },
  {
    id: "yong",
    level: 3,
    kind: "both",
    clue: "游泳在水里，所以“泳”有三点水；“永”是永远。",
    chars: [
      { char: "永", meaning: "一直、永远", word: "永远" },
      { char: "泳", meaning: "在水里游", word: "游泳" },
    ],
  },
  // ── P4 ──
  {
    id: "yi",
    level: 4,
    kind: "both",
    clue: "“己”的口全开，是自己；“已”的口开一半，是已经；“以”是以后、可以。",
    chars: [
      { char: "己", meaning: "自己", word: "自己" },
      { char: "已", meaning: "做完了", word: "已经" },
      { char: "以", meaning: "以后、以前、可以", word: "以后" },
    ],
  },
  {
    id: "guan",
    level: 4,
    kind: "both",
    clue: "“馆”是大房子，像图书馆；“管”有竹字头，是管子；“官”是当官的人。",
    chars: [
      { char: "馆", meaning: "大房子，像图书馆", word: "图书馆" },
      { char: "管", meaning: "管子；管事", word: "水管" },
      { char: "官", meaning: "当官的人", word: "法官" },
    ],
  },
  {
    id: "gong",
    level: 4,
    kind: "sound",
    clue: "“功”有力，是用力做的事；“公”是大家的；“工”是工作。",
    chars: [
      { char: "功", meaning: "用力做的事", word: "功课" },
      { char: "公", meaning: "大家的", word: "公园" },
      { char: "工", meaning: "工作", word: "工人" },
    ],
  },
  {
    id: "piao",
    level: 4,
    kind: "both",
    clue: "这几个字都有“票”。氵是水，风是被风吹。",
    chars: [
      { char: "票", meaning: "车票、门票", word: "车票" },
      { char: "漂", meaning: "好看；浮在水上", word: "漂亮" },
      { char: "飘", meaning: "被风吹起来", word: "飘动" },
    ],
  },
  {
    id: "zuo",
    level: 4,
    kind: "both",
    clue: "“坐”是坐下的动作；“座”有广字头，是坐的地方。",
    chars: [
      { char: "坐", meaning: "坐下来", word: "坐下" },
      { char: "座", meaning: "坐的地方", word: "座位" },
    ],
  },
  {
    id: "dai",
    level: 4,
    kind: "sound",
    clue: "“戴”是穿戴在身上，像帽子、眼镜；“带”是拿着一起去。",
    chars: [
      { char: "带", meaning: "拿着一起去", word: "带伞" },
      { char: "戴", meaning: "穿戴在身上", word: "戴帽子" },
    ],
  },
  {
    id: "xin",
    level: 4,
    kind: "look",
    clue: "“辛苦”的辛，上面是立；“幸运”的幸，上面是土。",
    chars: [
      { char: "辛", meaning: "很累、不容易", word: "辛苦" },
      { char: "幸", meaning: "运气好、快乐", word: "幸福" },
    ],
  },
  // ── P5 ──
  {
    id: "bian",
    level: 5,
    kind: "both",
    clue: "看中间：讠是说话（辩论），纟是丝线（辫子），点和撇是分清楚（辨别）。",
    chars: [
      { char: "辨", meaning: "分清楚", word: "辨别" },
      { char: "辩", meaning: "用话来争论", word: "辩论" },
      { char: "辫", meaning: "头发编成的辫子", word: "辫子" },
    ],
  },
  {
    id: "ji",
    level: 5,
    kind: "both",
    clue: "“即”是马上，像立即；“既”是已经这样，像既然。",
    chars: [
      { char: "即", meaning: "马上", word: "立即" },
      { char: "既", meaning: "已经这样", word: "既然" },
    ],
  },
  {
    id: "li",
    level: 5,
    kind: "both",
    clue: "“历”里面是力，是经历过的事；“厉”里面是万，是很厉害。",
    chars: [
      { char: "历", meaning: "经过的事", word: "历史" },
      { char: "厉", meaning: "很强、很凶", word: "厉害" },
    ],
  },
  {
    id: "jing",
    level: 5,
    kind: "both",
    clue: "“竞”下面是兄，两个人比一比；“竟”下面是儿，是没想到。",
    chars: [
      { char: "竞", meaning: "比一比谁更好", word: "竞赛" },
      { char: "竟", meaning: "没想到", word: "竟然" },
    ],
  },
  {
    id: "bo",
    level: 5,
    kind: "look",
    clue: "“拔”是用力拉出来，右边有一点；“拨”是用手指拨，右边是发。",
    chars: [
      { char: "拔", meaning: "用力拉出来", word: "拔草" },
      { char: "拨", meaning: "用手指轻轻推动", word: "拨电话" },
    ],
  },
  {
    id: "zao",
    level: 5,
    kind: "both",
    clue: "洗澡要用水（氵），干燥像火烤（火），急躁会跺脚（⻊）。",
    chars: [
      { char: "澡", meaning: "洗身体", word: "洗澡" },
      { char: "燥", meaning: "很干，没有水", word: "干燥" },
      { char: "躁", meaning: "很急，静不下来", word: "急躁" },
    ],
  },
];

const BY_CHAR = new Map<string, Family>();
for (const f of FAMILIES) for (const c of f.chars) BY_CHAR.set(c.char, f);

/** The family a character belongs to, if any. */
export const familyOfChar = (char: string): Family | undefined => BY_CHAR.get(char);

/** The family both characters belong to (one swapped for the other). */
export function familyOf(a: string, b: string): Family | undefined {
  const f = BY_CHAR.get(a);
  return f && f === BY_CHAR.get(b) ? f : undefined;
}

export const familyById = (id: string): Family | undefined => FAMILIES.find((f) => f.id === id);

export const charInfo = (char: string): FamilyChar | undefined =>
  BY_CHAR.get(char)?.chars.find((c) => c.char === char);
