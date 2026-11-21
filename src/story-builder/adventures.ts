import type { NewWord } from "./partnerApi";
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
  /** 🤔 The question said more simply, with ideas to think about, for a
   * child who doesn't know what to write. */
  explain: string;
  /** Sentence starters the child can tap to begin. */
  starters: string[];
  /** Scene-specific words for the five-senses helper. */
  words: Partial<Record<SenseId, string[]>>;
  /** A short "plain → richer" example sentence for this scene. */
  example: { plain: string; rich: string };
  /** 📗 新词: a word in `partner` worth learning, usually an everyday
   * Singapore word (组屋楼下, 巴刹, 小息). */
  word?: NewWord;
  /**
   * Other ways 团团 could write this beat, for the turn where the child
   * picks which way the story goes (see `CHOICE_AFTER_TURN` in flow.ts).
   * Each must still lead into the next beat. Hints come from this beat.
   */
  choices?: { partner: string; prompt: string; explain: string; starters: string[]; word?: NewWord }[];
}

/**
 * The ready-made stories are set in a Singapore child's everyday life
 * (组屋楼下, the school canteen at 小息, the 巴刹, East Coast Park), not
 * fairy tales, so the child picks up the words for the world around them.
 */
export interface Adventure {
  id: string;
  title: string;
  emoji: string;
  /** Who the story is about — used in the cover blurb. */
  blurb: string;
  /** 📖 故事小知识: what the place or topic is, for a child who has never
   * been there (what a void deck is, what you find at a 巴刹). */
  about: string;
  beats: Beat[];
  /** The partner's closing line after the last beat. */
  ending: string;
}

