import Phaser from "phaser";
import { IdiomDoorScene } from "./IdiomDoorScene";
import { doorLevels } from "./levelContent";

function showMeaning(index: number): void {
  const el = document.getElementById("meaning-prompt");
  if (!el) return;
  el.textContent = `Which idiom means: "${doorLevels[index].idiom.meaning}"`;
}

function showSummary(completedHanzi: string[]): void {
  const card = document.getElementById("session-summary-card");
  if (!card) return;
  card.querySelector<HTMLElement>("[data-summary-list]")!.textContent = completedHanzi.join(" · ");
  card.classList.add("visible");
}

function bootstrap(): void {
  // Chains all 3 currently-defined levels, then stops with a warm
  // summary — same "3 idioms, then a soft stop" bounded pacing as the
  // existing session design (SNIPPET_PLANS.md's Snippet 5), per your
  // 2026-08-22 decision to keep that intact while this new mechanic is
  // being tried out.
  let levelIndex = 0;
  const completedHanzi: string[] = [];

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#fff3e2",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [IdiomDoorScene],
  };

  const game = new Phaser.Game(config);
  const scene = () => game.scene.getScene("IdiomDoorScene") as import("./IdiomDoorScene").IdiomDoorScene | null;

  const startLevel = (index: number): void => {
    document.getElementById("session-summary-card")?.classList.remove("visible");
    showMeaning(index);
    game.scene.start("IdiomDoorScene", {
      level: doorLevels[index],
      onDoorReached: () => handleDoorReached(index),
    });
  };

  const handleDoorReached = (finishedIndex: number): void => {
    completedHanzi.push(doorLevels[finishedIndex].idiom.hanzi);
    const next = finishedIndex + 1;
    if (next < doorLevels.length) {
      levelIndex = next;
      startLevel(next);
    } else {
      showSummary(completedHanzi);
    }
  };

  startLevel(levelIndex);

  document.getElementById("jump-btn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    scene()?.requestJump();
  });

  document.getElementById("play-again-btn")?.addEventListener("click", () => {
    completedHanzi.length = 0;
    levelIndex = 0;
    startLevel(0);
  });
}

bootstrap();
