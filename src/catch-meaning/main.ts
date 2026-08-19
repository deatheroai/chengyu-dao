import Phaser from "phaser";
import { CatchScene } from "./CatchScene";
import { idioms } from "../idioms/idioms";
import { SPIKE_IDIOM_ID } from "./catchItems";
import type { IdiomContent } from "../idioms/types";

function getSpikeIdiom(): IdiomContent {
  const idiom = idioms.find((i) => i.id === SPIKE_IDIOM_ID);
  if (!idiom) throw new Error(`Phase 0 spike idiom "${SPIKE_IDIOM_ID}" not found in idioms.ts`);
  return idiom;
}

function showCompletionCard(idiom: IdiomContent): void {
  const card = document.getElementById("catch-complete-card");
  if (!card) return;
  card.querySelector<HTMLElement>("[data-hanzi]")!.textContent = idiom.hanzi;
  card.querySelector<HTMLElement>("[data-pinyin]")!.textContent = idiom.pinyin;
  card.querySelector<HTMLElement>("[data-meaning]")!.textContent = idiom.meaning;
  card.classList.add("visible");
}

function bootstrap(): void {
  // Phase 0 spike targets a single fixed idiom (CATCH_MECHANIC_PLAN.md) —
  // unlike idiom-reveal/meaning-check, there's no "try another" random
  // pick yet, since the icon set is currently only designed for this one.
  const idiom = getSpikeIdiom();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#fff3e2",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [CatchScene],
  };

  const game = new Phaser.Game(config);

  const start = (): void => {
    document.getElementById("catch-complete-card")?.classList.remove("visible");
    game.scene.start("CatchScene", { idiom, onComplete: () => showCompletionCard(idiom) });
  };
  start();

  document.getElementById("play-again-btn")?.addEventListener("click", start);
}

bootstrap();
