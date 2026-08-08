import type { IdiomContent } from "../idioms/types";

export interface ApplicationCheckOption {
  hanzi: string;
  pinyin: string;
  isCorrect: boolean;
  fromIdiomId: string;
}

/**
 * Tone-sandhi-adjusted, hyphenated pinyin each idiom takes when embedded
 * mid-sentence (distinct from its standalone, spaced `pinyin` field) —
 * exactly the substring each idiom already uses within its own
 * `exampleSentence.pinyin`. Needed to splice an idiom into a DIFFERENT
 * idiom's sentence (see buildApplicationCheck): swapping the hanzi alone
 * isn't enough, the pinyin has to move with it or the two would disagree.
 */
const EMBEDDED_PINYIN: Record<string, string> = {
  "yi-xin-yi-yi": "yīxīn-yíyì",
  "you-shi-you-zhong": "yǒushǐ-yǒuzhōng",
  "ban-tu-er-fei": "bàntú'érfèi",
  "shu-neng-sheng-qiao": "shúnéngshēngqiǎo",
  "mo-chu-cheng-zhen": "móchǔ-chéngzhēn",
  "ba-miao-zhu-zhang": "bámiáo-zhùzhǎng",
  "yan-er-you-xin": "yán'éryǒuxìn",
  "zhi-cuo-jiu-gai": "zhīcuò-jiùgǎi",
  "zhu-ren-wei-le": "zhùrén-wéilè",
  "qi-xin-xie-li": "qíxīn-xiélì",
  "xiang-qin-xiang-ai": "xiāngqīn-xiāng'ài",
  "wen-gu-zhi-xin": "wēngù-zhīxīn",
  "shou-zhu-dai-tu": "shǒuzhū-dàitù",
  "jing-di-zhi-wa": "jǐngdǐzhīwā",
  "yi-ju-liang-de": "yìjǔ-liǎngdé",
};

/**
 * Swaps `replacement`'s idiom into `source`'s example sentence in place
 * of `source`'s own idiom — same sentence structure, wrong idiom for the
 * context. This is what makes a distractor a genuine "wrong usage"
 * example instead of just a different-idiom sentence: without it, the
 * target idiom would only ever appear in the correct option, and a child
 * could answer by spotting which option contains the same characters
 * shown at the top of the card, rather than judging whether the idiom
 * actually fits.
 */
export function spliceIdiomInto(source: IdiomContent, replacement: IdiomContent): { hanzi: string; pinyin: string } {
  const sourceEmbeddedPinyin = EMBEDDED_PINYIN[source.id];
  const replacementEmbeddedPinyin = EMBEDDED_PINYIN[replacement.id];
  if (!sourceEmbeddedPinyin || !replacementEmbeddedPinyin) {
    throw new Error(`Missing EMBEDDED_PINYIN entry for "${source.id}" or "${replacement.id}"`);
  }

  const hanzi = source.exampleSentence.hanzi.split(source.hanzi).join(replacement.hanzi);
  const pinyin = source.exampleSentence.pinyin.split(sourceEmbeddedPinyin).join(replacementEmbeddedPinyin);

  if (hanzi === source.exampleSentence.hanzi || pinyin === source.exampleSentence.pinyin) {
    throw new Error(`spliceIdiomInto: substitution had no effect for "${source.id}" -> "${replacement.id}"`);
  }

  return { hanzi, pinyin };
}

/**
 * Builds the multiple-choice options for Snippet 3's "which one is really
 * about [idiom]?" check: the target idiom's own example sentence (correct,
 * genuine usage), plus distractors built by splicing the SAME target idiom
 * into OTHER idioms' sentence structures (wrong usage — grammatically
 * fine, semantically off). All three options therefore show the target
 * idiom's characters, so the check requires judging whether it fits each
 * sentence rather than spotting which option has different characters.
 * Distractor source sentences are preferred from a different theme than
 * the target for variety.
 */
export function buildApplicationCheck(
  target: IdiomContent,
  pool: IdiomContent[],
  distractorCount = 2,
  rng: () => number = Math.random,
): ApplicationCheckOption[] {
  const others = pool.filter((idiom) => idiom.id !== target.id);
  const differentTheme = others.filter((idiom) => idiom.theme !== target.theme);
  const sameTheme = others.filter((idiom) => idiom.theme === target.theme);

  const distractorSource = differentTheme.length >= distractorCount ? differentTheme : [...differentTheme, ...sameTheme];
  const distractorIdioms = shuffle(distractorSource, rng).slice(0, distractorCount);

  const options: ApplicationCheckOption[] = [
    {
      hanzi: target.exampleSentence.hanzi,
      pinyin: target.exampleSentence.pinyin,
      isCorrect: true,
      fromIdiomId: target.id,
    },
    ...distractorIdioms.map((sourceIdiom) => ({
      ...spliceIdiomInto(sourceIdiom, target),
      isCorrect: false,
      fromIdiomId: sourceIdiom.id,
    })),
  ];

  return shuffle(options, rng);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
