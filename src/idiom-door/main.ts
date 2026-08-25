import Phaser from "phaser";
import { IdiomDoorScene } from "./IdiomDoorScene";
import { doorLevels } from "./levelContent";
import { BalloonSentenceScene } from "./BalloonSentenceScene";
import { balloonLevels } from "./balloonLevelContent";
import { IdiomMatchScene } from "./IdiomMatchScene";
import { matchLevel } from "./matchLevelContent";
import { updateSessionProgress } from "./sessionProgressStatus";
import { renderRubyText } from "../shared/rubyText";

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
 *
 * 2026-08-28: pinyin used to sit in its own paragraph below the hanzi
 * — per your "very hard for the child to learn if the pinyin is on a
 * separate paragraph" feedback, it's now rendered directly over each
 * character (ruby annotation, see rubyText.ts) instead, so there's no
 * separate `data-intro-meaning-pinyin` element to populate any more.
 */
function showIntroMeaning(index: number): void {
  const idiom = doorLevels[index].idiom;
  const zhEl = document.querySelector<HTMLElement>("[data-intro-meaning-zh]");
  const enEl = document.querySelector<HTMLElement>("[data-intro-meaning-en]");
  if (zhEl) renderRubyText(zhEl, idiom.meaningZh.hanzi, idiom.meaningZh.charPinyin);
  if (enEl) {
    enEl.textContent = `"${idiom.meaning}"`;
    enEl.classList.add("hidden");
  }
}

/** 2026-08-25 addition: names the idiom being practiced in this stage —
 * `#balloon-status` (balloonStatus.ts) handles the dynamic found/wrong
 * feedback below this, same relationship as `#meaning-prompt` and
 * `#door-status` have in the door stage. 2026-08-28: the idiom's hanzi
 * is now ruby-annotated inline (built from text nodes + a ruby span,
 * not one textContent string) rather than a plain "(pinyin)"
 * parenthetical, for the same per-character-alignment reason as
 * showIntroMeaning above. */
function showBalloonPrompt(index: number): void {
  const el = document.getElementById("balloon-prompt");
  if (!el) return;
  const idiom = balloonLevels[index].idiom;
  el.replaceChildren("Catch the balloon that uses ");
  const idiomSpan = document.createElement("span");
  renderRubyText(idiomSpan, idiom.hanzi, idiom.pinyin.split(" "));
  el.append(idiomSpan, " correctly!");
}

/**
 * 2026-08-28 addition: your "give a congratulations message and
 * reinforce the learning" feedback — shown right after a correct
 * balloon catch, gating the advance to the next idiom's intro (or the
 * session summary) behind a Continue tap rather than firing
 * immediately. Restates the idiom + the same meaning paraphrase the
 * level-intro card asked "which idiom means...?" with (closing that
 * loop) and the correct-usage sentence just caught — all
 * already-approved content, nothing new to write.
 *
 * 2026-08-28 (later): each hanzi line is now ruby-annotated (pinyin
 * per character, see rubyText.ts) instead of pairing with its own
 * separate pinyin paragraph below it — the `data-success-*-pinyin`
 * elements this used to populate are gone from the markup.
 */
function showBalloonSuccessCard(index: number, onContinue: () => void): void {
  const idiom = balloonLevels[index].idiom;
  const card = document.getElementById("balloon-success-card");
  if (!card) {
    onContinue();
    return;
  }

  const ruby = (selector: string, hanzi: string, charPinyin: string[]): void => {
    const el = card.querySelector<HTMLElement>(selector);
    if (el) renderRubyText(el, hanzi, charPinyin);
  };
  ruby("[data-success-hanzi]", idiom.hanzi, idiom.pinyin.split(" "));
  ruby("[data-success-meaning-zh]", idiom.meaningZh.hanzi, idiom.meaningZh.charPinyin);
  ruby("[data-success-sentence]", idiom.exampleSentence.hanzi, idiom.exampleSentence.charPinyin);
  card.classList.add("visible");

  const continueBtn = document.getElementById("balloon-continue-btn");
  const onClick = (): void => {
    card.classList.remove("visible");
    continueBtn?.removeEventListener("click", onClick);
    onContinue();
  };
  continueBtn?.addEventListener("click", onClick);
}

function showSummary(completedHanzi: string[]): void {
  const card = document.getElementById("session-summary-card");
  if (!card) return;
  card.querySelector<HTMLElement>("[data-summary-list]")!.textContent = completedHanzi.join(" · ");
  card.classList.add("visible");
}

/** Toggles which stage's DOM chrome (prompt/status chip) is visible —
 * the match warm-up, door puzzle, and balloon stage all share this one
 * page/canvas rather than being separate HTML files. The match and
 * balloon stages have no on-screen movement controls to toggle
 * (2026-08-26: dragging the avatar directly replaced the on-screen
 * d-pad for the balloon stage, handled entirely inside
 * BalloonSentenceScene via Phaser's own pointer input; the match
 * stage never had any — its interaction is tapping tiles directly). */
function showDoorStageUI(): void {
  document.getElementById("catch-ui-layer")?.classList.remove("stage-hidden");
  document.getElementById("controls-layer")?.classList.remove("stage-hidden");
  document.getElementById("balloon-ui-layer")?.classList.add("stage-hidden");
  document.getElementById("match-ui-layer")?.classList.add("stage-hidden");
}

