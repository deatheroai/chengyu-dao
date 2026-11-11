import { pinyin } from "pinyin-pro";

/** Words where 地 really is "dì" (ground/place), not the adverb marker. */
const NOUN_DI = new Set(
  "草地 土地 大地 田地 场地 陆地 空地 雪地 各地 本地 当地 平地 高地 山地 营地 基地 天地 外地 落地 遍地 满地 倒地 种地 扫地 坐地 原地 林地 湿地".split(" "),
);
/** Characters after which 得 is "dé" (to get) rather than "de". */
const DE2_AFTER = new Set(["意", "到", "分", "奖", "出", "罪"]);

/**
 * Per-character pinyin for authored story text, one entry per
 * `Array.from(text)` character, "" for anything that isn't a Chinese
 * character (so it can go straight into renderRubyText). pinyin-pro
 * reads the structural particles 地 and 得 as dì/dé inside sentences
 * like 慢慢地走 and 跳得高, so those two are corrected here by context.
 */
export function charPinyin(text: string): string[] {
  const chars = Array.from(text);
  const raw = pinyin(text, { type: "array", toneType: "symbol" });
  return chars.map((c, i) => {
    if (!/\p{Script=Han}/u.test(c)) return "";
    const prev = chars[i - 1] ?? "";
    const next = chars[i + 1] ?? "";
    const prevIsHan = /\p{Script=Han}/u.test(prev);
    if (c === "地" && prevIsHan && !NOUN_DI.has(prev + c) && !/\p{Script=Han}/u.test(next)) return "de";
    if (c === "地" && prevIsHan && !NOUN_DI.has(prev + c) && /[走跑跳飞叫笑哭说唱看想跟往向下上打吃玩点抖转流游爬挂]/.test(next)) return "de";
    if (c === "得" && prevIsHan) return DE2_AFTER.has(next) ? "dé" : "de";
    return raw[i] ?? "";
  });
}
