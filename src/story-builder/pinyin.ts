import { pinyin } from "pinyin-pro";

/** Words where 地 really is "dì" (ground/place), not the adverb marker. */
const NOUN_DI = new Set(
  "草地 土地 大地 田地 场地 陆地 空地 雪地 各地 本地 当地 平地 高地 山地 营地 基地 天地 外地 落地 遍地 满地 倒地 种地 扫地 坐地 原地 林地 湿地".split(" "),
);
/** Characters after which 得 is "dé" (to get) rather than "de". */
const DE2_AFTER = new Set(["意", "到", "分", "奖", "出", "罪"]);

/**
 * Words whose second syllable is read in the neutral tone (轻声), which
 * pinyin-pro gives a full tone (时候 shíhòu → shíhou). Common words in
 * children's stories only; 妈妈, 桌子, 什么 and the like it already
 * gets right.
 */
const NEUTRAL_SECOND = new Set(
  (
    "时候 朋友 舒服 明白 事情 意思 热闹 东西 收拾 麻烦 谢谢 早上 晚上 眼睛 太阳 月亮 商量 清楚 干净 厉害 " +
    "学生 先生 脑袋 名字 告诉 地方 故事 葡萄 打扮 部分 客人 亲戚 窗户 衣裳 包袱 胳膊 指甲 篱笆 " +
    "结实 老实 踏实 石头 木头 馒头 枕头 骨头 舌头 外头 里头 " +
    "看看 想想 尝尝 听听 试试 走走 说说 问问 找找 玩玩 摸摸 闻闻"
  ).split(" "),
);

/** "hòu" → "hou": drops the tone mark, keeping ü. */
export function toneless(syllable: string): string {
  return syllable.normalize("NFD").replace(/[\u0300\u0301\u0304\u030C]/g, "").normalize("NFC");
}

/**
 * Per-character pinyin for authored story text, one entry per
 * `Array.from(text)` character, "" for anything that isn't a Chinese
 * character (so it can go straight into renderRubyText). pinyin-pro
 * reads the structural particles 地 and 得 as dì/dé inside sentences
 * like 慢慢地走 and 跳得高, so those two are corrected here by context,
 * and words in NEUTRAL_SECOND get their neutral tone.
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
    if (c === "地" && prevIsHan && !NOUN_DI.has(prev + c) && /[走跑跳飞叫笑哭说唱看想跟往向下上打吃玩点抖转流游爬挂落飘响望站坐躺喊摇拍]/.test(next)) return "de";
    if (c === "得" && prevIsHan) return DE2_AFTER.has(next) ? "dé" : "de";
    if (prevIsHan && NEUTRAL_SECOND.has(prev + c)) return toneless(raw[i] ?? "");
    return raw[i] ?? "";
  });
}
