import { charInfo } from "./families";
import type { Stamp } from "./round";

/** What 团团 says on the 火眼金睛 page. No DOM, so it can be tested. */

/** On the home screen: the first visit asks for help; later visits ask for one more. */
export function homeLine(done: number): string {
  if (done === 0) return "老师明天要检查我写的字，可是我好像写错了几个……你能帮我找一找吗？🙏";
  if (done < 3) return `你已经帮我改了 ${done} 张！今天再帮我看一张，好吗？`;
  return `你已经帮我改了 ${done} 张，你的眼睛真是火眼金睛！再来一张吗？`;
}

/** Said when a note opens. */
export function openLine(count: number, essay: boolean, starter: boolean): string {
  if (essay) return "这是我的作文。我也不知道错了几个……你检查完了，就按“改好了”。";
  if (starter) return "这是我给妈妈的便条。我好像写错了一个字，你看得出来吗？点一点那个字！";
  return `这里有 ${count} 个错字。看到写错的字，就点一点它！`;
}

const PRAISE = [
  "哇！被你找到了！",
  "火眼金睛！",
  "你的眼睛真厉害！",
  "对对对，就是它！",
  "好险，幸好有你！",
  "又抓到一个！",
];

/** A different cheer for each find in a note (n = finds so far, from 1). */
export const praise = (n: number): string => PRAISE[(n - 1) % PRAISE.length];

/** Her first find of the day gets a bigger cheer. */
export const firstOfDay = "今天的第一个错字！🎉 你一来，团团就不怕了！";

/** A tap on a character that was right. Never a telling-off. */
export function wrongTapLine(free: boolean, ink: number): string {
  if (free) return "这个字是对的哦！别担心，这一张不用墨水，再找找看～";
  if (ink <= 0) return "哎呀，红笔没墨水了！没关系，我们一起看看还有哪几个。";
  return `这个字是对的哦～红笔还有 ${ink} 滴墨水，慢慢找。`;
}

export const askFix = "应该写成哪一个字？";

/** A wrong pick: say what that character means, never "wrong". */
export function wrongPickLine(char: string): string {
  const info = charInfo(char);
  return info ? `「${char}」是“${info.meaning}”，像「${info.word}」。再想想，这里要哪一个？` : "再想想，这里要哪一个？";
}

export function fixedLine(right: string): string {
  const info = charInfo(right);
  return info ? `对了！是「${info.word}」的「${right}」。` : `对了！是「${right}」。`;
}

/** 🔍 提示, step by step. */
export function hintLine(step: 1 | 2 | 3, clue?: string): string {
  if (step === 1) return "错字就藏在这一句里，慢慢读一读。";
  if (step === 2) return "就在这几个字里面！";
  return `就是这个字！${clue ?? ""}`;
}

export const noHint = "你都找到了！";

/** At the end of a note, with its stamp. */
export function stampLine(stamp: Stamp, starter: boolean): string {
  if (stamp === "优") return starter ? "谢谢你！妈妈看到便条，一定会说我写得好！" : "全部改好了！老师一定会给我一个大大的“优”！";
  if (stamp === "良") return "全部找到了！有几个对的字也被你圈了，下次看仔细一点就更棒了！";
  return "这次还有几个没找到，红圈里是正确的字。下次一定会更好，加油！";
}

/** Shown under the note when out of ink or an essay ends with some missed. */
export const missedLine = (n: number): string => `还有 ${n} 个错字藏起来了，团团帮你圈出来了。`;
