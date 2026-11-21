import type { SenseId } from "../story-builder/senses";

/**
 * A plain sentence for the child to grow, one sense at a time. The
 * pre-written ones come with an emoji "picture", a question per sense
 * about that picture, and a few hint words per sense. Seeds taken from
 * the child's own 我的故事书 have no picture and use the general
 * questions and words from senses.ts.
 */
export interface Seed {
  id: string;
  /** The picture: a few emoji, shown big. */
  emoji: string;
  title: string;
  /** The plain sentence the child starts from. */
  plain: string;
  /** 团团's question per sense, about this picture. */
  questions: Partial<Record<SenseId, string>>;
  /** Hint words per sense that fit this picture (inspiration only). */
  words: Partial<Record<SenseId, string[]>>;
  /**
   * Where each sense usually goes in this sentence, so 团团 can light
   * up that ＋: "<词" before 词, ">词" after 词, "$" at the end.
   */
  spots?: Partial<Record<SenseId, string>>;
  /** Taken from a story in 我的故事书. */
  fromStory?: boolean;
}

export const SEEDS: Seed[] = [
  {
    id: "puppy",
    emoji: "🐶🌳",
    title: "草地上的小狗",
    plain: "小狗在跑。",
    questions: {
      see: "小狗是什么样子的？它在哪里跑？",
      hear: "小狗跑的时候，你听到了什么声音？",
      smell: "草地上有什么味道？",
      touch: "摸一摸小狗，是什么感觉？",
      feel: "小狗心里觉得怎么样？",
      pattern: "小狗跑得像什么？",
    },
    words: {
      see: ["白白的", "胖乎乎的", "绿油油的草地"],
      hear: ["汪汪汪", "呼呼的风声", "沙沙"],
      smell: ["青草的香味", "淡淡的花香", "清新的空气"],
      touch: ["软软的", "毛茸茸的", "暖暖的"],
      feel: ["开心极了", "兴奋地", "高兴得摇尾巴"],
      pattern: ["像一阵风", "像一个小雪球", "像箭一样"],
    },
    spots: { see: "<小狗", hear: ">小狗", smell: "$", touch: "<小狗", feel: "<在", pattern: "$" },
  },
  {
    id: "rain",
    emoji: "🌧️🏠",
    title: "下雨了",
    plain: "下雨了。",
    questions: {
      see: "雨点是什么样子的？天空是什么颜色的？",
      hear: "雨的声音是怎么样的？",
      smell: "下雨的时候，你闻到了什么？",
      touch: "雨点打在手上，是什么感觉？",
      feel: "看着下雨，你心里觉得怎么样？",
      pattern: "雨丝像什么？",
    },
    words: {
      see: ["一颗颗雨珠", "灰蒙蒙的天空", "亮晶晶的"],
      hear: ["哗啦啦", "滴答滴答", "轰隆隆的雷声"],
      smell: ["泥土的味道", "湿湿的空气", "清新的味道"],
      touch: ["冰冰凉凉的", "湿湿的", "凉凉的"],
      feel: ["有点无聊", "很舒服", "很想出去玩"],
      pattern: ["像细细的银线", "像一颗颗珠子", "像在唱歌"],
    },
    spots: { see: "<下雨", hear: "$", smell: "$", touch: "$", feel: "$", pattern: "$" },
  },
  {
    id: "cake",
    emoji: "🎂🕯️",
    title: "生日蛋糕",
    plain: "妈妈做了一个蛋糕。",
    questions: {
      see: "蛋糕是什么样子的？上面有什么？",
      hear: "大家在唱什么？你听到了什么？",
      smell: "蛋糕闻起来怎么样？",
      touch: "奶油摸起来怎么样？",
      feel: "看到蛋糕，你觉得怎么样？",
      pattern: "蛋糕上的奶油像什么？",
    },
    words: {
      see: ["圆圆的", "五颜六色的", "红红的草莓"],
      hear: ["生日歌", "拍手的声音", "哈哈的笑声"],
      smell: ["香喷喷的", "甜甜的奶油味", "巧克力的香味"],
      touch: ["软软的", "滑滑的", "黏黏的"],
      feel: ["开心极了", "很惊喜", "口水都流出来了"],
      pattern: ["像白白的云", "像一座雪山", "像一朵花"],
    },
    spots: { see: "<蛋糕", hear: "$", smell: "<蛋糕", touch: "<蛋糕", feel: "$", pattern: "$" },
  },
  {
    id: "beach",
    emoji: "🏖️🌊",
    title: "海边",
    plain: "我们去海边玩。",
    questions: {
      see: "大海和沙滩是什么颜色的？",
      hear: "海浪发出什么声音？",
      smell: "海边有什么味道？",
      touch: "沙子和海水摸起来怎么样？",
      feel: "在海边玩，你觉得怎么样？",
      pattern: "浪花像什么？",
    },
    words: {
      see: ["蓝蓝的大海", "金黄色的沙滩", "白白的浪花"],
      hear: ["哗哗的海浪声", "海鸥的叫声", "呼呼的海风"],
      smell: ["咸咸的海风", "海水的味道", "烤玉米的香味"],
      touch: ["热热的沙子", "细细的", "凉凉的海水"],
      feel: ["开心得大叫", "很放松", "舍不得回家"],
      pattern: ["像白色的花", "像在跳舞", "像小朋友在追来追去"],
    },
    spots: { see: "<海边", hear: "$", smell: "$", touch: "$", feel: "<去", pattern: "$" },
  },
  {
    id: "noodles",
    emoji: "🍜🥢",
    title: "小贩中心",
    plain: "爸爸买了一碗面。",
    questions: {
      see: "那碗面是什么样子的？",
      hear: "小贩中心里有什么声音？",
      smell: "面闻起来怎么样？",
      touch: "碗和面摸起来怎么样？",
      feel: "吃面的时候，你觉得怎么样？",
      pattern: "长长的面条像什么？",
    },
    words: {
      see: ["热腾腾的", "黄黄的面条", "绿绿的青菜"],
      hear: ["吵吵闹闹", "叮叮当当", "吸溜吸溜"],
      smell: ["香喷喷的", "辣辣的", "浓浓的汤味"],
      touch: ["烫烫的", "热乎乎的", "滑溜溜的"],
      feel: ["好满足", "饿极了", "很幸福"],
      pattern: ["像长长的绳子", "像一条条小蛇", "像毛线一样"],
    },
    spots: { see: "<面", hear: "$", smell: "<面", touch: "<面", feel: "$", pattern: "$" },
  },
  {
    id: "butterfly",
    emoji: "🦋🌸",
    title: "花园里的蝴蝶",
    plain: "蝴蝶在花园里飞。",
    questions: {
      see: "蝴蝶的翅膀是什么样子的？",
      hear: "花园里有什么声音？",
      smell: "花园里闻到了什么？",
      touch: "花瓣摸起来怎么样？",
      feel: "蝴蝶心里觉得怎么样？",
      pattern: "蝴蝶像什么？",
    },
    words: {
      see: ["五颜六色的", "薄薄的翅膀", "一朵朵小花"],
      hear: ["嗡嗡的蜜蜂", "叽叽喳喳的小鸟", "沙沙的树叶"],
      smell: ["淡淡的花香", "甜甜的", "青草的味道"],
      touch: ["软软的", "滑滑的", "湿湿的露水"],
      feel: ["快乐地", "自由自在地", "很轻松"],
      pattern: ["像一朵会飞的花", "像在跳舞", "像风筝一样"],
    },
    spots: { see: "<蝴蝶", hear: "$", smell: "$", touch: "$", feel: "<飞", pattern: "$" },
  },
  {
    id: "cat",
    emoji: "🐱☀️",
    title: "晒太阳的小猫",
    plain: "小猫在睡觉。",
    questions: {
      see: "小猫是什么样子的？它在哪里睡觉？",
      hear: "小猫睡觉的时候，发出什么声音？",
      smell: "太阳下面，你闻到了什么？",
      touch: "摸一摸小猫的毛，是什么感觉？",
      feel: "小猫觉得怎么样？",
      pattern: "缩成一团的小猫像什么？",
    },
    words: {
      see: ["胖乎乎的", "黄白色的", "缩成一团"],
      hear: ["呼噜呼噜", "轻轻的", "喵喵"],
      smell: ["阳光的味道", "被子的香味", "淡淡的花香"],
      touch: ["软绵绵的", "暖烘烘的", "毛茸茸的"],
      feel: ["舒服极了", "懒洋洋地", "很安心"],
      pattern: ["像一个毛线球", "像一个小面包", "像一团棉花"],
    },
    spots: { see: "<小猫", hear: "$", smell: "$", touch: "<小猫", feel: "<睡觉", pattern: "$" },
  },
  {
    id: "fireworks",
    emoji: "🎆🏮",
    title: "过新年",
    plain: "大家在看烟花。",
    questions: {
      see: "烟花是什么样子的？",
      hear: "烟花发出什么声音？大家在说什么？",
      smell: "你闻到了什么？",
      touch: "晚上的风吹在脸上，是什么感觉？",
      feel: "看烟花的时候，你觉得怎么样？",
      pattern: "烟花像什么？",
    },
    words: {
      see: ["五颜六色的", "亮晶晶的", "一朵朵"],
      hear: ["砰砰砰", "噼里啪啦", "大家的欢呼声"],
      smell: ["烟的味道", "年糕的香味", "橘子的香味"],
      touch: ["凉凉的晚风", "热热的", "手心出汗"],
      feel: ["兴奋极了", "开心地拍手", "吓了一跳"],
      pattern: ["像天上的花", "像星星一样", "像下金色的雨"],
    },
    spots: { see: "<烟花", hear: "$", smell: "$", touch: "$", feel: "<在", pattern: "$" },
  },
  {
    id: "slide",
    emoji: "🛝🌞",
    title: "游乐场",
    plain: "我在玩滑梯。",
    questions: {
      see: "滑梯是什么样子的？",
      hear: "游乐场里有什么声音？",
      smell: "游乐场里有什么味道？",
      touch: "滑梯摸起来怎么样？",
      feel: "滑下来的时候，你觉得怎么样？",
      pattern: "滑下来的你像什么？",
    },
    words: {
      see: ["高高的", "红色的", "弯弯的"],
      hear: ["哈哈的笑声", "呼呼的风声", "嗖的一声"],
      smell: ["青草的味道", "泥土的香味", "冰淇淋的甜味"],
      touch: ["滑滑的", "热热的", "凉凉的"],
      feel: ["有点害怕", "开心得大叫", "心怦怦跳"],
      pattern: ["像一阵风", "像坐火箭", "像小鸟一样"],
    },
    spots: { see: "<滑梯", hear: "$", smell: "$", touch: "$", feel: "<在", pattern: "$" },
  },
  {
    id: "moon",
    emoji: "🌙⭐",
    title: "晚上的月亮",
    plain: "月亮出来了。",
    questions: {
      see: "月亮是什么样子的？",
      hear: "晚上有什么声音？",
      smell: "晚上，你闻到了什么？",
      touch: "晚风吹在身上，是什么感觉？",
      feel: "看着月亮，你觉得怎么样？",
      pattern: "月亮像什么？",
    },
    words: {
      see: ["圆圆的", "弯弯的", "亮亮的"],
      hear: ["静悄悄的", "青蛙呱呱叫", "虫子唧唧叫"],
      smell: ["淡淡的花香", "凉凉的空气", "泥土的味道"],
      touch: ["凉凉的", "舒舒服服的", "轻轻的"],
      feel: ["很安静", "想睡觉了", "很想奶奶"],
      pattern: ["像一个大玉盘", "像一条小船", "像一个银色的球"],
    },
    spots: { see: "<月亮", hear: "$", smell: "$", touch: "$", feel: "$", pattern: "$" },
  },
];

export function getSeed(id: string): Seed | undefined {
  return SEEDS.find((s) => s.id === id);
}
