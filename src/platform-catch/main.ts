import Phaser from "phaser";
import { PlatformCatchScene } from "./PlatformCatchScene";
import { idioms } from "../idioms/idioms";
import { SPIKE_IDIOM_ID } from "../catch-meaning/catchItems";
import type { IdiomContent } from "../idioms/types";

function getSpikeIdiom(): IdiomContent {
  const idiom = idioms.find((i) => i.id === SPIKE_IDIOM_ID);
  if (!idiom) throw new Error(`Phase 2 spike idiom "${SPIKE_IDIOM_ID}" not found in idioms.ts`);
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

function bindHoldButton(id: string, onChange: (held: boolean) => void): void {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e: Event) => {
    e.preventDefault();
    onChange(true);
  };
  const release = () => onChange(false);
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointerleave", release);
  el.addEventListener("pointercancel", release);
}

function bootstrap(): void {
  // Phase 2 spike keeps the same fixed idiom as Phase 0 — the change
  // under test is the interaction (movement + jump), not the content.
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
    scene: [PlatformCatchScene],
  };

  const game = new Phaser.Game(config);

  const start = (): void => {
    document.getElementById("catch-complete-card")?.classList.remove("visible");
    game.scene.start("PlatformCatchScene", { idiom, onComplete: () => showCompletionCard(idiom) });
  };
  start();

  document.getElementById("play-again-btn")?.addEventListener("click", start);

  const scene = () => game.scene.getScene("PlatformCatchScene") as import("./PlatformCatchScene").PlatformCatchScene | null;
  bindHoldButton("move-left-btn", (held) => scene()?.setButtonLeft(held));
  bindHoldButton("move-right-btn", (held) => scene()?.setButtonRight(held));
  document.getElementById("jump-btn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    scene()?.requestJump();
  });
}

bootstrap();
