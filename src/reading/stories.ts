/**
 * Reading-and-writing practice content. Each story is one short
 * paragraph plus the handful of characters the child learns to write
 * from it.
 *
 * To change the story: edit (or add to) `stories` below, point
 * `currentStoryId` at it, then run `npm run gen:story-strokes` so the
 * new characters' stroke data gets bundled. `stories.test.ts` fails if
 * a target character is missing from the text or has no stroke data.
 */

export interface TargetCharacter {
  /** The single character the child learns to write. */
  char: string;
  /** Its pinyin, with tone marks. */
  pinyin: string;
  /** The word it appears in within the story; must contain `char`
   * and must appear in the story text. */
  word: string;
  /** A short English gloss of `word`, for the parent. */
  meaning: string;
}

export interface Story {
  id: string;
  title: string;
  /** The paragraph, as plain text with Chinese punctuation. */
  text: string;
  targets: TargetCharacter[];
}

export const stories: Story[] = [
  {
    id: "rainy-day-umbrella",
    title: "借伞",
    text:
      "星期六下午，天空忽然下起了大雨。我和妹妹站在图书馆门口，不知道怎么回家。" +
      "这时，一位老奶奶走过来，把她的雨伞借给我们。她笑着说：“我家就在附近，你们先用吧！”" +
      "第二天，我们带着雨伞和一张感谢卡去还伞。老奶奶看了卡片，高兴极了。",
    targets: [
      { char: "忽", pinyin: "hū", word: "忽然", meaning: "suddenly" },
      { char: "馆", pinyin: "guǎn", word: "图书馆", meaning: "library" },
      { char: "借", pinyin: "jiè", word: "借给", meaning: "to lend to" },
      { char: "附", pinyin: "fù", word: "附近", meaning: "nearby" },
      { char: "谢", pinyin: "xiè", word: "感谢", meaning: "to thank" },
      { char: "极", pinyin: "jí", word: "极了", meaning: "extremely" },
    ],
  },
  {
    id: "growing-sunflower",
    title: "种向日葵",
    text:
      "春天到了，老师给每个同学发了一颗向日葵的种子。我把种子埋进花盆里，每天都给它浇水。" +
      "过了一个星期，泥土里冒出了一棵小芽。我仔细观察它，还把它的变化记录在本子上。" +
      "到了夏天，向日葵长得比我还高，金黄色的花朵朝着太阳微笑。",
    targets: [
      { char: "埋", pinyin: "mái", word: "埋进", meaning: "to bury in" },
      { char: "浇", pinyin: "jiāo", word: "浇水", meaning: "to water" },
      { char: "冒", pinyin: "mào", word: "冒出", meaning: "to pop up, sprout" },
      { char: "察", pinyin: "chá", word: "观察", meaning: "to observe" },
      { char: "录", pinyin: "lù", word: "记录", meaning: "to record" },
      { char: "朝", pinyin: "cháo", word: "朝着", meaning: "facing, towards" },
    ],
  },
];

export const currentStoryId = "growing-sunflower";

export function getStory(id: string = currentStoryId): Story {
  const story = stories.find((s) => s.id === id);
  if (!story) throw new Error(`No story with id "${id}"`);
  return story;
}
