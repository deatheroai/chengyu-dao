import type { IdiomContent } from "../idioms/types";

export interface ApplicationCheckOption {
  hanzi: string;
  pinyin: string;
  isCorrect: boolean;
  fromIdiomId: string;
}

/**
 * Builds the multiple-choice options for Snippet 3's "which one is really
 * about [idiom]?" check: the target idiom's own example sentence (which
 * already naturally uses the idiom — showing usage directly, not just
 * meaning), plus distractors drawn from OTHER idioms' example sentences.
 * All already-approved Snippet 1 content, no new unverified text needed.
 * Distractors are preferred from a different theme than the target for
 * variety, though the idiom being visibly present in each sentence means
 * the check now also doubles as reading/character-recognition practice,
 * not just meaning comprehension.
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
  const distractors = shuffle(distractorSource, rng).slice(0, distractorCount);

  const options: ApplicationCheckOption[] = [
    {
      hanzi: target.exampleSentence.hanzi,
      pinyin: target.exampleSentence.pinyin,
      isCorrect: true,
      fromIdiomId: target.id,
    },
    ...distractors.map((idiom) => ({
      hanzi: idiom.exampleSentence.hanzi,
      pinyin: idiom.exampleSentence.pinyin,
      isCorrect: false,
      fromIdiomId: idiom.id,
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