export const ADVENTURES: Adventure[] = [
  {
    id: "void-deck",
    title: "组屋楼下的下午",
    emoji: "🏢",
    blurb: "放学后，小华在组屋楼下等好朋友……",
    about: "新加坡很多人住在组屋里。组屋最下面的一层空空的，没有住人，叫“组屋楼下”。小朋友在这里玩，爷爷们在这里下棋，邻居们在这里聊天。旁边常常还有一个游乐场。",
    beats: [
      {
        partner: "放学后，小华背着书包回到组屋楼下，好朋友阿明已经在等她了。",
        prompt: "组屋楼下是什么样子的？谁在那里？",
        explain: "想一想：组屋楼下有什么东西？有哪些人？他们在做什么？",
        word: { word: "组屋楼下", meaning: "组屋最下面空空的一层，大家可以在这里玩、聊天。" },
        starters: ["组屋楼下", "小华看见", "阿明"],
        words: {
          see: ["一排排信箱", "下棋的爷爷们", "石桌石椅"],
          hear: ["叮的一声", "哈哈的笑声", "啪的一声"],
          touch: ["凉凉的石凳", "沉甸甸的书包"],
          smell: ["香喷喷的饭菜"],
          feel: ["迫不及待", "兴高采烈"],
        },
        example: { plain: "楼下有很多人。", rich: "组屋楼下热闹极了，下棋的爷爷们围着石桌，哈哈的笑声停不下来。" },
      },
      {
        partner: "两个人跑到旁边的游乐场去玩。",
        prompt: "他们在游乐场玩什么？",
        explain: "游乐场有滑梯、秋千、攀爬架。小华和阿明先玩哪一个？怎么玩？",
        word: { word: "游乐场", meaning: "有滑梯、秋千，给小朋友玩的地方。" },
        choices: [
          {
            partner: "两个人在组屋楼下踢起了足球。",
            prompt: "踢球的时候发生了什么？",
            explain: "他们在组屋楼下踢足球。谁踢得最好？球踢到哪里去了？",
            starters: ["阿明用力一踢", "足球", "小华跑过去"],
            word: { word: "足球", meaning: "用脚踢的球。" },
          },
          {
            partner: "邻居婆婆提着一大袋东西，慢慢地走过来。",
            prompt: "婆婆需要什么帮忙？",
            explain: "婆婆提着很重的袋子。小华和阿明可以怎么帮婆婆？",
            starters: ["小华跑过去", "他们帮婆婆", "婆婆笑着说"],
            word: { word: "邻居", meaning: "住在你家旁边的人。" },
          },
        ],
        starters: ["他们一起", "小华爬上", "阿明荡着"],
        words: {
          see: ["高高的滑梯", "晃来晃去的秋千", "五颜六色的攀爬架"],
          hear: ["嗖的一声", "咯咯的笑声", "嘎吱嘎吱"],
          touch: ["滑溜溜的", "晒得发烫的滑梯"],
          smell: ["青草的味道"],
          feel: ["玩得满头大汗", "开心得哈哈大笑"],
        },
        example: { plain: "他们玩滑梯。", rich: "他们一个接一个，嗖的一声从高高的滑梯上滑了下来。" },
      },
      {
        partner: "突然，天空乌云密布，下起了倾盆大雨！",
        prompt: "下大雨了，他们怎么办？",
        explain: "雨突然下得很大。他们会跑去哪里躲雨？身上怎么样了？",
        word: { word: "倾盆大雨", meaning: "雨非常大，好像有人用盆把水倒下来。" },
        starters: ["他们赶紧", "雨点", "小华大喊"],
        words: {
          see: ["乌云密布", "白茫茫的一片"],
          hear: ["哗啦啦", "轰隆隆的雷声"],
          touch: ["湿淋淋的", "冷得发抖"],
          smell: ["泥土的味道"],
          feel: ["手忙脚乱", "吓了一跳"],
          pattern: ["像两只落汤鸡"],
        },
        example: { plain: "他们跑回去。", rich: "他们像两只落汤鸡，手忙脚乱地冲回组屋楼下躲雨。" },
      },
      {
        partner: "雨停了，邻居婆婆拿来了两条干毛巾。",
        prompt: "婆婆说了什么？他们心里觉得怎么样？",
        explain: "婆婆给了他们毛巾。婆婆会说什么话？他们会怎么谢谢婆婆？",
        starters: ["婆婆笑着说", "小华接过", "他们一起"],
        words: {
          see: ["一道彩虹", "亮晶晶的水坑"],
          hear: ["谢谢婆婆"],
          touch: ["软绵绵的毛巾", "暖暖的"],
          smell: ["清新的空气"],
          feel: ["心里暖洋洋的", "感激地说"],
        },
        example: { plain: "他们说谢谢。", rich: "他们接过软绵绵的毛巾，心里暖洋洋的，大声说：“谢谢婆婆！”" },
      },
    ],
    ending: "雨后的天空挂着一道彩虹。小华和阿明说：“明天放学，我们再来楼下玩！”",
  },
  {
    id: "recess",
    title: "小息的时候",
    emoji: "🍜",
    blurb: "铃声响了，美玲拿着零用钱跑到食堂……",
    about: "上课上到一半，学校会让大家休息一下，这就是“小息”。小息的时候，同学们去食堂排队买东西吃，用的是爸爸妈妈给的零用钱。",
    beats: [
      {
        partner: "叮铃铃，小息的铃声响了！美玲和同学们排着队，走进了食堂。",
        prompt: "食堂里是什么样子的？",
        explain: "食堂是学校里买东西吃的地方。那里有很多摊位和同学，你看到、闻到、听到了什么？",
        word: { word: "小息", meaning: "上课中间休息、吃东西的时间。" },
        starters: ["食堂里", "美玲看见", "每个摊位"],
        words: {
          see: ["长长的队伍", "一个个摊位", "人山人海"],
          hear: ["吵吵闹闹", "叮铃铃"],
          smell: ["香喷喷的炒面", "香味扑鼻"],
          touch: ["热乎乎的"],
          feel: ["饿得肚子咕咕叫", "迫不及待"],
        },
        example: { plain: "食堂有很多人。", rich: "食堂里人山人海，每个摊位前都排着长长的队伍。" },
      },
      {
        partner: "美玲拿出零用钱，想买一样好吃的东西。",
        prompt: "美玲买了什么？味道怎么样？",
        explain: "美玲喜欢吃什么？可以是鸡饭、面、炸鸡翅……吃起来是什么味道？",
        word: { word: "零用钱", meaning: "爸爸妈妈给你，让你自己买东西的钱。" },
        choices: [
          {
            partner: "美玲看见同班的小文一个人坐着，好像不开心。",
            prompt: "小文怎么了？美玲怎么做？",
            explain: "小文一个人坐着，不开心。他为什么不开心？美玲会过去对他说什么？",
            starters: ["美玲走过去", "原来小文", "美玲把"],
            word: { word: "同班", meaning: "在同一个班上课。" },
          },
          {
            partner: "排队的时候，美玲发现地上有一个钱包。",
            prompt: "美玲会怎么做？",
            explain: "地上有一个别人的钱包。美玲会拿去给谁？要怎么做才对？",
            starters: ["美玲捡起", "她把钱包", "老师说"],
            word: { word: "钱包", meaning: "装钱的小包。" },
          },
        ],
        starters: ["美玲买了", "她咬了一口", "这碗面"],
        words: {
          see: ["金黄色的鸡翅", "一碗热腾腾的面"],
          hear: ["吸溜吸溜", "咔嚓一声"],
          smell: ["香喷喷的", "香味扑鼻"],
          touch: ["冰凉凉的饮料", "脆脆的"],
          feel: ["津津有味", "心满意足"],
        },
        example: { plain: "美玲吃面。", rich: "美玲吸溜吸溜地吃着热腾腾的面，吃得津津有味。" },
      },
      {
        partner: "这时候，美玲不小心把饮料打翻了！",
        prompt: "发生了什么？谁来帮忙？",
        explain: "饮料洒出来了！桌子和地上怎么样了？美玲着急吗？哪个同学来帮她？",
        word: { word: "打翻", meaning: "把杯子弄倒了，里面的东西流出来。" },
        starters: ["哐当一声", "饮料流到", "同学们"],
        words: {
          see: ["湿了一大片", "一张张着急的脸"],
          hear: ["哐当一声", "哎呀"],
          touch: ["黏糊糊的"],
          feel: ["脸红得像苹果", "不知所措"],
          pattern: ["像一条小河"],
        },
        example: { plain: "饮料倒了。", rich: "哐当一声，饮料像一条小河流了一地，美玲急得不知所措。" },
      },
      {
        partner: "同学们一起帮忙，很快就把桌子擦干净了。",
        prompt: "最后，美玲心里觉得怎么样？",
        explain: "同学们帮了美玲。她心里有什么感觉？她会对同学说什么？",
        starters: ["美玲笑着说", "大家", "她觉得"],
        words: {
          see: ["干干净净的桌子", "一张张笑脸"],
          hear: ["谢谢你们"],
          feel: ["心里暖洋洋的", "感动极了"],
        },
        example: { plain: "美玲很开心。", rich: "看着干干净净的桌子，美玲心里暖洋洋的，笑着说：“谢谢你们！”" },
      },
    ],
    ending: "铃声又响了，大家回到课室上课。美玲想：有好朋友真好！",
  },
  {
    id: "pasar",
    title: "跟婆婆去巴刹",
    emoji: "🥬",
    blurb: "星期六一大早，小明跟着婆婆去巴刹买菜……",
    about: "“巴刹”就是菜市场，有卖菜的、卖鱼的、卖肉的、卖水果的摊位，地上常常湿湿的，很热闹。很多巴刹的旁边或楼上就是小贩中心，可以吃早餐。",
    beats: [
      {
        partner: "星期六一大早，小明跟着婆婆去巴刹买菜。",
        prompt: "巴刹里是什么样子的？",
        explain: "巴刹就是菜市场。想一想：那里卖什么东西？人多不多？有什么声音和味道？",
        word: { word: "巴刹", meaning: "卖菜、卖鱼、卖肉的市场。" },
        starters: ["巴刹里", "小明看到", "卖菜的阿姨"],
        words: {
          see: ["绿油油的蔬菜", "活蹦乱跳的鱼", "眼花缭乱"],
          hear: ["大声地叫卖", "人声鼎沸"],
          smell: ["腥腥的鱼味", "香喷喷的包子"],
          touch: ["湿漉漉的地板"],
          feel: ["很好奇", "目不转睛"],
        },
        example: { plain: "巴刹很热闹。", rich: "巴刹里人声鼎沸，卖菜的阿姨大声地叫卖着。" },
      },
      {
        partner: "婆婆走到卖鱼的摊位，和叔叔讨价还价。",
        prompt: "小明在鱼摊看到了什么？",
        explain: "鱼摊上有很多鱼，放在冰块上。鱼是什么样子的？卖鱼的叔叔在做什么？",
        word: { word: "讨价还价", meaning: "买东西的时候，跟卖的人商量价钱。" },
        choices: [
          {
            partner: "小明跟着婆婆走到水果摊，闻到了榴梿的味道。",
            prompt: "榴梿是什么样子的？",
            explain: "榴梿是有很多刺的水果，味道很浓。它看起来、闻起来是怎么样的？小明喜欢吗？",
            starters: ["榴梿", "小明捏着鼻子", "婆婆买了"],
            word: { word: "榴梿", meaning: "有很多刺、味道很香的水果。" },
          },
          {
            partner: "婆婆的菜篮越来越重，小明想帮忙。",
            prompt: "小明怎么帮婆婆？",
            explain: "婆婆的菜篮越来越重了。小明可以怎么帮忙？他会对婆婆说什么？",
            starters: ["小明说", "他接过", "婆婆笑着"],
            word: { word: "菜篮", meaning: "装菜的篮子。" },
          },
        ],
        starters: ["冰块上", "鱼摊的叔叔", "小明蹲下来"],
        words: {
          see: ["一条条银色的鱼", "亮晶晶的冰块"],
          hear: ["哗哗的水声", "啪啪地甩尾巴"],
          smell: ["腥腥的味道"],
          touch: ["滑溜溜的鱼", "冰冰凉凉的"],
          feel: ["目不转睛", "吓了一跳"],
          pattern: ["像一面面小镜子"],
        },
        example: { plain: "鱼很多。", rich: "冰块上躺着一条条银色的鱼，像一面面闪亮的小镜子。" },
      },
      {
        partner: "买完菜，婆婆带小明到小贩中心吃早餐。",
        prompt: "他们吃了什么？味道怎么样？",
        explain: "小贩中心有很多好吃的，比如面、炒粿条、面包和咖啡。他们点了什么？好吃吗？",
        word: { word: "小贩中心", meaning: "有很多小吃摊位，大家坐在一起吃东西的地方。" },
        starters: ["婆婆点了", "小明吃了", "热乎乎的"],
        words: {
          see: ["一盘炒粿条", "热腾腾的白气"],
          hear: ["滋滋的炒菜声", "吸溜吸溜"],
          smell: ["咖啡的香味", "香味扑鼻"],
          touch: ["热乎乎的", "软软的面包"],
          feel: ["心满意足", "吃得津津有味"],
        },
        example: { plain: "早餐很好吃。", rich: "热乎乎的面包配上香浓的咖啡，小明吃得津津有味。" },
      },
      {
        partner: "回家的路上，小明帮婆婆提着重重的菜篮。",
        prompt: "婆婆说了什么？小明觉得怎么样？",
        explain: "小明帮婆婆提菜篮。婆婆会怎么夸他？小明累不累？开心吗？",
        starters: ["婆婆摸摸", "小明说", "虽然菜篮"],
        words: {
          see: ["满满的菜篮", "婆婆的笑脸"],
          touch: ["沉甸甸的", "手臂酸酸的"],
          feel: ["很自豪", "心里甜甜的"],
        },
        example: { plain: "菜篮很重。", rich: "菜篮沉甸甸的，小明的手臂酸酸的，可是他心里很自豪。" },
      },
    ],
    ending: "晚上，婆婆用早上买的鱼煮了一锅香喷喷的鱼汤。小明说：“下次我还要去巴刹！”",
  },
  {
    id: "beach-day",
    title: "东海岸公园",
    emoji: "🏖️",
    blurb: "星期天，一家人去东海岸公园骑脚车……",
    about: "东海岸公园在新加坡的海边，很长很长。大家在这里骑脚车、放风筝、在沙滩上玩，还可以烧烤。海风吹来，凉凉的，咸咸的。",
    beats: [
      {
        partner: "星期天，美玲一家人来到东海岸公园，租了几辆脚车。",
        prompt: "公园里是什么样子的？",
        explain: "东海岸公园在海边。你会看到大海、沙滩、树和很多人。他们在做什么？",
        word: { word: "脚车", meaning: "自行车。新加坡人常常叫它“脚车”。" },
        starters: ["大海", "公园里", "美玲看到"],
        words: {
          see: ["蓝蓝的大海", "一艘艘大船", "高高的椰子树"],
          hear: ["哗哗的海浪声", "叮铃铃的车铃"],
          smell: ["咸咸的海风"],
          touch: ["软软的沙子", "火辣辣的太阳"],
          feel: ["兴高采烈"],
        },
        example: { plain: "海很美。", rich: "蓝蓝的大海一眼望不到边，远处停着一艘艘大船。" },
      },
      {
        partner: "美玲骑着脚车，沿着海边慢慢地骑。",
        prompt: "一路上美玲看到了什么？",
        explain: "美玲在海边骑脚车。路边有什么人、什么东西？风吹在身上是什么感觉？",
        choices: [
          {
            partner: "美玲放下脚车，跑到沙滩上堆沙堡。",
            prompt: "她的沙堡是什么样子的？",
            explain: "美玲用沙子堆城堡。城堡有多高？她用了什么来装饰？",
            starters: ["美玲用沙子", "沙堡上", "她找来"],
            word: { word: "沙堡", meaning: "用沙子堆成的城堡。" },
          },
          {
            partner: "爸爸在烧烤炉旁边，开始烤鸡翅。",
            prompt: "烤鸡翅的时候发生了什么？",
            explain: "爸爸在烧烤。鸡翅烤得怎么样了？有什么味道和声音？",
            starters: ["鸡翅", "爸爸翻着", "美玲闻到"],
            word: { word: "烧烤", meaning: "在炭火上烤东西吃。" },
          },
        ],
        starters: ["海风", "美玲骑得", "路边"],
        words: {
          see: ["放风筝的小朋友", "绿油油的草地"],
          hear: ["呼呼的海风", "叮铃铃"],
          touch: ["凉凉的风", "满头大汗"],
          feel: ["心旷神怡", "自由自在"],
          pattern: ["像一只小鸟"],
        },
        example: { plain: "美玲骑得很快。", rich: "海风呼呼地吹，美玲骑得飞快，像一只自由自在的小鸟。" },
      },
      {
        partner: "突然，一阵大风把美玲的帽子吹走了，大家手忙脚乱地去追。",
        prompt: "帽子飞到哪里去了？",
        explain: "大风把帽子吹走了！帽子飞到了哪里？大家怎么去拿回来？",
        word: { word: "手忙脚乱", meaning: "急得不知道怎么做才好。" },
        starters: ["呼的一声", "帽子", "爸爸跳起来"],
        words: {
          see: ["飘来飘去", "高高的椰子树"],
          hear: ["呼的一声"],
          touch: ["凉凉的海水"],
          feel: ["急得直跺脚", "哭笑不得"],
          pattern: ["像一只风筝"],
        },
        example: { plain: "帽子飞走了。", rich: "呼的一声，帽子像一只风筝，飘到了高高的椰子树上。" },
      },
      {
        partner: "傍晚，太阳慢慢地落到海里去了。",
        prompt: "傍晚的海边美吗？美玲在想什么？",
        explain: "太阳快下山了。天空是什么颜色？美玲想回家吗？她在想什么？",
        starters: ["天空", "太阳", "美玲想"],
        words: {
          see: ["红红的太阳", "橘黄色的天空", "亮晶晶的海面"],
          hear: ["轻轻的海浪声"],
          smell: ["烤鸡翅的香味"],
          touch: ["凉凉的风"],
          feel: ["依依不舍", "心里暖暖的"],
        },
        example: { plain: "太阳下山了。", rich: "红红的太阳像一个大火球，慢慢地落进了亮晶晶的海里。" },
      },
    ],
    ending: "回家的路上，美玲在车里睡着了。她梦见自己又在海边骑脚车……",
  },
];

export function getAdventure(id: string): Adventure | undefined {
  return ADVENTURES.find((a) => a.id === id);
}
