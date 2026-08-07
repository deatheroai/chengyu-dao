import type { IdiomContent } from "../idioms/types";

export interface ApplicationCheckOption {
  text: string;
  isCorrect: boolean;
  fromIdiomId: string;
}

/**
 * Builds the multiple-choice options for Snippet 3's "which situation
 * fits?" check: the target idiom's own scenario, plus distractors drawn
 * from OTHER idioms' already-approved scenarios (Snippet 1 content) —
 * no need to author adversarial "trick" decoys. Distractors are preferred
 * from a different theme than the target so the check tests the specific
 * meaning rather than surface topic-matching within the same theme.
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
    { text: target.scenarioShort, isCorrect: true, fromIdiomId: target.id },
    ...distractors.map((idiom) => ({
      text: idiom.scenarioShort,
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
