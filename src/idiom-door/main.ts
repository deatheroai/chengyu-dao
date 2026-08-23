import Phaser from "phaser";
import { IdiomDoorScene } from "./IdiomDoorScene";
import { doorLevels } from "./levelContent";
import { BalloonSentenceScene } from "./BalloonSentenceScene";
import { balloonLevels } from "./balloonLevelContent";

function showMeaning(index: number): void {
  const el = document.getElementById("meaning-prompt");
  if (!el) return;
  el.textContent = `Which idiom means: "${doorLevels[index].idiom.meaning}"`;
}

/**
 * 2026-08-24 feedback: this game is Mandarin-first, so the intro clue
 * should be too — a Mandarin paraphrase of the meaning (with pinyin),
 * not the idiom's own hanzi (`meaningZh` is deliberately new/different
 * text from the idiom itself, so it doesn't just hand the puzzle's
 * answer to a child who can read it). A child who can't read the
 * Mandarin yet can tap the 🤔 icon to reveal the English version
 * instead — reset to hidden here so a new level doesn't inherit the
 * previous one's already-revealed state.
 */
function showIntroMeaning(index: number): void {
  const idiom = doorLevels[index].idiom;
  const zhEl = document.querySelector<HTMLElement>("[data-intro-meaning-zh]");
  const pinyinEl = document.querySelector<HTMLElement>("[data-intro-meaning-pinyin]");
  const enEl = document.querySelector<HTMLElement>("[data-intro-meaning-en]");
  if (zhEl) zhEl.textContent = idiom.meaningZh.hanzi;
  if (pinyinEl) pinyinEl.textContent = idiom.meaningZh.pinyin;
  if (enEl) {
    enEl.textContent = `"${idiom.meaning}"`;
    enEl.classList.add("hidden");
  }
}

/** 2026-08-25 addition: names the idiom being practiced in this stage —
 * `#balloon-status` (balloonStatus.ts) handles the dynamic found/wrong
 * feedback below this, same relationship as `#meaning-prompt` and
 * `#door-status` have in the door stage. */
function showBalloonPrompt(index: number): void {
  const el = document.getElementById("balloon-prompt");
  if (!el) return;
  const idiom = balloonLevels[index].idiom;
  el.textContent = `Catch the balloon that uses ${idiom.hanzi} (${idiom.pinyin}) correctly!`;
}

function showSummary(completedHanzi: string[]): void {
  const card = document.getElementById("session-summary-card");
  if (!card) return;
  card.querySelector<HTMLElement>("[data-summary-list]")!.textContent = completedHanzi.join(" · ");
  card.classList.add("visible");
}

/** Toggles which stage's DOM chrome (prompt/status chip) is visible —
 * the door puzzle and balloon stage share the same page/canvas rather
 * than being separate HTML files. The balloon stage has no on-screen
 * movement controls to toggle (2026-08-26: dragging the avatar
 * directly replaced the on-screen d-pad, handled entirely inside
 * BalloonSentenceScene via Phaser's own pointer input). */
function showDoorStageUI(): void {
  document.getElementById("catch-ui-layer")?.classList.remove("stage-hidden");
  document.getElementById("controls-layer")?.classList.remove("stage-hidden");
  document.getElementById("balloon-ui-layer")?.classList.add("stage-hidden");
}

