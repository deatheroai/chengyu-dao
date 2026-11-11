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
  /** Optional photo shown under the title. */
  photo?: StoryPhoto;
}

export interface StoryPhoto {
  /** Path under public/, e.g. "stories/x.jpg" (no leading slash, so it
   * works on preview URLs too). */
  src: string;
  /** Describes the photo, for screen readers. */
  alt: string;
  /** Who took it and its licence, shown in small print. */
  credit: string;
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
  {
    id: "deepavali-lights",
    title: "屠妖节",
    text:
      "屠妖节那天，我的印度朋友莉娜邀请我到她家做客。一进门，我就看见地上有一幅美丽的图案，原来是用彩色的米粉画成的。" +
      "莉娜的妈妈端出一盘香甜的点心，请我们品尝。天黑了，她们在门口点亮了一排小油灯，整条街都闪闪发光。" +
      "我觉得这个节日真温暖！",
    targets: [
      { char: "邀", pinyin: "yāo", word: "邀请", meaning: "to invite" },
      { char: "案", pinyin: "àn", word: "图案", meaning: "pattern, design" },
      { char: "端", pinyin: "duān", word: "端出", meaning: "to carry out (a dish)" },
      { char: "尝", pinyin: "cháng", word: "品尝", meaning: "to taste" },
      { char: "排", pinyin: "pái", word: "一排", meaning: "a row of" },
      { char: "暖", pinyin: "nuǎn", word: "温暖", meaning: "warm" },
    ],
    photo: {
      src: "stories/deepavali-rangoli.jpg",
      alt: "地上用彩色米粉画成的花朵图案，四周点着小油灯",
      credit: "照片：RashmiGhorpade，Wikimedia Commons（CC0）",
    },
  },
  {
    id: "year-end-holiday",
    title: "年终假期",
    text:
      "考完试，盼望已久的年终假期终于到了！爸爸妈妈带我和弟弟去金马伦高原旅行。" +
      "那里的空气很新鲜，山坡上种满了绿油油的茶树。我们还到草莓园去，摘下又大又红的草莓，装满了一个篮子。" +
      "晚上，我把旅途中的趣事都写进了日记里。这真是一个难忘的假期！",
    targets: [
      { char: "盼", pinyin: "pàn", word: "盼望", meaning: "to look forward to" },
      { char: "鲜", pinyin: "xiān", word: "新鲜", meaning: "fresh" },
      { char: "摘", pinyin: "zhāi", word: "摘下", meaning: "to pick (fruit)" },
      { char: "篮", pinyin: "lán", word: "篮子", meaning: "basket" },
      { char: "趣", pinyin: "qù", word: "趣事", meaning: "funny or interesting happenings" },
      { char: "忘", pinyin: "wàng", word: "难忘", meaning: "unforgettable" },
    ],
    photo: {
      src: "stories/strawberry-farm.jpg",
      alt: "一家人在高原上的草莓园里摘草莓，孩子们提着小篮子，远处是一层层绿色的茶园",
      credit: "图片来源：yatix.com",
    },
  },
];

export const currentStoryId = "year-end-holiday";

export function getStory(id: string = currentStoryId): Story {
  const story = stories.find((s) => s.id === id);
  if (!story) throw new Error(`No story with id "${id}"`);
  return story;
}
