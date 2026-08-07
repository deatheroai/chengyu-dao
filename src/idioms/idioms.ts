import type { IdiomContent } from "./types";

/**
 * Snippet 1 content: 15 Lower Primary (ages 7-9) idioms, researched and
 * cross-checked against real Chinese reference sources (zdic.net, Baidu
 * Baike, multiple 成语词典 aggregators) rather than generated from
 * memory — see DECISIONS.md's 2026-08-06 entries for the full research
 * summary and rejected-candidates list. All 15 approved as-is on review,
 * including the two editorial calls flagged for explicit sign-off
 * (拔苗助长's colloquial form, and extending 相亲相爱 to family love).
 */
export const idioms: IdiomContent[] = [
  // --- Focus & Perseverance ---
  {
    id: "yi-xin-yi-yi",
    hanzi: "一心一意",
    pinyin: "yī xīn yī yì",
    literalMeaning: "一 (one) 心 (heart) 一 (one) 意 (mind) — one heart, one mind.",
    meaning: "To focus completely on one thing, without letting your attention wander to other things.",
    dailyLifeScenario:
      "You're doing your spelling homework at the kitchen table, but the TV is on and your toys are nearby. If you put everything else aside and give your homework your full attention until it's done, you are being 一心一意.",
    exampleSentence: {
      hanzi: "小明做作业的时候一心一意，不看电视也不玩玩具。",
      pinyin: "Xiǎomíng zuò zuòyè de shíhou yīxīn-yíyì, bú kàn diànshì yě bù wán wánjù.",
      english: "When Xiaoming does his homework, he focuses wholeheartedly — no TV, no toys.",
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes:
      "Meaning confirmed via zdic.net and multiple 成语词典 aggregators (origin: Chen Shou's Sanguozhi, 3rd century). Appears on a Malaysian primary school's published idiom list and Singapore PSLE-Chinese-prep compilations.",
  },
  {
    id: "you-shi-you-zhong",
    hanzi: "有始有终",
    pinyin: "yǒu shǐ yǒu zhōng",
    literalMeaning: "有 (have) 始 (a beginning) 有 (have) 终 (an end) — to have both a start and a finish.",
    meaning: "To carry a task all the way through to completion instead of stopping partway.",
    dailyLifeScenario:
      "You signed up for a school swimming course. After two lessons it feels hard and you want to quit — but you decide to keep going until you finish the whole course. That's 有始有终.",
    exampleSentence: {
      hanzi: "学游泳要有始有终，不能学到一半就放弃。",
      pinyin: "Xué yóuyǒng yào yǒushǐ-yǒuzhōng, bùnéng xué dào yíbàn jiù fàngqì.",
      english: "When learning to swim, see it through from start to finish — don't give up halfway.",
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning/origin (Analects, 论语·子张) confirmed via zdic.net and Baidu Baike.",
  },
  {
    id: "ban-tu-er-fei",
    hanzi: "半途而废",
    pinyin: "bàn tú ér fèi",
    literalMeaning: "半 (half) 途 (the road) 而 (and) 废 (abandon) — to abandon something halfway along the road.",
    meaning: "To give up on something before finishing it. Paired with 有始有终 as its cautionary opposite.",
    dailyLifeScenario:
      "You and a friend start building a big LEGO set together, but halfway through your friend wants to stop and play something else instead of finishing it. You can gently remind them not to 半途而废.",
    exampleSentence: {
      hanzi: "我们说好一起完成拼图，不能半途而废。",
      pinyin: "Wǒmen shuōhǎo yìqǐ wánchéng pīntú, bùnéng bàntú'érfèi.",
      english: "We agreed to finish the jigsaw puzzle together, so we can't give up halfway.",
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning/origin (礼记·中庸, the 'weaver's wife' fable) confirmed via Baidu Baike and multiple 成语词典 sources.",
  },
  {
    id: "shu-neng-sheng-qiao",
    hanzi: "熟能生巧",
    pinyin: "shú néng shēng qiǎo",
    literalMeaning: "熟 (skilled/familiar) 能 (can) 生 (give rise to) 巧 (skill) — familiarity gives rise to skill.",
    meaning: "The more you practise something, the better and easier it becomes — practice makes perfect.",
    dailyLifeScenario:
      "You keep dropping the ball the first few times you try basketball, but after practising every week, shooting hoops becomes easy. That's 熟能生巧.",
    exampleSentence: {
      hanzi: "弹钢琴要多多练习，熟能生巧。",
      pinyin: "Tán gāngqín yào duōduō liànxí, shúnéngshēngqiǎo.",
      english: "To play the piano well, you need lots of practice — practice makes perfect.",
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning confirmed via zdic.net; traced to the Northern Song 'oil-pourer' (卖油翁) story.",
  },
  {
    id: "mo-chu-cheng-zhen",
    hanzi: "磨杵成针",
    pinyin: "mó chǔ chéng zhēn",
    literalMeaning: "磨 (grind) 杵 (an iron rod) 成 (into) 针 (a needle) — grinding an iron rod into a sewing needle.",
    meaning: "With enough patience and persistence, even something that seems impossibly hard can be achieved.",
    dailyLifeScenario:
      "You've been trying to master a difficult piece on the recorder for weeks and want to quit — a parent might tell you the story of 磨杵成针 to encourage you that persistence pays off.",
    exampleSentence: {
      hanzi: "奶奶常说磨杵成针，只要不放弃，一定能把毛笔字写好。",
      pinyin: "Nǎinai cháng shuō móchǔ-chéngzhēn, zhǐyào bú fàngqì, yídìng néng bǎ máobǐzì xiě hǎo.",
      english: "Grandma often says even an iron rod can be ground into a needle — never give up.",
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes:
      "Origin: the Li Bai childhood legend (宋·祝穆《方舆胜览》). Standard 4-character dictionary form used (some storybooks use the 5-character 铁杵磨成针 — same meaning/story).",
  },
  {
    id: "ba-miao-zhu-zhang",
    hanzi: "拔苗助长",
    pinyin: "bá miáo zhù zhǎng",
    literalMeaning: "拔 (pull up) 苗 (a seedling) 助 (help) 长 (grow) — pulling up seedlings to 'help' them grow.",
    meaning:
      "Trying to rush or force progress instead of letting it happen naturally ends up doing more harm than good.",
    dailyLifeScenario:
      "You want to learn to ride a bicycle without training wheels right away, without practising the basics first, and keep falling. A parent might explain that rushing it is like 拔苗助长.",
    exampleSentence: {
      hanzi: "妈妈说学骑脚踏车不能拔苗助长，要慢慢练习。",
      pinyin: "Māma shuō xué qí jiǎotàchē bùnéng bámiáo-zhùzhǎng, yào mànmàn liànxí.",
      english: "Mum said learning to ride a bicycle can't be rushed — practise slowly, step by step.",
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes:
      "Origin: 孟子·公孙丑上. Editorial note (approved 2026-08-06): classical/textbook form is 揠苗助长 (揠 is rare); 拔苗助长 is the simplified, far more commonly recognised colloquial variant, used here for readability.",
  },

  // --- Honesty & Character ---
  {
    id: "yan-er-you-xin",
    hanzi: "言而有信",
    pinyin: "yán ér yǒu xìn",
    literalMeaning: "言 (words) 而 (and) 有 (have) 信 (trust) — your words come with trustworthiness.",
    meaning: "Keeping your promises; being someone whose word can be trusted.",
    dailyLifeScenario:
      "You promise your friend you'll bring your favourite storybook to school to lend them tomorrow — and you actually remember to bring it. That's being 言而有信.",
    exampleSentence: {
      hanzi: "他答应借我漫画书，第二天真的带来了，真是言而有信。",
      pinyin: "Tā dāying jiè wǒ mànhuàshū, dì-èr tiān zhēn de dài lái le, zhēnshi yán'éryǒuxìn.",
      english: "He promised to lend me his comic book, and really brought it the next day.",
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes:
      "Origin: 论语·学而 (Zixia's teaching on trustworthy speech). Chosen over 一诺千金 because its characters (言/信) are more direct for this age group.",
  },
  {
    id: "zhi-cuo-jiu-gai",
    hanzi: "知错就改",
    pinyin: "zhī cuò jiù gǎi",
    literalMeaning: "知 (know) 错 (mistake) 就 (then) 改 (correct) — knowing your mistake, and correcting it right away.",
    meaning: "Admitting when you've made a mistake and fixing it, instead of hiding it or making excuses.",
    dailyLifeScenario:
      "You accidentally knock over your sister's block tower while running around the house. Instead of blaming her or walking away, you say sorry and help rebuild it — that's 知错就改.",
    exampleSentence: {
      hanzi: "我不小心弄坏了妹妹的玩具，知错就改，主动向她道歉。",
      pinyin: "Wǒ bù xiǎoxīn nòng huài le mèimei de wánjù, zhīcuò-jiùgǎi, zhǔdòng xiàng tā dàoqiàn.",
      english: "I accidentally broke my sister's toy; I fixed things right away by apologising.",
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes:
      "Confirmed across multiple 成语词典; derives from 知错能改，善莫大焉 (左传·宣公二年), also listed at primary-school level by Hong Kong's Education Bureau.",
  },

  // --- Kindness & Community ---
  {
    id: "zhu-ren-wei-le",
    hanzi: "助人为乐",
    pinyin: "zhù rén wéi lè",
    literalMeaning: "助 (help) 人 (people) 为 (is) 乐 (joy) — helping people is a source of joy.",
    meaning: "Finding happiness in helping others, and doing so willingly.",
    dailyLifeScenario:
      "At recess, you see a classmate trip and drop all their books. Instead of walking past, you stop to help pick them up — that's living out 助人为乐.",
    exampleSentence: {
      hanzi: "小华助人为乐，看到同学摔倒了马上跑过去扶他。",
      pinyin: "Xiǎohuá zhùrén-wéilè, kàndào tóngxué shuāidǎo le mǎshàng pǎo guòqù fú tā.",
      english: "Xiaohua loves helping others — he ran to help his classmate up right away.",
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes: "Confirmed via zdic.net and Baidu Baike; appears in Malaysian KSSR-aligned idiom compilations for primary students.",
  },
  {
    id: "qi-xin-xie-li",
    hanzi: "齐心协力",
    pinyin: "qí xīn xié lì",
    literalMeaning: "齐 (together) 心 (hearts) 协 (join) 力 (strength) — hearts aligned, strength joined together.",
    meaning: "Working together as a team toward the same goal.",
    dailyLifeScenario:
      "Your class needs to build a model volcano for a science project. If everyone in the group pitches in instead of arguing over who does what, you're showing 齐心协力.",
    exampleSentence: {
      hanzi: "我们小组齐心协力，终于把手工作品做好了。",
      pinyin: "Wǒmen xiǎozǔ qíxīn-xiélì, zhōngyú bǎ shǒugōng zuòpǐn zuò hǎo le.",
      english: "Our group worked together with one heart, and finished our craft project.",
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes: "Confirmed via zdic.net and Baidu Baike (origin: 墨子·尚贤).",
  },
  {
    id: "xiang-qin-xiang-ai",
    hanzi: "相亲相爱",
    pinyin: "xiāng qīn xiāng ài",
    literalMeaning: "相 (mutually) 亲 (be close) 相 (mutually) 爱 (love) — being mutually close and loving toward one another.",
    meaning: "People who care deeply for each other and treat each other with love — especially family.",
    dailyLifeScenario:
      "On the weekend, your whole family cooks a meal together and shares stories at the dinner table, looking out for one another. That warm feeling is 相亲相爱.",
    exampleSentence: {
      hanzi: "我们一家人相亲相爱，不管遇到什么困难都会互相帮助。",
      pinyin: "Wǒmen yìjiā rén xiāngqīn-xiāng'ài, bùguǎn yùdào shénme kùnnán dōu huì hùxiāng bāngzhù.",
      english: "Our family loves and cares for each other, no matter what difficulty we face.",
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes:
      "Editorial note (approved 2026-08-06): formal dictionary usage notes it as traditionally 'between spouses,' but '相亲相爱一家人' is extremely common in modern usage for whole families (family-day slogans, a well-known children's song) — extended here to sibling/family love.",
  },

  // --- Wisdom & Learning ---
  {
    id: "wen-gu-zhi-xin",
    hanzi: "温故知新",
    pinyin: "wēn gù zhī xīn",
    literalMeaning: "温 (review) 故 (the old) 知 (understand) 新 (the new) — review the old, and thereby understand the new.",
    meaning: "Going back over what you've already learned helps you understand new things better.",
    dailyLifeScenario:
      "Before a spelling test, you flip back through last month's word lists to review them — this helps the new words make more sense too. That's 温故知新.",
    exampleSentence: {
      hanzi: "考试前温故知新，把学过的生字再看一遍。",
      pinyin: "Kǎoshì qián wēngù-zhīxīn, bǎ xuéguò de shēngzì zài kàn yí biàn.",
      english: "Before the test, review the old lessons — go over words you've learned again.",
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Origin: 论语·为政 (Confucius). Concrete, directly actionable study-habit idiom.",
  },
  {
    id: "shou-zhu-dai-tu",
    hanzi: "守株待兔",
    pinyin: "shǒu zhū dài tù",
    literalMeaning: "守 (guard) 株 (a tree stump) 待 (wait for) 兔 (a rabbit) — guarding a tree stump, waiting for a rabbit.",
    meaning: "Hoping good things will happen by luck alone, instead of working for them.",
    dailyLifeScenario:
      "You hope to do well in your spelling test just by 'getting lucky,' instead of studying the word list. A friend might remind you that you can't just 守株待兔.",
    exampleSentence: {
      hanzi: "光靠守株待兔是学不好华文的，你得每天认真复习。",
      pinyin: "Guāng kào shǒuzhū-dàitù shì xué bù hǎo Huáwén de, nǐ děi měitiān rènzhēn fùxí.",
      english: "You can't learn Chinese well by waiting for luck — review carefully every day.",
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Origin: 韩非子·五蠹. Reportedly used in Singapore's 《欢乐伙伴》 textbook material.",
  },
  {
    id: "jing-di-zhi-wa",
    hanzi: "井底之蛙",
    pinyin: "jǐng dǐ zhī wā",
    literalMeaning: "井 (a well) 底 (the bottom) 之 (of) 蛙 (a frog) — a frog at the bottom of a well.",
    meaning: "Someone who thinks their small world is all there is, not realising how much bigger the world really is.",
    dailyLifeScenario:
      "You think you're the best drawer in your class — until you visit an art exhibition and see how many amazing styles of drawing exist. Realising there's always more to learn is the opposite of being a 井底之蛙.",
    exampleSentence: {
      hanzi: "参观美术馆后，他才发现自己以前就像井底之蛙，其实还有很多东西可以学习。",
      pinyin: "Cānguān měishùguǎn hòu, tā cái fāxiàn zìjǐ yǐqián jiù xiàng jǐngdǐzhīwā, qíshí hái yǒu hěn duō dōngxi kěyǐ xuéxí.",
      english: "After the art museum, he realised he'd been like a frog in a well — so much more to learn.",
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Origin: 庄子·秋水. Lesson is slightly more abstract than other entries — included for thematic diversity.",
  },
  {
    id: "yi-ju-liang-de",
    hanzi: "一举两得",
    pinyin: "yī jǔ liǎng dé",
    literalMeaning: "一 (one) 举 (action, cf. 举手 'raise hand') 两 (two) 得 (gains) — one action, two gains.",
    meaning: "Doing one thing that gives you two benefits at once.",
    dailyLifeScenario:
      "You walk to school with your dad instead of taking the car — you get to school and also get exercise and chat with him along the way. That's 一举两得.",
    exampleSentence: {
      hanzi: "走路去上学既能运动又能省钱，真是一举两得。",
      pinyin: "Zǒulù qù shàngxué jì néng yùndòng yòu néng shěngqián, zhēnshi yìjǔ-liǎngdé.",
      english: "Walking to school lets you exercise and save money — two gains from one action.",
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes:
      "Origin: 战国策·秦策二. Classified at a fairly advanced level for L2 adult learners, but character difficulty is low for native-speaking children (一/两 taught early; 举 familiar from 举手 in class).",
  },
];

export const idiomsById: Record<string, IdiomContent> = Object.fromEntries(
  idioms.map((idiom) => [idiom.id, idiom]),
);
