import { idioms } from "../idioms/idioms";
import { MeaningCheckController } from "./meaningCheckView";
import type { IdiomContent } from "../idioms/types";

function pickRandomIdiom(exclude?: IdiomContent): IdiomContent {
  if (idioms.length === 1) return idioms[0];
  let next = idioms[Math.floor(Math.random() * idioms.length)];
  while (exclude && next.id === exclude.id) {
    next = idioms[Math.floor(Math.random() * idioms.length)];
  }
  return next;
}

function bootstrap(): void {
  const controller = new MeaningCheckController(idioms);
  // Standalone Snippet 3 page: "Next" just picks another random idiom,
  // excluding whichever one just resolved, and starts the next round.
  const advance = (exclude?: IdiomContent): void => {
    const idiom = pickRandomIdiom(exclude);
    controller.start(idiom, () => advance(idiom));
  };
  advance();
}

bootstrap();
