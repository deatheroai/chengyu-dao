import Phaser from "phaser";
import { RevealScene } from "./RevealScene";
import { idioms } from "../idioms/idioms";
import { updateRevealStatus } from "./domStatus";
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
  let currentIdiom = pickRandomIdiom();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#fff3e2",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [RevealScene],
  };

  const game = new Phaser.Game(config);
  game.scene.start("RevealScene", { idiom: currentIdiom });

  document.getElementById("next-idiom-btn")?.addEventListener("click", () => {
    currentIdiom = pickRandomIdiom(currentIdiom);
    updateRevealStatus(0, Array.from(currentIdiom.hanzi).length, false);
    game.scene.start("RevealScene", { idiom: currentIdiom });
  });
}

bootstrap();
