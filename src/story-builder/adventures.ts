import type { SenseId } from "./senses";

/**
 * One turn of the story: the partner (团团 the panda) writes a line,
 * asks a question, and the child writes what happens next.
 */
export interface Beat {
  /** Line the partner writes (shown with pinyin, can be read aloud). */
  partner: string;
  /** Question the partner asks the child to answer with a sentence. */
  prompt: string;
  /** Sentence starters the child can tap to begin. */
  starters: string[];
  /** Scene-specific words for the five-senses helper. */
  words: Partial<Record<SenseId, string[]>>;
  /** A short "plain → richer" example sentence for this scene. */
  example: { plain: string; rich: string };
}

export interface Adventure {
  id: string;
  title: string;
  emoji: string;
  /** Who the story is about — used in the cover blurb. */
  blurb: string;
  beats: Beat[];
  /** The partner's closing line after the last beat. */
  ending: string;
}

export const ADVENTURES: Adventure[] = [
  {
    id: "rainy-kitten",
    title: "小猫的下雨天",
    emoji: "🐱",
    blurb: "小猫咪咪第一次在雨里出门……",
    beats: [
      {
        partner: "早上，天空灰灰的。小猫咪咪趴在窗边，看见外面下起了大雨。",
        prompt: "雨下得怎么样？咪咪看到了什么？",
        starters: ["雨点", "窗外", "咪咪看见"],
        words: {
          see: ["灰蒙蒙的天空", "一颗颗雨珠", "弯弯的彩虹"],
          hear: ["滴答滴答", "哗啦啦", "轰隆隆的雷声"],
          touch: ["冰冰凉凉的玻璃"],
          feel: ["很好奇", "有点无聊"],
        },
        example: { plain: "雨很大。", rich: "雨哗啦啦地下着，像一条条细细的银线挂在窗外。" },
      },
      {
        partner: "咪咪穿上小雨靴，打开门，跑到了院子里。",
        prompt: "咪咪在院子里做了什么？",
        starters: ["咪咪踩着", "她跳进", "院子里"],
        words: {
          see: ["一个个小水坑", "绿油油的草地"],
          hear: ["啪嗒啪嗒", "扑通一声"],
          touch: ["湿湿的草地", "软软的泥巴"],
          smell: ["泥土的香味"],
          feel: ["开心极了", "高兴得转圈圈"],
        },
        example: { plain: "咪咪跳水坑。", rich: "咪咪扑通一声跳进小水坑，水花溅得高高的，她开心极了。" },
      },
      {
        partner: "忽然，咪咪听见花丛里传来一个小小的声音。",
        prompt: "是谁在花丛里？它怎么了？",
        starters: ["原来是", "一只", "咪咪轻轻地"],
        words: {
          see: ["一只小蜗牛", "一只湿透的小鸟", "红红的花瓣"],
          hear: ["叽叽", "小声地哭"],
          touch: ["毛茸茸的", "抖个不停"],
          feel: ["有点担心", "很同情它"],
        },
        example: { plain: "小鸟很冷。", rich: "一只湿透的小鸟缩在花瓣下，冷得抖个不停，叽叽地叫着。" },
      },
      {
        partner: "咪咪想了一个好办法，要帮助这个新朋友。",
        prompt: "咪咪是怎么帮忙的？最后怎么样了？",
        starters: ["咪咪拿来", "她把", "雨停了"],
        words: {
          see: ["一片大大的荷叶", "弯弯的彩虹", "金黄色的阳光"],
          hear: ["叽叽喳喳地唱歌"],
          touch: ["暖暖的毛巾"],
          smell: ["清新的空气"],
          feel: ["心里甜甜的", "笑眯眯地"],
        },
        example: { plain: "雨停了。", rich: "雨停了，天上挂着一道弯弯的彩虹，小鸟叽叽喳喳地唱起歌来。" },
      },
    ],
    ending: "从那天起，咪咪和小鸟成了好朋友。下雨天，再也不无聊了！",
  },
  {
    id: "forest-box",
    title: "森林里的神秘盒子",
    emoji: "🎁",
    blurb: "小兔子在大树下发现了一个奇怪的盒子……",
    beats: [
      {
        partner: "一天，小兔子乐乐在森林里散步，发现大树下有一个神秘的盒子。",
        prompt: "盒子是什么样子的？",
        starters: ["这个盒子", "盒子上面", "乐乐看见"],
        words: {
          see: ["金色的", "亮晶晶的星星", "旧旧的木头盒子", "一把小锁"],
          touch: ["硬硬的", "冰冰凉凉的", "粗粗的"],
          hear: ["静悄悄的森林"],
          feel: ["很好奇"],
        },
        example: { plain: "盒子很漂亮。", rich: "这个木头盒子旧旧的，上面画满了亮晶晶的星星。" },
      },
      {
        partner: "乐乐把耳朵贴在盒子上，好像听到了什么。",
        prompt: "盒子里有什么声音？乐乐觉得怎么样？",
        starters: ["盒子里传来", "乐乐吓了一跳", "她小心地"],
        words: {
          hear: ["咚咚咚", "嘀嘀嗒嗒", "沙沙沙", "轻轻的歌声"],
          feel: ["紧张得心怦怦跳", "又害怕又好奇", "吓了一跳"],
          touch: ["轻轻地抖动"],
        },
        example: { plain: "盒子里有声音。", rich: "盒子里传来咚咚咚的声音，乐乐紧张得心怦怦跳。" },
      },
      {
        partner: "乐乐深吸一口气，慢慢地打开了盒子……",
        prompt: "盒子里到底有什么？",
        starters: ["盒子里", "原来是", "一下子"],
        words: {
          see: ["一颗会发光的种子", "五颜六色的蝴蝶", "一只小小的机器人"],
          smell: ["甜甜的花香", "香喷喷的蛋糕味"],
          hear: ["哗的一声"],
          feel: ["惊讶得张大了嘴巴", "高兴得跳了起来"],
        },
        example: { plain: "里面有蝴蝶。", rich: "盒子一打开，五颜六色的蝴蝶像彩色的花瓣一样飞了出来。" },
      },
      {
        partner: "这时候，森林里的小动物们都跑过来看。",
        prompt: "大家一起做了什么？",
        starters: ["小松鼠", "大家一起", "乐乐和朋友们"],
        words: {
          see: ["毛茸茸的尾巴", "一张张笑脸"],
          hear: ["叽叽喳喳", "哈哈哈的笑声"],
          smell: ["香喷喷的果子"],
          feel: ["开开心心地", "快乐极了"],
        },
        example: { plain: "大家很开心。", rich: "大家一边吃着香喷喷的果子，一边哈哈哈地笑个不停。" },
      },
    ],
    ending: "太阳下山了，乐乐把神秘盒子放在床边。她想：明天，还会有什么惊喜呢？",
  },
  {
    id: "beach-day",
    title: "海边的一天",
    emoji: "🏖️",
    blurb: "放假了！一家人去海边玩……",
    beats: [
      {
        partner: "星期六，小明和爸爸妈妈来到了海边。",
        prompt: "海边是什么样子的？",
        starters: ["大海", "沙滩上", "小明看到"],
        words: {
          see: ["蓝蓝的大海", "金黄色的沙滩", "白白的浪花"],
          hear: ["哗哗的海浪声", "海鸥的叫声"],
          smell: ["咸咸的海风"],
          touch: ["软软的沙子", "热热的太阳"],
          feel: ["高兴得跳了起来"],
        },
        example: { plain: "大海很大。", rich: "蓝蓝的大海一眼望不到边，白白的浪花哗哗地跑上沙滩。" },
      },
      {
        partner: "小明脱了鞋子，跑到沙滩上玩。",
        prompt: "小明在沙滩上玩什么？",
        starters: ["小明用沙子", "他蹲下来", "小明捡到"],
        words: {
          see: ["一座高高的城堡", "五颜六色的贝壳", "一只横着走的小螃蟹"],
          touch: ["软软的沙子", "滑滑的贝壳", "痒痒的"],
          hear: ["沙沙"],
          feel: ["很认真", "得意地笑了"],
        },
        example: { plain: "小明堆城堡。", rich: "小明用软软的沙子堆了一座高高的城堡，还插上了一面小旗子。" },
      },
      {
        partner: "突然，一个大浪冲了过来！",
        prompt: "发生了什么事？小明觉得怎么样？",
        starters: ["浪花", "小明的城堡", "哎呀"],
        words: {
          hear: ["哗啦一声", "轰的一声"],
          see: ["高高的浪", "城堡不见了"],
          touch: ["冰冰凉凉的海水"],
          feel: ["吓了一跳", "有点难过", "哈哈大笑"],
        },
        example: { plain: "城堡没了。", rich: "哗啦一声，大浪冲过来，城堡一下子就不见了，小明吓了一跳。" },
      },
      {
        partner: "傍晚，太阳慢慢地落到海里去了。",
        prompt: "傍晚的海边美吗？小明在想什么？",
        starters: ["天空", "太阳", "小明想"],
        words: {
          see: ["红红的太阳", "橘黄色的天空", "亮晶晶的海面"],
          hear: ["轻轻的海浪声"],
          smell: ["烤玉米的香味"],
          touch: ["凉凉的风"],
          feel: ["舍不得走", "心里暖暖的"],
        },
        example: { plain: "太阳下山了。", rich: "红红的太阳像一个大火球，慢慢地落进了亮晶晶的海里。" },
      },
    ],
    ending: "回家的路上，小明在车里睡着了。他梦见自己又回到了海边……",
  },
];

export function getAdventure(id: string): Adventure | undefined {
  return ADVENTURES.find((a) => a.id === id);
}
