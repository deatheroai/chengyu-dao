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
    meaningZh: {
      hanzi: "做事的时候只专心做这一件事，不去想别的事情。",
      pinyin: "Zuò shì de shíhou zhǐ zhuānxīn zuò zhè yí jiàn shì, bú qù xiǎng bié de shìqing.",
      charPinyin: ["zuò", "shì", "de", "shí", "hou", "zhǐ", "zhuān", "xīn", "zuò", "zhè", "yí", "jiàn", "shì", "", "bú", "qù", "xiǎng", "bié", "de", "shì", "qing", ""],
    },
    dailyLifeScenario:
      "You're doing your spelling homework at the kitchen table, but the TV is on and your toys are nearby. If you put everything else aside and give your homework your full attention until it's done, you are being 一心一意.",
    exampleSentence: {
      hanzi: "小明做作业的时候一心一意，不看电视也不玩玩具。",
      pinyin: "Xiǎomíng zuò zuòyè de shíhou yīxīn-yíyì, bú kàn diànshì yě bù wán wánjù.",
      english: "When Xiaoming does his homework, he focuses wholeheartedly — no TV, no toys.",
      charPinyin: ["xiǎo", "míng", "zuò", "zuò", "yè", "de", "shí", "hou", "yī", "xīn", "yí", "yì", "", "bú", "kàn", "diàn", "shì", "yě", "bù", "wán", "wán", "jù", ""],
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
    meaningZh: {
      hanzi: "开始做一件事以后，一定要好好地做到完成，不能半路停下来。",
      pinyin: "Kāishǐ zuò yí jiàn shì yǐhòu, yídìng yào hǎohāo de zuò dào wánchéng, bù néng bànlù tíng xiàlái.",
      charPinyin: ["kāi", "shǐ", "zuò", "yí", "jiàn", "shì", "yǐ", "hòu", "", "yí", "dìng", "yào", "hǎo", "hāo", "de", "zuò", "dào", "wán", "chéng", "", "bù", "néng", "bàn", "lù", "tíng", "xià", "lái", ""],
    },
    dailyLifeScenario:
      "You signed up for a school swimming course. After two lessons it feels hard and you want to quit — but you decide to keep going until you finish the whole course. That's 有始有终.",
    exampleSentence: {
      hanzi: "学游泳要有始有终，不能学到一半就放弃。",
      pinyin: "Xué yóuyǒng yào yǒushǐ-yǒuzhōng, bùnéng xué dào yíbàn jiù fàngqì.",
      english: "When learning to swim, see it through from start to finish — don't give up halfway.",
      charPinyin: ["xué", "yóu", "yǒng", "yào", "yǒu", "shǐ", "yǒu", "zhōng", "", "bù", "néng", "xué", "dào", "yí", "bàn", "jiù", "fàng", "qì", ""],
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
    meaningZh: {
      hanzi: "事情才做到一半，就没有耐心，不想再做下去了。",
      pinyin: "Shìqing cái zuò dào yíbàn, jiù méiyǒu nàixīn, bù xiǎng zài zuò xiàqù le.",
      charPinyin: ["shì", "qing", "cái", "zuò", "dào", "yí", "bàn", "", "jiù", "méi", "yǒu", "nài", "xīn", "", "bù", "xiǎng", "zài", "zuò", "xià", "qù", "le", ""],
    },
    dailyLifeScenario:
      "You and a friend start building a big LEGO set together, but halfway through your friend wants to stop and play something else instead of finishing it. You can gently remind them not to 半途而废.",
    exampleSentence: {
      hanzi: "我们说好一起完成拼图，不能半途而废。",
      pinyin: "Wǒmen shuōhǎo yìqǐ wánchéng pīntú, bùnéng bàntú'érfèi.",
      english: "We agreed to finish the jigsaw puzzle together, so we can't give up halfway.",
      charPinyin: ["wǒ", "men", "shuō", "hǎo", "yì", "qǐ", "wán", "chéng", "pīn", "tú", "", "bù", "néng", "bàn", "tú", "ér", "fèi", ""],
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
    meaningZh: {
      hanzi: "一件事情做的次数多了，自然就会做得又快又好。",
      pinyin: "Yí jiàn shìqing zuò de cìshù duō le, zìrán jiù huì zuò de yòu kuài yòu hǎo.",
      charPinyin: ["yí", "jiàn", "shì", "qing", "zuò", "de", "cì", "shù", "duō", "le", "", "zì", "rán", "jiù", "huì", "zuò", "de", "yòu", "kuài", "yòu", "hǎo", ""],
    },
    dailyLifeScenario:
      "You keep dropping the ball the first few times you try basketball, but after practising every week, shooting hoops becomes easy. That's 熟能生巧.",
    exampleSentence: {
      hanzi: "弹钢琴要多多练习，熟能生巧。",
      pinyin: "Tán gāngqín yào duōduō liànxí, shúnéngshēngqiǎo.",
      english: "To play the piano well, you need lots of practice — practice makes perfect.",
      charPinyin: ["tán", "gāng", "qín", "yào", "duō", "duō", "liàn", "xí", "", "shú", "néng", "shēng", "qiǎo", ""],
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
    meaningZh: {
      hanzi: "只要有耐心，肯不断努力，再困难的事情也能够做成。",
      pinyin: "Zhǐyào yǒu nàixīn, kěn búduàn nǔlì, zài kùnnán de shìqing yě nénggòu zuò chéng.",
      charPinyin: ["zhǐ", "yào", "yǒu", "nài", "xīn", "", "kěn", "bú", "duàn", "nǔ", "lì", "", "zài", "kùn", "nán", "de", "shì", "qing", "yě", "néng", "gòu", "zuò", "chéng", ""],
    },
    dailyLifeScenario:
      "You've been trying to master a difficult piece on the recorder for weeks and want to quit — a parent might tell you the story of 磨杵成针 to encourage you that persistence pays off.",
    exampleSentence: {
      hanzi: "他每天坚持练习吹竖笛，几个月后终于吹得又快又好，这就是磨杵成针。",
      pinyin: "Tā měitiān jiānchí liànxí chuī shùdí, jǐ ge yuè hòu zhōngyú chuī de yòu kuài yòu hǎo, zhè jiùshì móchǔ-chéngzhēn.",
      english: "He practises the recorder every day, and months later he can finally play it well — patience made the impossible possible.",
      charPinyin: ["tā", "měi", "tiān", "jiān", "chí", "liàn", "xí", "chuī", "shù", "dí", "", "jǐ", "ge", "yuè", "hòu", "zhōng", "yú", "chuī", "de", "yòu", "kuài", "yòu", "hǎo", "", "zhè", "jiù", "shì", "mó", "chǔ", "chéng", "zhēn", ""],
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
    meaningZh: {
      hanzi: "为了让事情快点完成而着急乱来，结果反而把事情弄得更糟。",
      pinyin: "Wèile ràng shìqing kuài diǎn wánchéng ér zháojí luàn lái, jiéguǒ fǎn'ér bǎ shìqing nòng de gèng zāo.",
      charPinyin: ["wèi", "le", "ràng", "shì", "qing", "kuài", "diǎn", "wán", "chéng", "ér", "zháo", "jí", "luàn", "lái", "", "jié", "guǒ", "fǎn", "ér", "bǎ", "shì", "qing", "nòng", "de", "gèng", "zāo", ""],
    },
    dailyLifeScenario:
      "You want to learn to ride a bicycle without training wheels right away, without practising the basics first, and keep falling. A parent might explain that rushing it is like 拔苗助长.",
    exampleSentence: {
      hanzi: "哥哥急着拆辅助轮学骑车，结果摔了好几次，真是拔苗助长。",
      pinyin: "Gēge jízhe chāi fǔzhùlún xué qíchē, jiéguǒ shuāi le hǎo jǐ cì, zhēnshi bámiáo-zhùzhǎng.",
      english: "My brother rushed to take off his training wheels before he was ready, and kept falling — that's forcing growth before it's ready.",
      charPinyin: ["gē", "ge", "jí", "zhe", "chāi", "fǔ", "zhù", "lún", "xué", "qí", "chē", "", "jié", "guǒ", "shuāi", "le", "hǎo", "jǐ", "cì", "", "zhēn", "shi", "bá", "miáo", "zhù", "zhǎng", ""],
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes:
      "Origin: 孟子·公孙丑上. Editorial note (approved 2026-08-06): classical/textbook form is 揠苗助长 (揠 is rare); 拔苗助长 is the simplified, far more commonly recognised colloquial variant, used here for readability.",
  },
  {
    id: "chi-zhi-yi-heng",
    hanzi: "持之以恒",
    pinyin: "chí zhī yǐ héng",
    literalMeaning: "持 (hold) 之 (it) 以 (with) 恒 (constancy) — holding onto something with constancy over time.",
    meaning: "To keep doing something steadily over a long time, without giving up.",
    meaningZh: {
      hanzi: "做事情要长期坚持，不能只有三分钟热度。",
      pinyin: "Zuò shìqing yào chángqī jiānchí, bù néng zhǐ yǒu sān fēnzhōng rèdù.",
      charPinyin: ["zuò", "shì", "qing", "yào", "cháng", "qī", "jiān", "chí", "", "bù", "néng", "zhǐ", "yǒu", "sān", "fēn", "zhōng", "rè", "dù", ""],
    },
    dailyLifeScenario:
      "You want to get better at jump rope, so you practise a little every single day after school for weeks, even on days you don't feel like it. That steady, ongoing effort is 持之以恒.",
    exampleSentence: {
      hanzi: "他每天坚持跳绳，持之以恒，体力越来越好。",
      pinyin: "Tā měitiān jiānchí tiàoshéng, chízhī-yǐhéng, tǐlì yuè lái yuè hǎo.",
      english: "He practises skipping rope every single day, keeping at it steadily — and his stamina keeps improving.",
      charPinyin: ["tā", "měi", "tiān", "jiān", "chí", "tiào", "shéng", "", "chí", "zhī", "yǐ", "héng", "", "tǐ", "lì", "yuè", "lái", "yuè", "hǎo", ""],
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning/origin (清·曾国藩《家训谕纪泽》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "quan-shen-guan-zhu",
    hanzi: "全神贯注",
    pinyin: "quán shén guàn zhù",
    literalMeaning: "全 (entire) 神 (spirit/attention) 贯 (pour through) 注 (focus) — pouring your entire attention into one place.",
    meaning: "To concentrate so completely on something that nothing else can distract you.",
    meaningZh: {
      hanzi: "把全部的注意力都集中在一件事情上，什么都不会打扰到自己。",
      pinyin: "Bǎ quánbù de zhùyìlì dōu jízhōng zài yí jiàn shìqing shàng, shénme dōu bú huì dǎrǎo dào zìjǐ.",
      charPinyin: ["bǎ", "quán", "bù", "de", "zhù", "yì", "lì", "dōu", "jí", "zhōng", "zài", "yí", "jiàn", "shì", "qing", "shàng", "", "shén", "me", "dōu", "bú", "huì", "dǎ", "rǎo", "dào", "zì", "jǐ", ""],
    },
    dailyLifeScenario:
      "You're building a tall block tower and you're so focused on balancing each piece that you don't even hear your name being called from the next room. That total concentration is 全神贯注.",
    exampleSentence: {
      hanzi: "他全神贯注地搭积木，都没听到妈妈叫他。",
      pinyin: "Tā quánshén-guànzhù de dā jīmù, dōu méi tīngdào māma jiào tā.",
      english: "He was so focused on building his blocks that he didn't even hear his mum calling him.",
      charPinyin: ["tā", "quán", "shén", "guàn", "zhù", "de", "dā", "jī", "mù", "", "dōu", "méi", "tīng", "dào", "mā", "ma", "jiào", "tā", ""],
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning confirmed via zdic.net and Baidu Baike (2026-09-09 search); cited usage examples include Qian Zhongshu's 《围城》.",
  },
  {
    id: "yi-si-bu-gou",
    hanzi: "一丝不苟",
    pinyin: "yī sī bù gǒu",
    literalMeaning: "一 (a single) 丝 (thread) 不 (not) 苟 (careless) — not careless about even a single thread's width.",
    meaning: "Being extremely careful and serious about every small detail, never sloppy.",
    meaningZh: {
      hanzi: "做事情非常认真仔细，连最小的地方也不马虎。",
      pinyin: "Zuò shìqing fēicháng rènzhēn zǐxì, lián zuì xiǎo de dìfang yě bù mǎhu.",
      charPinyin: ["zuò", "shì", "qing", "fēi", "cháng", "rèn", "zhēn", "zǐ", "xì", "", "lián", "zuì", "xiǎo", "de", "dì", "fang", "yě", "bù", "mǎ", "hu", ""],
    },
    dailyLifeScenario:
      "When you copy your spelling words, you check every single stroke of every character carefully, instead of rushing and leaving some out. That careful attention to every detail is 一丝不苟.",
    exampleSentence: {
      hanzi: "他抄写生字时一丝不苟，写错一笔都会擦掉重写。",
      pinyin: "Tā chāoxiě shēngzì shí yìsī-bùgǒu, xiěcuò yì bǐ dōu huì cā diào chóng xiě.",
      english: "When copying his spelling words, he's meticulous — if he gets even one stroke wrong, he erases it and rewrites it.",
      charPinyin: ["tā", "chāo", "xiě", "shēng", "zì", "shí", "yì", "sī", "bù", "gǒu", "", "xiě", "cuò", "yì", "bǐ", "dōu", "huì", "cā", "diào", "chóng", "xiě", ""],
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning confirmed via zdic.net and Baidu Baike (2026-09-09 search); origin traced to 清·吴敬梓《儒林外史》.",
  },
  {
    id: "jing-yi-qiu-jing",
    hanzi: "精益求精",
    pinyin: "jīng yì qiú jīng",
    literalMeaning: "精 (excellent) 益 (even more) 求 (seek) 精 (excellence) — already excellent, yet still seeking to be even better.",
    meaning: "Not settling for \"good enough\" — always trying to make something you're already good at even better.",
    meaningZh: {
      hanzi: "已经做得很好了，还要求自己做得更好。",
      pinyin: "Yǐjīng zuò de hěn hǎo le, hái yāoqiú zìjǐ zuò de gèng hǎo.",
      charPinyin: ["yǐ", "jīng", "zuò", "de", "hěn", "hǎo", "le", "", "hái", "yāo", "qiú", "zì", "jǐ", "zuò", "de", "gèng", "hǎo", ""],
    },
    dailyLifeScenario:
      "Your drawing of a dragon already won a merit sticker, but you keep practising to make the wings and scales look even better next time, instead of stopping there. That drive to improve on something already good is 精益求精.",
    exampleSentence: {
      hanzi: "他的画已经很好了，但他还精益求精，不断练习。",
      pinyin: "Tā de huà yǐjīng hěn hǎo le, dàn tā hái jīngyì-qiújīng, búduàn liànxí.",
      english: "His drawing was already very good, but he kept striving to make it even better, practising nonstop.",
      charPinyin: ["tā", "de", "huà", "yǐ", "jīng", "hěn", "hǎo", "le", "", "dàn", "tā", "hái", "jīng", "yì", "qiú", "jīng", "", "bú", "duàn", "liàn", "xí", ""],
    },
    ageBand: "lower-primary",
    theme: "focus",
    sourceNotes: "Meaning/origin (论语·学而, by way of 朱熹's commentary) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },

  // --- Honesty & Character ---
  {
    id: "yan-er-you-xin",
    hanzi: "言而有信",
    pinyin: "yán ér yǒu xìn",
    literalMeaning: "言 (words) 而 (and) 有 (have) 信 (trust) — your words come with trustworthiness.",
    meaning: "Keeping your promises; being someone whose word can be trusted.",
    meaningZh: {
      hanzi: "答应别人的事情，一定会做到，是个说话算话的人。",
      pinyin: "Dāying biérén de shìqing, yídìng huì zuò dào, shì ge shuōhuà suànhuà de rén.",
      charPinyin: ["dā", "ying", "bié", "rén", "de", "shì", "qing", "", "yí", "dìng", "huì", "zuò", "dào", "", "shì", "ge", "shuō", "huà", "suàn", "huà", "de", "rén", ""],
    },
    dailyLifeScenario:
      "You promise your friend you'll bring your favourite storybook to school to lend them tomorrow — and you actually remember to bring it. That's being 言而有信.",
    exampleSentence: {
      hanzi: "他答应借我漫画书，第二天真的带来了，真是言而有信。",
      pinyin: "Tā dāying jiè wǒ mànhuàshū, dì-èr tiān zhēn de dài lái le, zhēnshi yán'éryǒuxìn.",
      english: "He promised to lend me his comic book, and really brought it the next day.",
      charPinyin: ["tā", "dā", "ying", "jiè", "wǒ", "màn", "huà", "shū", "", "dì", "èr", "tiān", "zhēn", "de", "dài", "lái", "le", "", "zhēn", "shi", "yán", "ér", "yǒu", "xìn", ""],
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
    meaningZh: {
      hanzi: "发现自己做错了事，马上承认并且改正，不找借口。",
      pinyin: "Fāxiàn zìjǐ zuò cuò le shì, mǎshàng chéngrèn bìngqiě gǎizhèng, bù zhǎo jièkǒu.",
      charPinyin: ["fā", "xiàn", "zì", "jǐ", "zuò", "cuò", "le", "shì", "", "mǎ", "shàng", "chéng", "rèn", "bìng", "qiě", "gǎi", "zhèng", "", "bù", "zhǎo", "jiè", "kǒu", ""],
    },
    dailyLifeScenario:
      "You accidentally knock over your sister's block tower while running around the house. Instead of blaming her or walking away, you say sorry and help rebuild it — that's 知错就改.",
    exampleSentence: {
      hanzi: "我不小心弄坏了妹妹的玩具，知错就改，主动向她道歉。",
      pinyin: "Wǒ bù xiǎoxīn nòng huài le mèimei de wánjù, zhīcuò-jiùgǎi, zhǔdòng xiàng tā dàoqiàn.",
      english: "I accidentally broke my sister's toy; I fixed things right away by apologising.",
      charPinyin: ["wǒ", "bù", "xiǎo", "xīn", "nòng", "huài", "le", "mèi", "mei", "de", "wán", "jù", "", "zhī", "cuò", "jiù", "gǎi", "", "zhǔ", "dòng", "xiàng", "tā", "dào", "qiàn", ""],
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes:
      "Confirmed across multiple 成语词典; derives from 知错能改，善莫大焉 (左传·宣公二年), also listed at primary-school level by Hong Kong's Education Bureau.",
  },
  {
    id: "shi-shi-qiu-shi",
    hanzi: "实事求是",
    pinyin: "shí shì qiú shì",
    literalMeaning: "实 (real) 事 (facts) 求 (seek) 是 (the truth) — seeking the truth from real facts.",
    meaning: "Looking at what's actually true and going by the real facts, instead of guessing or making things up.",
    meaningZh: {
      hanzi: "根据真实的情况说话做事，不夸大也不隐瞒。",
      pinyin: "Gēnjù zhēnshí de qíngkuàng shuōhuà zuòshì, bù kuādà yě bù yǐnmán.",
      charPinyin: ["gēn", "jù", "zhēn", "shí", "de", "qíng", "kuàng", "shuō", "huà", "zuò", "shì", "", "bù", "kuā", "dà", "yě", "bù", "yǐn", "mán", ""],
    },
    dailyLifeScenario:
      "You accidentally spill juice on the carpet. When your mum asks what happened, you tell her exactly what you did instead of blaming the cat or making up a story. That's being 实事求是.",
    exampleSentence: {
      hanzi: "打翻牛奶后，他实事求是地告诉妈妈是自己不小心弄的。",
      pinyin: "Dǎfān niúnǎi hòu, tā shíshì-qiúshì de gàosu māma shì zìjǐ bù xiǎoxīn nòng de.",
      english: "After spilling the milk, he told his mum honestly, according to the facts, that it was his own accident.",
      charPinyin: ["dǎ", "fān", "niú", "nǎi", "hòu", "", "tā", "shí", "shì", "qiú", "shì", "de", "gào", "su", "mā", "ma", "shì", "zì", "jǐ", "bù", "xiǎo", "xīn", "nòng", "de", ""],
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes: "Meaning/origin (《汉书·河间献王刘德传》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "guang-ming-zheng-da",
    hanzi: "光明正大",
    pinyin: "guāng míng zhèng dà",
    literalMeaning: "光 (light) 明 (bright) 正 (upright) 大 (great) — bright and upright, open and fair.",
    meaning: "Being open, honest, and fair in what you do — nothing sneaky or hidden.",
    meaningZh: {
      hanzi: "做事情坦白公正，没有偷偷摸摸的坏心思。",
      pinyin: "Zuò shìqing tǎnbái gōngzhèng, méiyǒu tōutōumōmō de huài xīnsi.",
      charPinyin: ["zuò", "shì", "qing", "tǎn", "bái", "gōng", "zhèng", "", "méi", "yǒu", "tōu", "tōu", "mō", "mō", "de", "huài", "xīn", "si", ""],
    },
    dailyLifeScenario:
      "During a board game, you could peek at the cards when no one's looking, but instead you play fair and follow all the rules openly. That's being 光明正大.",
    exampleSentence: {
      hanzi: "玩游戏的时候，他光明正大，从来不偷看别人的牌。",
      pinyin: "Wán yóuxì de shíhou, tā guāngmíng-zhèngdà, cónglái bù tōukàn biérén de pái.",
      english: "When playing games, he's always open and fair — he never sneaks a look at other people's cards.",
      charPinyin: ["wán", "yóu", "xì", "de", "shí", "hou", "", "tā", "guāng", "míng", "zhèng", "dà", "", "cóng", "lái", "bù", "tōu", "kàn", "bié", "rén", "de", "pái", ""],
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes: "Meaning/origin (宋·朱熹《朱子语类》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "biao-li-ru-yi",
    hanzi: "表里如一",
    pinyin: "biǎo lǐ rú yī",
    literalMeaning: "表 (the outside) 里 (the inside) 如 (is like) 一 (one) — the outside matches the inside, as if they were one.",
    meaning: "Being the same genuine person on the inside as you show on the outside — not pretending to be someone you're not.",
    meaningZh: {
      hanzi: "心里想的和表现出来的完全一样，不假装。",
      pinyin: "Xīnli xiǎng de hé biǎoxiàn chūlái de wánquán yíyàng, bù jiǎzhuāng.",
      charPinyin: ["xīn", "li", "xiǎng", "de", "hé", "biǎo", "xiàn", "chū", "lái", "de", "wán", "quán", "yí", "yàng", "", "bù", "jiǎ", "zhuāng", ""],
    },
    dailyLifeScenario:
      "You tell your friends you love reading, and at home, when no one's watching, you really do curl up with a book too — not just pretending to like it in front of others. That's being 表里如一.",
    exampleSentence: {
      hanzi: "他表里如一，在家和在学校对人一样友善。",
      pinyin: "Tā biǎolǐ-rúyī, zài jiā hé zài xuéxiào duì rén yíyàng yǒushàn.",
      english: "He's the same person inside and out — just as kind to people at home as he is at school.",
      charPinyin: ["tā", "biǎo", "lǐ", "rú", "yī", "", "zài", "jiā", "hé", "zài", "xué", "xiào", "duì", "rén", "yí", "yàng", "yǒu", "shàn", ""],
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes: "Meaning/origin (《朱子全书·论语》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "cheng-xin-cheng-yi",
    hanzi: "诚心诚意",
    pinyin: "chéng xīn chéng yì",
    literalMeaning: "诚 (sincere) 心 (heart) 诚 (sincere) 意 (intention) — a heart and intention that are truly sincere.",
    meaning: "Doing or saying something with complete sincerity, really meaning it, not just for show.",
    meaningZh: {
      hanzi: "真心实意地对人对事，不是随便做做样子。",
      pinyin: "Zhēnxīn-shíyì de duì rén duì shì, bú shì suíbiàn zuòzuo yàngzi.",
      charPinyin: ["zhēn", "xīn", "shí", "yì", "de", "duì", "rén", "duì", "shì", "", "bú", "shì", "suí", "biàn", "zuò", "zuo", "yàng", "zi", ""],
    },
    dailyLifeScenario:
      "You write a birthday card for your grandma, thinking carefully about what to say because you really mean every word — not just scribbling something quickly to get it over with. That's 诚心诚意.",
    exampleSentence: {
      hanzi: "他诚心诚意地向奶奶道歉，奶奶原谅了他。",
      pinyin: "Tā chéngxīn-chéngyì de xiàng nǎinai dàoqiàn, nǎinai yuánliàng le tā.",
      english: "He apologised to Grandma with complete sincerity, and Grandma forgave him.",
      charPinyin: ["tā", "chéng", "xīn", "chéng", "yì", "de", "xiàng", "nǎi", "nai", "dào", "qiàn", "", "nǎi", "nai", "yuán", "liàng", "le", "tā", ""],
    },
    ageBand: "lower-primary",
    theme: "honesty",
    sourceNotes: "Meaning confirmed via zdic.net (origin traced to 《后汉书·马援传》); Baidu Baike cross-check 2026-09-09.",
  },

  // --- Kindness & Community ---
  {
    id: "zhu-ren-wei-le",
    hanzi: "助人为乐",
    pinyin: "zhù rén wéi lè",
    literalMeaning: "助 (help) 人 (people) 为 (is) 乐 (joy) — helping people is a source of joy.",
    meaning: "Finding happiness in helping others, and doing so willingly.",
    meaningZh: {
      hanzi: "看到别人需要帮忙的时候，很乐意伸出手去帮助他。",
      pinyin: "Kàndào biérén xūyào bāngmáng de shíhou, hěn lèyì shēnchū shǒu qù bāngzhù tā.",
      charPinyin: ["kàn", "dào", "bié", "rén", "xū", "yào", "bāng", "máng", "de", "shí", "hou", "", "hěn", "lè", "yì", "shēn", "chū", "shǒu", "qù", "bāng", "zhù", "tā", ""],
    },
    dailyLifeScenario:
      "At recess, you see a classmate trip and drop all their books. Instead of walking past, you stop to help pick them up — that's living out 助人为乐.",
    exampleSentence: {
      hanzi: "小华助人为乐，看到同学摔倒了马上跑过去扶他，心里觉得很开心。",
      pinyin: "Xiǎohuá zhùrén-wéilè, kàndào tóngxué shuāidǎo le mǎshàng pǎo guòqù fú tā, xīnli juéde hěn kāixīn.",
      english: "Xiaohua loves helping others — he ran to help a classmate up right away, and it made him happy.",
      charPinyin: ["xiǎo", "huá", "zhù", "rén", "wéi", "lè", "", "kàn", "dào", "tóng", "xué", "shuāi", "dǎo", "le", "mǎ", "shàng", "pǎo", "guò", "qù", "fú", "tā", "", "xīn", "li", "jué", "de", "hěn", "kāi", "xīn", ""],
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
    meaningZh: {
      hanzi: "大家一起合作，共同努力，去完成同一个目标。",
      pinyin: "Dàjiā yìqǐ hézuò, gòngtóng nǔlì, qù wánchéng tóng yí ge mùbiāo.",
      charPinyin: ["dà", "jiā", "yì", "qǐ", "hé", "zuò", "", "gòng", "tóng", "nǔ", "lì", "", "qù", "wán", "chéng", "tóng", "yí", "ge", "mù", "biāo", ""],
    },
    dailyLifeScenario:
      "Your class needs to build a model volcano for a science project. If everyone in the group pitches in instead of arguing over who does what, you're showing 齐心协力.",
    exampleSentence: {
      hanzi: "我们小组齐心协力，终于把手工作品做好了。",
      pinyin: "Wǒmen xiǎozǔ qíxīn-xiélì, zhōngyú bǎ shǒugōng zuòpǐn zuò hǎo le.",
      english: "Our group worked together with one heart, and finished our craft project.",
      charPinyin: ["wǒ", "men", "xiǎo", "zǔ", "qí", "xīn", "xié", "lì", "", "zhōng", "yú", "bǎ", "shǒu", "gōng", "zuò", "pǐn", "zuò", "hǎo", "le", ""],
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
    meaningZh: {
      hanzi: "家人之间互相关心，互相疼爱，感情非常好。",
      pinyin: "Jiārén zhījiān hùxiāng guānxīn, hùxiāng téng'ài, gǎnqíng fēicháng hǎo.",
      charPinyin: ["jiā", "rén", "zhī", "jiān", "hù", "xiāng", "guān", "xīn", "", "hù", "xiāng", "téng", "ài", "", "gǎn", "qíng", "fēi", "cháng", "hǎo", ""],
    },
    dailyLifeScenario:
      "On the weekend, your whole family cooks a meal together and shares stories at the dinner table, looking out for one another. That warm feeling is 相亲相爱.",
    exampleSentence: {
      hanzi: "我们一家人相亲相爱，不管遇到什么困难都会互相帮助。",
      pinyin: "Wǒmen yìjiā rén xiāngqīn-xiāng'ài, bùguǎn yùdào shénme kùnnán dōu huì hùxiāng bāngzhù.",
      english: "Our family loves and cares for each other, no matter what difficulty we face.",
      charPinyin: ["wǒ", "men", "yì", "jiā", "rén", "xiāng", "qīn", "xiāng", "ài", "", "bù", "guǎn", "yù", "dào", "shén", "me", "kùn", "nán", "dōu", "huì", "hù", "xiāng", "bāng", "zhù", ""],
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes:
      "Editorial note (approved 2026-08-06): formal dictionary usage notes it as traditionally 'between spouses,' but '相亲相爱一家人' is extremely common in modern usage for whole families (family-day slogans, a well-known children's song) — extended here to sibling/family love.",
  },
  {
    id: "jian-yi-yong-wei",
    hanzi: "见义勇为",
    pinyin: "jiàn yì yǒng wéi",
    literalMeaning: "见 (see) 义 (what's right) 勇 (bravely) 为 (do) — seeing what's right, and bravely doing it.",
    meaning: "Bravely stepping in to do the right thing when you see someone in trouble or something unfair happening.",
    meaningZh: {
      hanzi: "看到不公平或者危险的事情，勇敢地站出来帮忙。",
      pinyin: "Kàndào bù gōngpíng huòzhě wēixiǎn de shìqing, yǒnggǎn de zhàn chūlái bāngmáng.",
      charPinyin: ["kàn", "dào", "bù", "gōng", "píng", "huò", "zhě", "wēi", "xiǎn", "de", "shì", "qing", "", "yǒng", "gǎn", "de", "zhàn", "chū", "lái", "bāng", "máng", ""],
    },
    dailyLifeScenario:
      "You see a younger kid at the playground being teased by an older group. Even though it's a bit scary, you speak up and tell them to stop. That brave stand for what's right is 见义勇为.",
    exampleSentence: {
      hanzi: "看到同学被欺负，他见义勇为，勇敢地站出来帮忙。",
      pinyin: "Kàndào tóngxué bèi qīfù, tā jiànyì-yǒngwéi, yǒnggǎn de zhàn chūlái bāngmáng.",
      english: "When he saw a classmate being bullied, he bravely stepped up to do the right thing and help.",
      charPinyin: ["kàn", "dào", "tóng", "xué", "bèi", "qī", "fù", "", "tā", "jiàn", "yì", "yǒng", "wéi", "", "yǒng", "gǎn", "de", "zhàn", "chū", "lái", "bāng", "máng", ""],
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes: "Meaning/origin (《论语·为政》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "xue-zhong-song-tan",
    hanzi: "雪中送炭",
    pinyin: "xuě zhōng sòng tàn",
    literalMeaning: "雪 (snow) 中 (amid) 送 (deliver) 炭 (charcoal) — delivering charcoal to someone in the middle of a snowstorm.",
    meaning: "Helping someone exactly when they need it most, in a hard or difficult moment.",
    meaningZh: {
      hanzi: "在别人最困难的时候，及时伸出援手帮助他。",
      pinyin: "Zài biérén zuì kùnnán de shíhou, jíshí shēnchū yuánshǒu bāngzhù tā.",
      charPinyin: ["zài", "bié", "rén", "zuì", "kùn", "nán", "de", "shí", "hou", "", "jí", "shí", "shēn", "chū", "yuán", "shǒu", "bāng", "zhù", "tā", ""],
    },
    dailyLifeScenario:
      "Your classmate forgot their umbrella on a rainy day and has no way to get home. You share yours with them right when they need it most, instead of just walking off. That's 雪中送炭.",
    exampleSentence: {
      hanzi: "同学忘记带伞，下雨天他雪中送炭，把伞借给同学。",
      pinyin: "Tóngxué wàngjì dài sǎn, xiàyǔ tiān tā xuězhōng-sòngtàn, bǎ sǎn jiè gěi tóngxué.",
      english: "A classmate forgot his umbrella on a rainy day, so he helped exactly when it was needed and lent him his own.",
      charPinyin: ["tóng", "xué", "wàng", "jì", "dài", "sǎn", "", "xià", "yǔ", "tiān", "tā", "xuě", "zhōng", "sòng", "tàn", "", "bǎ", "sǎn", "jiè", "gěi", "tóng", "xué", ""],
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes: "Meaning/origin (宋·范成大《大雪送炭与芥隐》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "tong-gan-gong-ku",
    hanzi: "同甘共苦",
    pinyin: "tóng gān gòng kǔ",
    literalMeaning: "同 (together) 甘 (sweetness) 共 (share) 苦 (bitterness) — sharing both the sweet times and the bitter times together.",
    meaning: "Staying together and supporting each other through both the good times and the hard times.",
    meaningZh: {
      hanzi: "不管遇到开心的事还是困难的事，都一起面对，互相扶持。",
      pinyin: "Bùguǎn yùdào kāixīn de shì háishi kùnnán de shì, dōu yìqǐ miànduì, hùxiāng fúchí.",
      charPinyin: ["bù", "guǎn", "yù", "dào", "kāi", "xīn", "de", "shì", "hái", "shi", "kùn", "nán", "de", "shì", "", "dōu", "yì", "qǐ", "miàn", "duì", "", "hù", "xiāng", "fú", "chí", ""],
    },
    dailyLifeScenario:
      "Your football team loses badly in the first half but you all cheer each other up and give it your all together in the second half — win or lose, you stick together. That's 同甘共苦.",
    exampleSentence: {
      hanzi: "队友之间同甘共苦，输球时也互相鼓励。",
      pinyin: "Duìyǒu zhījiān tónggān-gòngkǔ, shūqiú shí yě hùxiāng gǔlì.",
      english: "Teammates share both good times and hard times — even after losing a match, they still cheer each other on.",
      charPinyin: ["duì", "yǒu", "zhī", "jiān", "tóng", "gān", "gòng", "kǔ", "", "shū", "qiú", "shí", "yě", "hù", "xiāng", "gǔ", "lì", ""],
    },
    ageBand: "lower-primary",
    theme: "kindness",
    sourceNotes: "Meaning/origin (《战国策·燕策一》, the Yan Zhaowang story) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },

  // --- Wisdom & Learning ---
  {
    id: "wen-gu-zhi-xin",
    hanzi: "温故知新",
    pinyin: "wēn gù zhī xīn",
    literalMeaning: "温 (review) 故 (the old) 知 (understand) 新 (the new) — review the old, and thereby understand the new.",
    meaning: "Going back over what you've already learned helps you understand new things better.",
    meaningZh: {
      hanzi: "把以前学过的东西再复习一遍，可以帮助自己更好地理解新的知识。",
      pinyin: "Bǎ yǐqián xuéguò de dōngxi zài fùxí yí biàn, kěyǐ bāngzhù zìjǐ gèng hǎo de lǐjiě xīn de zhīshi.",
      charPinyin: ["bǎ", "yǐ", "qián", "xué", "guò", "de", "dōng", "xi", "zài", "fù", "xí", "yí", "biàn", "", "kě", "yǐ", "bāng", "zhù", "zì", "jǐ", "gèng", "hǎo", "de", "lǐ", "jiě", "xīn", "de", "zhī", "shi", ""],
    },
    dailyLifeScenario:
      "Before a spelling test, you flip back through last month's word lists to review them — this helps the new words make more sense too. That's 温故知新.",
    exampleSentence: {
      hanzi: "他每天温故知新，先复习旧的生字，读新课文时就觉得容易多了。",
      pinyin: "Tā měitiān wēngù-zhīxīn, xiān fùxí jiù de shēngzì, dú xīn kèwén shí jiù juéde róngyì duō le.",
      english: "He reviews old lessons every day — that's why new lessons feel much easier to read.",
      charPinyin: ["tā", "měi", "tiān", "wēn", "gù", "zhī", "xīn", "", "xiān", "fù", "xí", "jiù", "de", "shēng", "zì", "", "dú", "xīn", "kè", "wén", "shí", "jiù", "jué", "de", "róng", "yì", "duō", "le", ""],
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
    meaningZh: {
      hanzi: "什么都不努力去做，只是傻傻地等着好运气自己出现。",
      pinyin: "Shénme dōu bù nǔlì qù zuò, zhǐshì shǎshǎ de děng zhe hǎo yùnqi zìjǐ chūxiàn.",
      charPinyin: ["shén", "me", "dōu", "bù", "nǔ", "lì", "qù", "zuò", "", "zhǐ", "shì", "shǎ", "shǎ", "de", "děng", "zhe", "hǎo", "yùn", "qi", "zì", "jǐ", "chū", "xiàn", ""],
    },
    dailyLifeScenario:
      "You hope to do well in your spelling test just by 'getting lucky,' instead of studying the word list. A friend might remind you that you can't just 守株待兔.",
    exampleSentence: {
      hanzi: "光靠守株待兔是学不好华文的，你得每天认真复习。",
      pinyin: "Guāng kào shǒuzhū-dàitù shì xué bù hǎo Huáwén de, nǐ děi měitiān rènzhēn fùxí.",
      english: "You can't learn Chinese well by waiting for luck — review carefully every day.",
      charPinyin: ["guāng", "kào", "shǒu", "zhū", "dài", "tù", "shì", "xué", "bù", "hǎo", "huá", "wén", "de", "", "nǐ", "děi", "měi", "tiān", "rèn", "zhēn", "fù", "xí", ""],
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
    meaningZh: {
      hanzi: "以为自己知道的东西就是全部，不知道外面的世界其实更大更精彩。",
      pinyin: "Yǐwéi zìjǐ zhīdào de dōngxi jiùshì quánbù, bù zhīdào wàimiàn de shìjiè qíshí gèng dà gèng jīngcǎi.",
      charPinyin: ["yǐ", "wéi", "zì", "jǐ", "zhī", "dào", "de", "dōng", "xi", "jiù", "shì", "quán", "bù", "", "bù", "zhī", "dào", "wài", "miàn", "de", "shì", "jiè", "qí", "shí", "gèng", "dà", "gèng", "jīng", "cǎi", ""],
    },
    dailyLifeScenario:
      "You think you're the best drawer in your class — until you visit an art exhibition and see how many amazing styles of drawing exist. Realising there's always more to learn is the opposite of being a 井底之蛙.",
    exampleSentence: {
      hanzi: "参观美术馆后，他才发现自己以前就像井底之蛙，其实还有很多东西可以学习。",
      pinyin: "Cānguān měishùguǎn hòu, tā cái fāxiàn zìjǐ yǐqián jiù xiàng jǐngdǐzhīwā, qíshí hái yǒu hěn duō dōngxi kěyǐ xuéxí.",
      english: "After the art museum, he realised he'd been like a frog in a well — so much more to learn.",
      charPinyin: ["cān", "guān", "měi", "shù", "guǎn", "hòu", "", "tā", "cái", "fā", "xiàn", "zì", "jǐ", "yǐ", "qián", "jiù", "xiàng", "jǐng", "dǐ", "zhī", "wā", "", "qí", "shí", "hái", "yǒu", "hěn", "duō", "dōng", "xi", "kě", "yǐ", "xué", "xí", ""],
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
    meaningZh: {
      hanzi: "只做一件事情，却同时得到了两种好处。",
      pinyin: "Zhǐ zuò yí jiàn shìqing, què tóngshí dédào le liǎng zhǒng hǎochù.",
      charPinyin: ["zhǐ", "zuò", "yí", "jiàn", "shì", "qing", "", "què", "tóng", "shí", "dé", "dào", "le", "liǎng", "zhǒng", "hǎo", "chù", ""],
    },
    dailyLifeScenario:
      "You walk to school with your dad instead of taking the car — you get to school and also get exercise and chat with him along the way. That's 一举两得.",
    exampleSentence: {
      hanzi: "走路去上学既能运动又能省钱，真是一举两得。",
      pinyin: "Zǒulù qù shàngxué jì néng yùndòng yòu néng shěngqián, zhēnshi yìjǔ-liǎngdé.",
      english: "Walking to school lets you exercise and save money — two gains from one action.",
      charPinyin: ["zǒu", "lù", "qù", "shàng", "xué", "jì", "néng", "yùn", "dòng", "yòu", "néng", "shěng", "qián", "", "zhēn", "shi", "yì", "jǔ", "liǎng", "dé", ""],
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes:
      "Origin: 战国策·秦策二. Classified at a fairly advanced level for L2 adult learners, but character difficulty is low for native-speaking children (一/两 taught early; 举 familiar from 举手 in class).",
  },
  {
    id: "ju-yi-fan-san",
    hanzi: "举一反三",
    pinyin: "jǔ yī fǎn sān",
    literalMeaning: "举 (raise/cite) 一 (one example) 反 (in turn infer) 三 (three others) — from one example raised, inferring three more.",
    meaning: "Learning one thing well enough that you can figure out other similar things on your own, without being taught each one separately.",
    meaningZh: {
      hanzi: "学会了一个方法，就能推想出很多类似的道理。",
      pinyin: "Xuéhuì le yí ge fāngfǎ, jiù néng tuīxiǎng chū hěn duō lèisì de dàolǐ.",
      charPinyin: ["xué", "huì", "le", "yí", "ge", "fāng", "fǎ", "", "jiù", "néng", "tuī", "xiǎng", "chū", "hěn", "duō", "lèi", "sì", "de", "dào", "lǐ", ""],
    },
    dailyLifeScenario:
      "After learning that the character 河 (river) has the water radical 氵 on the left, you realise you can guess that 湖 (lake) and 海 (sea) are also related to water, without being told each one. That's 举一反三.",
    exampleSentence: {
      hanzi: "学会了河这个字后，他举一反三，猜出湖和海也都跟水有关。",
      pinyin: "Xuéhuì le hé zhège zì hòu, tā jǔyī-fǎnsān, cāichū hú hé hǎi yě dōu gēn shuǐ yǒuguān.",
      english: "After learning the character 河 (river), he could infer by analogy that 湖 (lake) and 海 (sea) are also related to water.",
      charPinyin: ["xué", "huì", "le", "hé", "zhè", "ge", "zì", "hòu", "", "tā", "jǔ", "yī", "fǎn", "sān", "", "cāi", "chū", "hú", "hé", "hǎi", "yě", "dōu", "gēn", "shuǐ", "yǒu", "guān", ""],
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Meaning/origin (《论语·述而》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "wei-yu-chou-mou",
    hanzi: "未雨绸缪",
    pinyin: "wèi yǔ chóu móu",
    literalMeaning: "未 (before) 雨 (rain) 绸缪 (mend tightly, i.e. repair the roof) — mending the roof before it rains.",
    meaning: "Getting ready for something before it happens, instead of waiting until it's too late.",
    meaningZh: {
      hanzi: "在事情发生之前就先做好准备，不要等到事到临头才着急。",
      pinyin: "Zài shìqing fāshēng zhīqián jiù xiān zuò hǎo zhǔnbèi, bú yào děngdào shì dào líntóu cái zháojí.",
      charPinyin: ["zài", "shì", "qing", "fā", "shēng", "zhī", "qián", "jiù", "xiān", "zuò", "hǎo", "zhǔn", "bèi", "", "bú", "yào", "děng", "dào", "shì", "dào", "lín", "tóu", "cái", "zháo", "jí", ""],
    },
    dailyLifeScenario:
      "You know a spelling test is coming up in two weeks, so you start reviewing a little bit every day well ahead of time, instead of cramming the night before. That looking-ahead preparation is 未雨绸缪.",
    exampleSentence: {
      hanzi: "他每天多复习一点，未雨绸缪，考试来临时才不会手忙脚乱。",
      pinyin: "Tā měitiān duō fùxí yìdiǎn, wèiyǔ-chóumóu, kǎoshì láilín shí cái bú huì shǒumáng-jiǎoluàn.",
      english: "He reviews a little extra every day, preparing ahead of time, so when the exam comes he won't be flustered.",
      charPinyin: ["tā", "měi", "tiān", "duō", "fù", "xí", "yì", "diǎn", "", "wèi", "yǔ", "chóu", "móu", "", "kǎo", "shì", "lái", "lín", "shí", "cái", "bú", "huì", "shǒu", "máng", "jiǎo", "luàn", ""],
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Meaning/origin (《诗经·豳风·鸱鸮》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "rong-hui-guan-tong",
    hanzi: "融会贯通",
    pinyin: "róng huì guàn tōng",
    literalMeaning: "融 (melt/blend) 会 (together) 贯 (thread through) 通 (fully understand) — blending knowledge together until it all threads through into full understanding.",
    meaning: "Connecting different pieces of knowledge together until you truly and fully understand the whole picture, not just separate facts.",
    meaningZh: {
      hanzi: "把学过的各种知识连接起来，变成一个完整清楚的理解。",
      pinyin: "Bǎ xuéguò de gèzhǒng zhīshi liánjiē qǐlái, biànchéng yí ge wánzhěng qīngchu de lǐjiě.",
      charPinyin: ["bǎ", "xué", "guò", "de", "gè", "zhǒng", "zhī", "shi", "lián", "jiē", "qǐ", "lái", "", "biàn", "chéng", "yí", "ge", "wán", "zhěng", "qīng", "chu", "de", "lǐ", "jiě", ""],
    },
    dailyLifeScenario:
      "You've learned addition, subtraction, and multiplication separately — then one day it all clicks, and you can work out exactly how much change you should get when buying something at the shop. That connecting-the-dots understanding is 融会贯通.",
    exampleSentence: {
      hanzi: "学会加法减法和乘法后，他终于融会贯通，能自己算清楚该找多少钱。",
      pinyin: "Xuéhuì jiāfǎ jiǎnfǎ hé chéngfǎ hòu, tā zhōngyú rónghuì-guàntōng, néng zìjǐ suàn qīngchu gāi zhǎo duōshao qián.",
      english: "After learning addition, subtraction, and multiplication, it all finally connected for him, and he could work out exactly how much change he should get.",
      charPinyin: ["xué", "huì", "jiā", "fǎ", "jiǎn", "fǎ", "hé", "chéng", "fǎ", "hòu", "", "tā", "zhōng", "yú", "róng", "huì", "guàn", "tōng", "", "néng", "zì", "jǐ", "suàn", "qīng", "chu", "gāi", "zhǎo", "duō", "shao", "qián", ""],
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Meaning/origin (《朱子全书·学三》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
  {
    id: "ji-si-guang-yi",
    hanzi: "集思广益",
    pinyin: "jí sī guǎng yì",
    literalMeaning: "集 (gather) 思 (thoughts) 广 (widen) 益 (benefit) — gathering everyone's ideas to widen the benefit for all.",
    meaning: "Bringing everyone's ideas together so the whole group ends up with a better solution than any one person could find alone.",
    meaningZh: {
      hanzi: "把大家的想法都收集起来，共同得到更好的办法。",
      pinyin: "Bǎ dàjiā de xiǎngfǎ dōu shōují qǐlái, gòngtóng dédào gèng hǎo de bànfǎ.",
      charPinyin: ["bǎ", "dà", "jiā", "de", "xiǎng", "fǎ", "dōu", "shōu", "jí", "qǐ", "lái", "", "gòng", "tóng", "dé", "dào", "gèng", "hǎo", "de", "bàn", "fǎ", ""],
    },
    dailyLifeScenario:
      "Your group needs to decide how to design your class poster. Instead of just doing it your own way, you ask everyone for ideas first and combine the best of all of them. That's 集思广益.",
    exampleSentence: {
      hanzi: "设计海报时，大家集思广益，想出了更好的点子。",
      pinyin: "Shèjì hǎibào shí, dàjiā jísī-guǎngyì, xiǎngchū le gèng hǎo de diǎnzi.",
      english: "While designing the poster, everyone pooled their ideas, and they came up with an even better one.",
      charPinyin: ["shè", "jì", "hǎi", "bào", "shí", "", "dà", "jiā", "jí", "sī", "guǎng", "yì", "", "xiǎng", "chū", "le", "gèng", "hǎo", "de", "diǎn", "zi", ""],
    },
    ageBand: "lower-primary",
    theme: "wisdom",
    sourceNotes: "Meaning/origin (三国·蜀·诸葛亮《教与军师长史参军掾属》) confirmed via zdic.net and Baidu Baike (2026-09-09 search).",
  },
];

export const idiomsById: Record<string, IdiomContent> = Object.fromEntries(
  idioms.map((idiom) => [idiom.id, idiom]),
);
