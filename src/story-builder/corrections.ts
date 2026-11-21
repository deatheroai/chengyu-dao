/**
 * 错别字: words the child wrote with the wrong character, usually a
 * same-sound slip while typing pinyin (芭莎 for 巴刹). 团团 points them
 * out at the end of a turn and the child fixes the sentence before it
 * goes into the story. The AI finds most of them; a small list of
 * common slips also works without AI. Shared with api/story-partner.ts,
 * so no DOM and no runtime imports.
 */

export interface Fix {
  /** Copied exactly from the child's sentence. */
  wrong: string;
  /** The correct way to write it. */
  right: string;
  /** What the right word means, so the child remembers it. */
  why: string;
}

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");

/**
 * Slips children in Singapore often make when typing pinyin. Only
 * strings that are never right in a child's story, so matching them
 * anywhere is safe: no 在见 (inside 现在见面), no 地跌 (重重地跌倒),
 * no 蓝球 (a blue ball). The AI catches those from context.
 */
export const COMMON_SLIPS: readonly Fix[] = [
  { wrong: "芭莎", right: "巴刹", why: "巴刹是卖菜、卖鱼、卖肉的市场。" },
  { wrong: "巴杀", right: "巴刹", why: "巴刹是卖菜、卖鱼、卖肉的市场。" },
  { wrong: "小饭中心", right: "小贩中心", why: "小贩是摆摊卖东西的人。" },
  { wrong: "食唐", right: "食堂", why: "食堂是学校里吃东西的地方。" },
  { wrong: "课事", right: "课室", why: "课室就是上课的房间。" },
  { wrong: "图书管", right: "图书馆", why: "“馆”是大房子，有很多书。" },
  { wrong: "游乐厂", right: "游乐场", why: "“场”是一大片地方。" },
  { wrong: "操厂", right: "操场", why: "“场”是一大片地方。" },
  { wrong: "眼晴", right: "眼睛", why: "眼睛和“目”有关，是目字旁。" },
  { wrong: "睛天", right: "晴天", why: "晴天有太阳，是日字旁。" },
  { wrong: "以经", right: "已经", why: "“已经”的“已”，口是开着的。" },
  { wrong: "已后", right: "以后", why: "“以后”的“以”，和“以前”一样。" },
  { wrong: "游永", right: "游泳", why: "游泳在水里，所以有三点水。" },
  { wrong: "票亮", right: "漂亮", why: "“漂亮”的“漂”有三点水。" },
  { wrong: "突燃", right: "突然", why: "“突然”是一下子，不是火烧。" },
  { wrong: "兴份", right: "兴奋", why: "兴奋就是非常激动、开心。" },
  { wrong: "公课", right: "功课", why: "“功课”的“功”，是用力去做。" },
  { wrong: "休习", right: "休息", why: "“休息”的“息”，下面是心。" },
  { wrong: "连习", right: "练习", why: "“练习”的“练”是绞丝旁。" },
  { wrong: "冰其淋", right: "冰淇淋", why: "“淇”有三点水，冰淇淋会化成水。" },
  { wrong: "巧克利", right: "巧克力", why: "“巧克力”的“力”，是力气的力。" },
  { wrong: "宁檬", right: "柠檬", why: "柠檬是水果，所以是木字旁。" },
  { wrong: "榴连", right: "榴梿", why: "榴梿长在树上，所以是木字旁。" },
  { wrong: "椰酱饭", right: "椰浆饭", why: "椰浆是椰子里白白的汁。" },
  { wrong: "红毛单", right: "红毛丹", why: "红毛丹是红红的、有毛的水果。" },
];

/** Checks one fix the AI found against the child's sentence. */
function cleanFix(x: unknown, text: string): Fix | null {
  if (!isObj(x)) return null;
  const wrong = str(x.wrong, 8).replace(/^[“"「]+|[”"」]+$/g, "");
  const right = str(x.right, 8).replace(/^[“"「]+|[”"」]+$/g, "");
  const why = str(x.why, 30);
  if (!wrong || !right || wrong === right || !text.includes(wrong)) return null;
  if (!Array.from(wrong).some(isHan) || !Array.from(right).every(isHan)) return null;
  // A real slip keeps the length (芭莎 → 巴刹); anything else is a rewrite.
  if (Array.from(wrong).length !== Array.from(right).length) return null;
  return { wrong, right, why };
}

/**
 * The fixes for `text`: the AI's (when it gave any) that really point
 * at something in the sentence, plus any common slip it missed. At most
 * three, so a turn never turns into a page of red ink.
 */
export function findFixes(text: string, ai: unknown = []): Fix[] {
  const fromAi = (Array.isArray(ai) ? ai : []).map((f) => cleanFix(f, text)).filter((f): f is Fix => f !== null);
  const out: Fix[] = [];
  const overlaps = (f: Fix) => out.some((o) => o.wrong.includes(f.wrong) || f.wrong.includes(o.wrong));
  for (const f of [...fromAi, ...COMMON_SLIPS.filter((s) => text.includes(s.wrong))]) {
    if (out.length >= 3) break;
    if (!overlaps(f)) out.push(f);
  }
  return out;
}

/** `text` with every fix applied. */
export function applyFixes(text: string, fixes: readonly Fix[]): string {
  return fixes.reduce((t, f) => t.split(f.wrong).join(f.right), text);
}

/** Fixes still to do: the wrong words the child hasn't changed yet. */
export function fixesLeft(text: string, fixes: readonly Fix[]): Fix[] {
  return fixes.filter((f) => text.includes(f.wrong));
}

/** The characters the child got wrong, written the right way (巴, 刹 for 芭莎 → 巴刹). */
export function fixedChars(fix: Fix): string[] {
  const wrong = Array.from(fix.wrong);
  return Array.from(fix.right).filter((c, i) => isHan(c) && c !== wrong[i]);
}

/** Validates fixes read back from storage or sent by the server. */
export function cleanFixes(x: unknown): Fix[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter(isObj)
    .map((f) => ({ wrong: str(f.wrong, 8), right: str(f.right, 8), why: str(f.why, 30) }))
    .filter((f) => f.wrong && f.right && f.wrong !== f.right)
    .slice(0, 3);
}