function showBalloonStageUI(): void {
  document.getElementById("catch-ui-layer")?.classList.add("stage-hidden");
  document.getElementById("controls-layer")?.classList.add("stage-hidden");
  document.getElementById("balloon-ui-layer")?.classList.remove("stage-hidden");
  document.getElementById("match-ui-layer")?.classList.add("stage-hidden");
}

function showMatchStageUI(): void {
  document.getElementById("catch-ui-layer")?.classList.add("stage-hidden");
  document.getElementById("controls-layer")?.classList.add("stage-hidden");
  document.getElementById("balloon-ui-layer")?.classList.add("stage-hidden");
  document.getElementById("match-ui-layer")?.classList.remove("stage-hidden");
}

function bootstrap(): void {
  // Chains all 3 currently-defined levels, then stops with a warm
  // summary — same "3 idioms, then a soft stop" bounded pacing as the
  // existing session design (SNIPPET_PLANS.md's Snippet 5), per your
  // 2026-08-22 decision to keep that intact while this new mechanic is
  // being tried out.
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
  game.scene.add("IdiomMatchScene", IdiomMatchScene, false);
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
  const stopGameplayScene = (key: "IdiomDoorScene" | "BalloonSentenceScene" | "IdiomMatchScene"): void => {
    setTimeout(() => {
      if (game.scene.isActive(key)) game.scene.stop(key);
    }, 0);
  };

  // The match warm-up runs first, before any door level — its own UI
  // layer is the one that should be showing underneath the match-intro
  // overlay the moment this page loads (see showMatchIntro/
  // beginMatchStage below), same "underlying stage UI is already
  // correct before its intro overlay is dismissed" pattern
  // startLevelWithIntro/beginLevel use for every door level after it.
  showMatchStageUI();

  // 2026-08-24: a one-time warm-up before the very first idiom's
  // intro — splits each of this session's idioms into two tiles (its
  // first two characters, its last two), laid out in two columns, and
  // has the child drag a line from one half to its partner to join
  // them back together — a gentler on-ramp than the door puzzle's
  // ordered, per-character precision. Runs once per session, on the
  // whole idiom set at once, not per idiom like the door/balloon
  // stages that follow it.
  const beginMatchStage = (): void => {
    showMatchStageUI();
    game.scene.start("IdiomMatchScene", {
      level: matchLevel,
      onComplete: afterMatchStage,
    });
  };

  const afterMatchStage = (): void => {
    stopGameplayScene("IdiomMatchScene");
    document.getElementById("match-ui-layer")?.classList.add("stage-hidden");
    startLevelWithIntro(0);
  };

  const showMatchIntro = (onStart: () => void): void => {
    const card = document.getElementById("match-intro-card");
    card?.classList.add("visible");
    const startBtn = document.getElementById("start-match-btn");
    const onClick = (): void => {
      card?.classList.remove("visible");
      startBtn?.removeEventListener("click", onClick);
      onStart();
    };
    startBtn?.addEventListener("click", onClick);
  };

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

  // Split in two per the 2026-08-28 success-card addition: the moment
  // the catch resolves, we still want to immediately stop the scene and
  // hide this stage's own chrome (same "leave the stage the instant we
  // know we're leaving it" lesson as handleDoorReached below), but
  // actually *advancing* to the next idiom now waits on the child
  // tapping Continue on the success card rather than firing right away.

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
    // Updates the "1/3, 2/3, ..." corner badge the moment this idiom
    // becomes current — covers its intro, door, and balloon stages all
    // at once, since all three share the same session index.
    updateSessionProgress(index, doorLevels.length);
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
    // otherwise its prompt/status text kept showing behind the success
    // card until Continue was pressed.
    document.getElementById("balloon-ui-layer")?.classList.add("stage-hidden");
    showBalloonSuccessCard(finishedIndex, () => advanceAfterBalloonStage(finishedIndex));
  };

  // The part of "finishing a balloon stage" that used to fire
  // immediately now waits behind the success card's Continue tap (see
  // showBalloonSuccessCard/afterBalloonStage above) — advances the
  // session index and moves on to the next idiom's intro, or the
  // session summary if this was the last one.
  const advanceAfterBalloonStage = (finishedIndex: number): void => {
    completedHanzi.push(doorLevels[finishedIndex].idiom.hanzi);
    const next = finishedIndex + 1;
    if (next < doorLevels.length) {
      startLevelWithIntro(next);
    } else {
      // currentIndex === total is updateSessionProgress's "fully
      // complete" signal — every dot done, none marked current.
      updateSessionProgress(doorLevels.length, doorLevels.length);
      showSummary(completedHanzi);
    }
  };

  // The session opens with the match warm-up (once), not straight into
  // the first door level — startLevelWithIntro(0) only runs afterward,
  // from afterMatchStage above. "Play again" (below) skips back past
  // this and goes straight to level 0's intro — the warm-up is a
  // once-per-session on-ramp, not something worth replaying every time
  // a child replays the same 3 idioms.
  showMatchIntro(() => beginMatchStage());

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
    startLevelWithIntro(0);
  });
}

bootstrap();