function showBalloonStageUI(): void {
  document.getElementById("catch-ui-layer")?.classList.add("stage-hidden");
  document.getElementById("controls-layer")?.classList.add("stage-hidden");
  document.getElementById("balloon-ui-layer")?.classList.remove("stage-hidden");
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
  game.scene.add("BalloonSentenceScene", BalloonSentenceScene, false);
  const doorScene = () => game.scene.getScene("IdiomDoorScene") as import("./IdiomDoorScene").IdiomDoorScene | null;

  // Starting one of these two gameplay scenes never automatically stops
  // the other — Phaser happily runs both concurrently unless told
  // otherwise. 2026-08-27 feedback: the balloon stage's sky (still
  // animating its bobbing tweens) stayed visible/distracting behind the
  // next level's intro card. Fixed by stopping a scene the moment we
  // know we're *leaving* it (handleDoorReached/afterBalloonStage below)
  // rather than only whenever the next scene happens to actually start
  // — the intro card can sit on screen for as long as the child takes
  // to press Start, so waiting until then left the outgoing scene
  // running (and rendering) the whole time.
  //
  // Deferred a tick (setTimeout 0), not called immediately: both call
  // sites fire *from inside* the scene being stopped's own frame step
  // (IdiomDoorScene's fast-forward-dash tween callback, and
  // BalloonSentenceScene's resolve `time.delayedCall`) — stopping a
  // scene synchronously from within its own still-in-progress step
  // tears down its camera/systems before Phaser's per-frame loop is
  // done using them, crashing with "Cannot set properties of undefined
  // (setting 'scrollX')" the moment that scene's `update()` is reached
  // later in the same step. Breaking out to a fresh task lets the
  // current step finish cleanly first.
  const stopGameplayScene = (key: "IdiomDoorScene" | "BalloonSentenceScene"): void => {
    setTimeout(() => {
      if (game.scene.isActive(key)) game.scene.stop(key);
    }, 0);
  };

  showDoorStageUI();

  // Actually starts the Phaser scene running (the character begins
  // auto-running immediately). Called once the child has dismissed that
  // level's intro screen — never directly on a level transition, so
  // there's always reading/thinking time first (2026-08-23 feedback).
  const beginLevel = (index: number): void => {
    document.getElementById("session-summary-card")?.classList.remove("visible");
    showDoorStageUI();
    showMeaning(index);
    game.scene.start("IdiomDoorScene", {
      level: doorLevels[index],
      onDoorReached: () => handleDoorReached(index),
    });
  };

  // 2026-08-25: a stage after each idiom's door — catch the balloon
  // that uses the idiom correctly among decoys that use it wrong (your
  // idea; content reuses meaning-check.html's already-approved
  // spliceIdiomInto distractors, no new unverified content). Runs
  // *before* moving on to the next idiom, right after solving this
  // one's door — the sentence example lands while the idiom is fresh.
  const beginBalloonStage = (index: number): void => {
    showBalloonStageUI();
    showBalloonPrompt(index);
    game.scene.start("BalloonSentenceScene", {
      level: balloonLevels[index],
      onResolved: () => afterBalloonStage(index),
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
    stopGameplayScene("IdiomDoorScene");
    // Hide the door stage's own chrome immediately too, not just its
    // Phaser scene — otherwise its prompt/status text kept showing
    // (behind the balloon stage's own, now-doubled-up) until the
    // *next* door level actually began.
    document.getElementById("catch-ui-layer")?.classList.add("stage-hidden");
    document.getElementById("controls-layer")?.classList.add("stage-hidden");
    beginBalloonStage(finishedIndex);
  };

  const afterBalloonStage = (finishedIndex: number): void => {
    stopGameplayScene("BalloonSentenceScene");
    // Same reasoning as handleDoorReached above: hide this stage's own
    // chrome the moment we're leaving it, not just its Phaser scene —
    // otherwise its prompt/status text kept showing behind the next
    // level's intro card until Start was pressed.
    document.getElementById("balloon-ui-layer")?.classList.add("stage-hidden");
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
    doorScene()?.requestJump();
  });

  // Same button/element persists across every level's intro (only its
  // text content changes via showIntroMeaning), so this is wired once
  // rather than per-level like the Start button's onStart handoff.
  document.getElementById("reveal-english-btn")?.addEventListener("click", () => {
    document.querySelector("[data-intro-meaning-en]")?.classList.remove("hidden");
  });

  document.getElementById("play-again-btn")?.addEventListener("click", () => {
    completedHanzi.length = 0;
    levelIndex = 0;
    startLevelWithIntro(0);
  });
}

bootstrap();
