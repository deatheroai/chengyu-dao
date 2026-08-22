import Phaser from "phaser";
import { IdiomDoorScene } from "./IdiomDoorScene";
import { doorLevels } from "./levelContent";

function showMeaning(index: number): void {
  const el = document.getElementById("meaning-prompt");
  if (!el) return;
  el.textContent = `Which idiom means: "${doorLevels[index].idiom.meaning}"`;
}

function showIntroMeaning(index: number): void {
  const el = document.querySelector<HTMLElement>("[data-intro-meaning]");
  if (!el) return;
  // The card's own "Which idiom means..." eyebrow already frames this,
  // so the meaning itself is shown plain rather than repeating that
  // phrase (the in-game `#meaning-prompt` chip is the one that needs
  // the full sentence, since it has no eyebrow of its own).
  el.textContent = `"${doorLevels[index].idiom.meaning}"`;
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
    // Registered manually below with autoStart:false — the run must not
    // begin until the level-intro screen's Start button is pressed (see
    // startLevelWithIntro), so nothing here should auto-start on boot.
    scene: [],
  };

  const game = new Phaser.Game(config);
  game.scene.add("IdiomDoorScene", IdiomDoorScene, false);
  const scene = () => game.scene.getScene("IdiomDoorScene") as import("./IdiomDoorScene").IdiomDoorScene | null;

  // Actually starts the Phaser scene running (the character begins
  // auto-running immediately). Called once the child has dismissed that
  // level's intro screen — never directly on a level transition, so
  // there's always reading/thinking time first (2026-08-23 feedback).
  const beginLevel = (index: number): void => {
    document.getElementById("session-summary-card")?.classList.remove("visible");
    showMeaning(index);
    game.scene.start("IdiomDoorScene", {
      level: doorLevels[index],
      onDoorReached: () => handleDoorReached(index),
    });
  };

  // Shows the full-screen "big screen" intro (per your 2026-08-23
  // feedback: "show the question at the beginning ... let the child
  // have some time to read and think") and wires the Start button to
  // dismiss it and hand off to `onStart`. Note this is *not* shown
  // again when the in-scene "reached the door unsolved" safety net
  // restarts the same level (IdiomDoorScene.restartLevel) — that's a
  // quick nudge to try again, not a fresh level the child needs new
  // reading time for.
  const showLevelIntro = (index: number, onStart: () => void): void => {
    // The session summary is only ever shown after the *last* level,
    // and Play again jumps straight from there into the first level's
    // intro — without this, the summary card stayed visible underneath
    // the intro card until Start was pressed (beginLevel was the only
    // place that cleared it, and beginLevel now runs *after* Start,
    // not on Play again itself).
    document.getElementById("session-summary-card")?.classList.remove("visible");
    const card = document.getElementById("level-intro-card");
    showIntroMeaning(index);
    card?.classList.add("visible");

    const startBtn = document.getElementById("start-level-btn");
    const onClick = (): void => {
      card?.classList.remove("visible");
      startBtn?.removeEventListener("click", onClick);
      onStart();
    };
    startBtn?.addEventListener("click", onClick);
  };

  const startLevelWithIntro = (index: number): void => {
    showLevelIntro(index, () => beginLevel(index));
  };

  const handleDoorReached = (finishedIndex: number): void => {
    completedHanzi.push(doorLevels[finishedIndex].idiom.hanzi);
    const next = finishedIndex + 1;
    if (next < doorLevels.length) {
      levelIndex = next;
      startLevelWithIntro(next);
    } else {
      showSummary(completedHanzi);
    }
  };

  startLevelWithIntro(levelIndex);

  document.getElementById("jump-btn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    scene()?.requestJump();
  });

  document.getElementById("play-again-btn")?.addEventListener("click", () => {
    completedHanzi.length = 0;
    levelIndex = 0;
    startLevelWithIntro(0);
  });
}

bootstrap();
