import type { Level } from "./families";

/**
 * 火眼金睛: things 团团 wrote, with some characters wrong. In `text`,
 * each mistake is written `{wrong|right}`: what 团团 wrote, then the
 * right character (one character each, from the same family in
 * `families.ts`). `oops` has one funny reveal per mistake, in the same
 * order: what 团团 actually wrote, so the child laughs and remembers why.
 *
 * Kinds:
 *  - "find": a note; the child is told how many mistakes there are.
 *  - "quick": one short sentence with one mistake, for the timed round.
 *  - "essay": 团团's 作文; the child is NOT told how many.
 *
 * `starter` marks the very first note: short, one obvious mistake, and
 * no ink is used up.
 */
export type NoteKind = "find" | "quick" | "essay";

export interface Note {
  id: string;
  level: Level;
  kind: NoteKind;
  emoji: string;
  title: string;
  text: string;
  oops: string[];
  starter?: boolean;
}

export const NOTES: readonly Note[] = [
  // ───────────── P3 ─────────────
  {
    id: "p3-play",
    level: 3,
    kind: "find",
    starter: true,
    emoji: "📝",
    title: "给妈妈的便条",
    text: "妈妈，我去楼下的操{厂|场}玩，五点回家。",
    oops: ["“操厂”？操场变成工厂了，要在里面做东西吗？🏭"],
  },
  {
    id: "p3-lift",
    level: 3,
    kind: "find",
    emoji: "🛗",
    title: "电梯里的通告",
    text: "各位邻居：{清|请}不要在电梯里吃东西。楼下的游乐{厂|场}明天要修理，{在|再}过两天就可以玩了。谢谢！",
    oops: [
      "“清不要”？“清”是清水，团团在跟水说话吗？💧",
      "“游乐厂”？在工厂里玩滑梯吗？🏭🛝",
      "“在过两天”？两天又不是一个地方！要说又一次，是“再”。🔁",
    ],
  },
  {
    id: "p3-beach",
    level: 3,
    kind: "find",
    emoji: "🏖️",
    title: "东海岸的明信片",
    text: "亲爱的妈妈：今天是{睛|晴}天，我和爸爸去东海岸公园。我们在海边{泡|跑}步，还在海里游{永|泳}。我好开心！团团",
    oops: [
      "“睛天”？天上长了一只大眼睛！👁️☀️",
      "“泡步”？泡在水里跑步吗？🛁",
      "“游永”？永远在游，停不下来！🏊",
    ],
  },
  {
    id: "p3-bag",
    level: 3,
    kind: "find",
    emoji: "💬",
    title: "给爸爸的短信",
    text: "爸爸，你下班回家的时候，可以{巴|把}我的书{抱|包}带回来{妈|吗}？我把它忘在车上了。",
    oops: [
      "“巴我的书包”？用嘴巴去拿吗？👄",
      "“书抱”？书本在抱抱！🤗📚",
      "“带回来妈？”要把妈妈也带回来吗？👩",
    ],
  },
  {
    id: "p3-q-canteen",
    level: 3,
    kind: "quick",
    emoji: "🍛",
    title: "食堂",
    text: "我{再|在}食堂吃椰浆饭。",
    oops: ["“再食堂”？吃了一次又一次吗？要说在哪里，是“在”。🍛🍛"],
  },
  {
    id: "p3-q-cat",
    level: 3,
    kind: "quick",
    emoji: "🐱",
    title: "小猫",
    text: "小猫的眼{晴|睛}是蓝色的。",
    oops: ["“眼晴”？小猫的眼睛里出太阳了！☀️🐱"],
  },
  {
    id: "p3-q-puppy",
    level: 3,
    kind: "quick",
    emoji: "🐶",
    title: "小狗",
    text: "我{包|抱}着小狗回家。",
    oops: ["“包”着小狗？把小狗包成一个包裹！📦🐶"],
  },
  {
    id: "p3-q-hello",
    level: 3,
    kind: "quick",
    emoji: "👋",
    title: "问好",
    text: "你好{妈|吗}？我很好。",
    oops: ["“你好妈？”你在跟妈妈打招呼吗？👩"],
  },
  {
    id: "p3-q-full",
    level: 3,
    kind: "quick",
    emoji: "🍜",
    title: "吃饱了",
    text: "我吃{泡|饱}了，不想再吃了。",
    oops: ["吃“泡”了？吃了一肚子泡泡！🫧"],
  },
  {
    id: "p3-q-crawl",
    level: 3,
    kind: "quick",
    emoji: "👶",
    title: "小弟弟",
    text: "小弟弟在地上{巴|爬}来爬去。",
    oops: ["“巴来爬去”？用嘴巴走路吗？👄"],
  },
  {
    id: "p3-q-door",
    level: 3,
    kind: "quick",
    emoji: "🚪",
    title: "开门",
    text: "{情|请}你帮我开门，好吗？",
    oops: ["“情你帮我”？团团把心情送给你了！💗"],
  },
  {
    id: "p3-e-weekend",
    level: 3,
    kind: "essay",
    emoji: "📒",
    title: "我的周末",
    text: "星期六是{睛|晴}天。早上，我和爸爸去巴刹买菜。巴刹里有很多鱼和虾，还有红红的辣椒。买完菜，我们去小贩中心吃早餐。我吃了一碗面，吃得好{泡|饱}。下午，我在楼下的游乐{厂|场}玩，玩到五点才回家。我的心{晴|情}好极了！",
    oops: [
      "“睛天”？天上长了一只大眼睛！👁️☀️",
      "吃得好“泡”？肚子里都是泡泡！🫧",
      "“游乐厂”？在工厂里玩滑梯吗？🏭🛝",
      "心“晴”？心里出太阳了……很可爱，可是心里的感觉要用“情”！💗",
    ],
  },
  {
    id: "p3-e-dog",
    level: 3,
    kind: "essay",
    emoji: "📒",
    title: "我的小狗",
    text: "我家有一只小狗，它叫豆豆。它的眼{晴|睛}又大又亮。每天放学，豆豆都会{泡|跑}到门口等我。我{包|抱}起它，它就舔我的脸。晚上，我给它洗澡，它身上都是泡泡。我说：“豆豆，明天{在|再}玩吧！”",
    oops: [
      "“眼晴”？豆豆的眼睛里出太阳了！☀️🐶",
      "“泡”到门口？豆豆是泡泡做的吗？🫧",
      "我“包”起它？把豆豆包成一个包裹！📦",
      "“明天在玩”？要说又一次，是“再”！🔁",
    ],
  },

  // ───────────── P4 ─────────────
  {
    id: "p4-library",
    level: 4,
    kind: "find",
    emoji: "📚",
    title: "图书馆的告示",
    text: "{以|已}经借了书的同学，请在星期五{已|以}前还书。图书{管|馆}里不可以大声说话。",
    oops: [
      "“以经”？要说做完了，是“已经”的“已”。✅",
      "星期五“已前”？要说以前、以后，是“以”。⏪",
      "图书“管”？把书塞进水管里吗？🚰📚",
    ],
  },
  {
    id: "p4-homework",
    level: 4,
    kind: "find",
    emoji: "✏️",
    title: "团团的日记",
    text: "今天的{公|功}课好多啊！我在书桌前{座|坐}了两个小时，真{幸|辛}苦。做完以后，妈妈给我一杯冰美禄，我觉得好{辛|幸}福！",
    oops: [
      "“公课”？大家一起的功课吗？那我只做一点点！😄",
      "“座”了两个小时？团团变成一张椅子了！🪑",
      "“幸苦”？又幸运又辛苦，到底是哪个？🤔",
      "“辛福”？好辛苦的福气……要写“幸福”！😅",
    ],
  },
  {
    id: "p4-museum",
    level: 4,
    kind: "find",
    emoji: "🏛️",
    title: "参观通知",
    text: "通知：星期三全班去博物{管|馆}参观。请大家{戴|带}一个水壶。在外面走路时，头上要{带|戴}着帽子。",
    oops: [
      "博物“管”？在水管里看展览吗？🚰",
      "“戴”一个水壶？把水壶戴在头上吗？🥤🎩",
      "头上“带”着帽子？帽子是戴在头上的！🧢",
    ],
  },
  {
    id: "p4-park",
    level: 4,
    kind: "find",
    emoji: "🌸",
    title: "公园的牌子",
    text: "{工|公}园里的花很{票|漂}亮，请不要摘。风一吹，叶子就{漂|飘}下来。",
    oops: [
      "“工园”？公园变成工地了！🚧",
      "“票亮”？一张会发亮的车票！🎫✨",
      "叶子“漂”下来？叶子是被风吹的，要用“飘”！🍃",
    ],
  },
  {
    id: "p4-q-done",
    level: 4,
    kind: "quick",
    emoji: "🍽️",
    title: "吃完了",
    text: "我{以|已}经吃完饭了。",
    oops: ["“以经”？要说做完了，是“已经”！✅"],
  },
  {
    id: "p4-q-drawing",
    level: 4,
    kind: "quick",
    emoji: "🎨",
    title: "我的画",
    text: "这是我自{已|己}画的画。",
    oops: ["自“已”？“自己”的“己”，口是全开的！"],
  },
  {
    id: "p4-q-seat",
    level: 4,
    kind: "quick",
    emoji: "🚌",
    title: "巴士上",
    text: "巴士上没有{坐|座}位了。",
    oops: ["“坐位”？坐的地方要用“座”！💺"],
  },
  {
    id: "p4-q-glasses",
    level: 4,
    kind: "quick",
    emoji: "👓",
    title: "爷爷",
    text: "爷爷{带|戴}着眼镜看报纸。",
    oops: ["“带”着眼镜？爷爷把眼镜放在口袋里看报纸吗？👓"],
  },
  {
    id: "p4-q-workers",
    level: 4,
    kind: "quick",
    emoji: "👷",
    title: "修路",
    text: "{公|工}人叔叔在修路。",
    oops: ["“公人”？做工作的人是“工人”！👷"],
  },
  {
    id: "p4-q-lucky",
    level: 4,
    kind: "quick",
    emoji: "🍀",
    title: "运气",
    text: "我今天真{辛|幸}运，捡到一块钱。",
    oops: ["“辛运”？好辛苦的运气！😅🍀"],
  },
  {
    id: "p4-q-dress",
    level: 4,
    kind: "quick",
    emoji: "👗",
    title: "新衣服",
    text: "这件衣服真{飘|漂}亮！",
    oops: ["“飘亮”？衣服被风吹走了！👕💨"],
  },
  {
    id: "p4-e-library",
    level: 4,
    kind: "essay",
    emoji: "📒",
    title: "去图书馆",
    text: "星期六，我和姐姐去图书{管|馆}。我们{座|坐}巴士去，车上人很多，没有{坐|座}位。到了以后，我借了三本书，姐姐借了两本。回家的路上下起了大雨，{辛|幸}好妈妈叫我们{戴|带}了雨伞。虽然有点累，可是我们很开心。",
    oops: [
      "图书“管”？把书塞进水管里吗？🚰📚",
      "我们“座”巴士？团团把自己当成椅子了！🪑",
      "“坐位”？坐的地方要用“座”！💺",
      "“辛好”？好辛苦……要写“幸好”！🍀",
      "“戴”了雨伞？把雨伞戴在头上吗？☂️🎩",
    ],
  },
  {
    id: "p4-e-kite",
    level: 4,
    kind: "essay",
    emoji: "📒",
    title: "放风筝",
    text: "今天风很大，爸爸带我去{工|公}园放风筝。我的风筝是红色的，很{票|漂}亮。风筝{漂|飘}到天上，越飞越高。旁边的小朋友说：“哇，你的风筝好厉害！”我{以|已}经玩了一个小时，还不想回家。爸爸说：“{已|以}后我们再来。”",
    oops: [
      "“工园”？公园变成工地了！🚧",
      "“票亮”？一张会发亮的车票！🎫✨",
      "风筝“漂”到天上？天上又没有水！要用“飘”。🪁",
      "“以经”？要说做完了，是“已经”！✅",
      "“已后”？要说以后，是“以”！⏩",
    ],
  },

  // ───────────── P5 ─────────────
  {
    id: "p5-debate",
    level: 5,
    kind: "find",
    emoji: "📣",
    title: "比赛海报",
    text: "华文{辨|辩}论比赛：本星期五下午两点，在礼堂举行。欢迎大家来看！这是一场{竟|竞}赛，比一比哪一组最{历|厉}害。",
    oops: [
      "“辨论”？用嘴说话要用“辩”，中间是讠！🗣️",
      "“竟赛”？竟然在比赛！要写“竞赛”。🏁",
      "“历害”？历史很厉害吗？要写“厉害”！💪📜",
    ],
  },
  {
    id: "p5-garden",
    level: 5,
    kind: "find",
    emoji: "🌱",
    title: "团团的日记",
    text: "今天我在花园里帮爷爷{拨|拔}草。天气很干{澡|燥}，我流了很多汗。回家后，我马上去洗{燥|澡}。洗完以后，我{拔|拨}了一个电话给奶奶。",
    oops: [
      "“拨”草？用手指轻轻拨，草可不会出来！要用力“拔”！🌱",
      "干“澡”？干干地洗澡吗？🛁🏜️",
      "洗“燥”？用火来洗澡，好烫！🔥",
      "“拔”了一个电话？把电话线拔出来了！📞🔌",
    ],
  },
  {
    id: "p5-sister",
    level: 5,
    kind: "find",
    emoji: "🎤",
    title: "姐姐的演讲",
    text: "姐姐的头发很长，她每天都绑两条{辩|辫}子。今天她要参加演讲，可是她很急{燥|躁}，一直走来走去。我对她说：“你{即|既}然准备好了，就不用担心。”",
    oops: [
      "“辩子”？会说话、会吵架的辫子！🗣️💇‍♀️",
      "急“燥”？急得头上冒火吗？着急会跺脚，是足字旁的“躁”！🦶",
      "“即然”？要说已经这样，是“既然”！",
    ],
  },
  {
    id: "p5-history",
    level: 5,
    kind: "find",
    emoji: "📜",
    title: "历史课",
    text: "{厉|历}史课上，老师讲了新加坡的故事。我听得很入迷，{竞|竟}然忘了下课的时间。下课铃一响，我{既|即}刻跑去找朋友分享。",
    oops: [
      "“厉史”？很厉害的历史吗？要写“历史”。📜",
      "“竞然”？竟然变成了比赛！🏃",
      "“既刻”？要说马上，是“即刻”的“即”。⏱️",
    ],
  },
  {
    id: "p5-q-hear",
    level: 5,
    kind: "quick",
    emoji: "👂",
    title: "说话太快",
    text: "他说话很快，我{辩|辨}不清楚。",
    oops: ["“辩”不清楚？吵来吵去还是不清楚！分清楚要用“辨”。"],
  },
  {
    id: "p5-q-braid",
    level: 5,
    kind: "quick",
    emoji: "🎀",
    title: "小辫子",
    text: "妹妹梳了两条小{辨|辫}子。",
    oops: ["小“辨”子？辫子是用头发编的，要用绞丝旁！🎀"],
  },
  {
    id: "p5-q-team",
    level: 5,
    kind: "quick",
    emoji: "⚽",
    title: "足球队",
    text: "我们班的足球队真{历|厉}害！",
    oops: ["真“历”害？足球队变成历史书了！📜⚽"],
  },
  {
    id: "p5-q-quiet",
    level: 5,
    kind: "quick",
    emoji: "🤫",
    title: "安静",
    text: "老师一进来，大家立{既|即}安静下来。",
    oops: ["立“既”？要说马上，是“立即”！⏱️"],
  },
  {
    id: "p5-q-dry",
    level: 5,
    kind: "quick",
    emoji: "🏜️",
    title: "天气",
    text: "天气干{躁|燥}，要多喝水。",
    oops: ["干“躁”？天气急得跺脚吗？🦶"],
  },
  {
    id: "p5-q-swim",
    level: 5,
    kind: "quick",
    emoji: "🥇",
    title: "游泳比赛",
    text: "这次游泳{竟|竞}赛，我拿了第一名！",
    oops: ["“竟赛”？竟然在比赛？要写“竞赛”！🥇"],
  },
  {
    id: "p5-q-guitar",
    level: 5,
    kind: "quick",
    emoji: "🎸",
    title: "弹琴",
    text: "他用手指轻轻{拔|拨}动琴弦。",
    oops: ["“拔”动琴弦？把琴弦拔断了！🎸💥"],
  },
  {
    id: "p5-e-debate",
    level: 5,
    kind: "essay",
    emoji: "📒",
    title: "一场比赛",
    text: "上个月，学校举行了华文{辨|辩}论{竟|竞}赛。我们这一组的对手很{历|厉}害，我心里很急{燥|躁}。可是，老师说：“你们{即|既}然准备了那么久，就要相信自己。”比赛开始后，我{竞|竟}然一点儿也不紧张了。最后，我们赢了！",
    oops: [
      "“辨论”？用嘴说话要用“辩”，中间是讠！🗣️",
      "“竟赛”？竟然在比赛！要写“竞赛”。🏁",
      "“历害”？对手变成历史书了！📜",
      "急“燥”？急得头上冒火吗？着急会跺脚，是“躁”！🦶",
      "“即然”？要说已经这样，是“既然”！",
      "“竞然”？竟然变成了比赛！🏃",
    ],
  },
  {
    id: "p5-e-grandma",
    level: 5,
    kind: "essay",
    emoji: "📒",
    title: "外婆家",
    text: "假期里，我去外婆家住了几天。外婆家的院子里有很多杂草，我和表哥一起帮外婆{拨|拔}草。天气很干{澡|燥}，我们满身是汗。干完活，外婆让我们先去洗{燥|澡}。洗完澡，外婆帮表妹梳了两条{辩|辫}子。晚上，外婆给我们讲她小时候的经{厉|历}，我听得入了迷。",
    oops: [
      "“拨”草？用手指轻轻拨，草可不会出来！要用力“拔”！🌱",
      "干“澡”？干干地洗澡吗？🛁🏜️",
      "洗“燥”？用火来洗澡，好烫！🔥",
      "“辩子”？会说话、会吵架的辫子！🗣️💇‍♀️",
      "经“厉”？外婆小时候很凶吗？经过的事要用“历”！📜",
    ],
  },
];

export const noteById = (id: string): Note | undefined => NOTES.find((n) => n.id === id);

/** Notes of one level and kind, in the order written. */
export const notesFor = (level: Level, kind: NoteKind): Note[] =>
  NOTES.filter((n) => n.level === level && n.kind === kind);

export const starterNote = (): Note => NOTES.find((n) => n.starter) as Note;
