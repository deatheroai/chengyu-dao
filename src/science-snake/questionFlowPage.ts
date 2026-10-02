import type Phaser from "phaser";
import type { Direction } from "./snakeGrid";
import { GRID_WIDTH, GRID_HEIGHT } from "./snakeGrid";
import { AnswerRoomScene, type AnswerRoomSceneData } from "./AnswerRoomScene";
import { CELL_SIZE, type QuestionFlowHooks, type SnakeGameScene } from "./SnakeGameScene";
import { buildSteps, type RoomEvent, type RoomStep } from "./answerRoom";
import { answerRoomContent } from "./answerRoomContent";
import { renderSentence, updateRoomUi, resetRoomUi } from "./answerRoomUi";
import { scienceQuestionsById } from "./scienceQuestions";
import { createRng } from "./seededRandom";
import { speak, chime } from "./voice";

/**
 * The page side of the redesign's question flow on the real game
 * (science-snake.html?answer=room, until it becomes the default —
 * BACKLOG.md): the slim question bar above the board (the question so
 * far scrolling across it, read aloud part by part as ①②③ are eaten),
 * and the answer room run in the same canvas while the main board waits
 * frozen underneath.
 */

const ROOM_SCENE_KEY = "AnswerRoomScene";
/** Entering the answer room the countdown runs a little slower than usual — the whole question is up in the middle to reread. */
const ROOM_INTRO_STEP_MS = 1000;

function show(id: string, visible: boolean): void {
  document.getElementById(id)?.classList.toggle("hidden", !visible);
}

function showCard(id: string): void {
  document.getElementById(id)?.classList.add("visible");
}

function hideCard(id: string): void {
  document.getElementById(id)?.classList.remove("visible");
}

export interface QuestionFlowPage {
  hooks: QuestionFlowHooks;
  /** Where the joystick and keys should steer right now — the room while it's open, otherwise the main board. */
  steer: (direction: Direction) => void;
  setJoystickHeld: (held: boolean) => void;
  /** A fresh run: panel hidden, no room open. */
  reset: () => void;
}

/** The ticker's speed in CSS pixels per second — slow enough to read along with. */
const MARQUEE_PX_PER_SECOND = 45;

export function createQuestionFlowPage(game: Phaser.Game, snakeScene: () => SnakeGameScene | null): QuestionFlowPage {
  game.scene.add(ROOM_SCENE_KEY, AnswerRoomScene, false);
  const roomScene = (): AnswerRoomScene | null => game.scene.getScene(ROOM_SCENE_KEY) as AnswerRoomScene | null;
  const rng = createRng(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  const countdownEl = document.getElementById("countdown");
  const setCountdown = (value: number | null): void => {
    if (countdownEl) countdownEl.textContent = value === null ? "" : String(value);
  };
  const panel = document.getElementById("room-panel");
  const title = document.getElementById("room-panel-title");
  const marquee = document.getElementById("question-marquee");
  const marqueeText = document.getElementById("question-marquee-text");

  let questionId = "";
  let steps: RoomStep[] = [];
  /** How much of the sentence is eaten — kept across a trip to reread; back to 0 after a wrong choice. */
  let stepIndex = 0;
  let inRoom = false;

  const content = () => answerRoomContent[questionId];

  const setTitle = (text: string): void => {
    if (title) title.textContent = text;
  };

  /**
   * The bar's text line. `scroll` runs it as a slow repeating ticker,
   * timed from the text's own width so it always moves at the same
   * speed; otherwise it sits still (short instructions).
   */
  const setMarquee = (text: string, scroll: boolean): void => {
    if (!marquee || !marqueeText) return;
    marqueeText.textContent = text;
    marquee.classList.toggle("static", !scroll);
    if (!scroll) return;
    // Restart from the right edge each time the text changes.
    marqueeText.style.animation = "none";
    void marqueeText.offsetWidth;
    marqueeText.style.animation = "";
    const seconds = Math.max(8, marqueeText.scrollWidth / MARQUEE_PX_PER_SECOND);
    marqueeText.style.setProperty("--marquee-duration", `${seconds}s`);
  };

  const showMode = (mode: "idle" | "reading" | "room"): void => {
    if (panel) panel.dataset.mode = mode;
    show("question-reading", mode !== "room");
    show("room-ui", mode === "room");
  };

  const showIdle = (): void => {
    showMode("idle");
    setTitle("Science Snake");
    for (const el of document.querySelectorAll("[data-question-icon]")) el.textContent = "🔬";
    setMarquee("Eat a science item 🔬 to get a question!", false);
    show("door-hint", false);
  };

  /** The bar in reading mode: the question parts eaten so far, scrolling (and the door hint once all three are in). */
  const showReading = (revealed: number, doorOpen: boolean): void => {
    showMode("reading");
    setTitle("Question");
    const parts = content()?.questionParts ?? [];
    if (revealed === 0) setMarquee("Eat the numbered apples ① ② ③ to read the question.", false);
    else setMarquee(parts.slice(0, revealed).join("   "), true);
    show("door-hint", doorOpen);
  };

  /** The whole question in the middle of the board, with a small countdown badge — shown while the room counts down. */
  const showIntro = (count: number | null): void => {
    const intro = document.getElementById("room-intro");
    if (!intro) return;
    intro.classList.toggle("hidden", count === null);
    const badge = document.getElementById("room-intro-count");
    if (badge) badge.textContent = count === null ? "" : String(count);
    if (count === null) return;
    intro.querySelector("[data-question-parts]")?.replaceChildren(
      ...(content()?.questionParts ?? []).map((part, i) => {
        const p = document.createElement("p");
        const number = document.createElement("span");
        number.className = "part-number";
        number.textContent = String(i + 1);
        p.append(number, part);
        return p;
      }),
    );
  };

  const leaveRoom = (outcome: "correct" | "not-yet"): void => {
    inRoom = false;
    game.scene.stop(ROOM_SCENE_KEY);
    showIntro(null);
    if (outcome === "correct") {
      questionId = "";
      showIdle();
    } else {
      showReading(content()?.questionParts.length ?? 0, true);
    }
    snakeScene()?.returnFromRoom(outcome, setCountdown);
  };

  const handleRoomEvent = (event: RoomEvent, newStepIndex: number): void => {
    if (event.kind === "ate-word" || event.kind === "chose-right") {
      stepIndex = newStepIndex;
      chime();
      renderSentence(steps, stepIndex);
      if (stepIndex === steps.length) speak(content()?.phrases.join(" ") ?? "");
    } else if (event.kind === "chose-wrong") {
      chime(true);
      stepIndex = 0;
      renderSentence(steps, stepIndex);
      showCard("wrong-choice-card");
    } else if (event.kind === "question-door") {
      showCard("door-confirm-card");
    } else if (event.kind === "exited") {
      leaveRoom("correct");
    }
  };

  const enterRoom = (): void => {
    inRoom = true;
    hideCard("door-confirm-card");
    // The bar switches to building mode straight away; the whole
    // question sits in the middle of the board during the countdown
    // (per "have the question right in the middle as focus whilst the
    // countdown timer is smaller near it").
    showMode("room");
    setTitle("Build the answer");
    resetRoomUi();
    renderSentence(steps, stepIndex);
    const data: AnswerRoomSceneData = {
      steps,
      stepIndex,
      rng,
      onEvent: handleRoomEvent,
      onCountdown: showIntro,
      onState: (snake, apples, finished) => {
        updateRoomUi(snake, apples, finished, stepIndex);
        if (!finished) setTitle(apples.some((a) => a.kind === "option") ? "✋ Hold the joystick to move" : "Build the answer");
      },
      fit: { width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE },
      countdownStepMs: ROOM_INTRO_STEP_MS,
    };
    game.scene.start(ROOM_SCENE_KEY, data);
    game.scene.bringToTop(ROOM_SCENE_KEY);
  };

  document.getElementById("door-reread-btn")?.addEventListener("click", () => {
    hideCard("door-confirm-card");
    leaveRoom("not-yet");
  });
  document.getElementById("door-stay-btn")?.addEventListener("click", enterRoom);
  document.getElementById("wrong-choice-btn")?.addEventListener("click", () => {
    hideCard("wrong-choice-card");
    leaveRoom("not-yet");
  });
  document.getElementById("read-question-btn")?.addEventListener("click", () => speak(content()?.questionParts.join(" ") ?? ""));

  const hooks: QuestionFlowHooks = {
    onQuestionStart: (id) => {
      questionId = id;
      steps = content() ? buildSteps(content()) : [];
      stepIndex = 0;
      for (const el of document.querySelectorAll("[data-question-icon]")) el.textContent = scienceQuestionsById[id]?.icon ?? "❓";
      showReading(0, false);
      speak("Eat the numbered apples to read the question.");
    },
    onPartRevealed: (id, revealed) => {
      if (id !== questionId) return;
      showReading(revealed, false);
      chime();
      speak(content()?.questionParts[revealed - 1] ?? "");
    },
    onDoorOpen: () => show("door-hint", true),
    onEnterRoom: () => enterRoom(),
  };

  return {
    hooks,
    steer: (direction) => (inRoom ? roomScene()?.requestDirection(direction) : snakeScene()?.requestDirection(direction)),
    setJoystickHeld: (held) => {
      if (inRoom) roomScene()?.setJoystickHeld(held);
    },
    reset: () => {
      inRoom = false;
      questionId = "";
      if (game.scene.isActive(ROOM_SCENE_KEY)) game.scene.stop(ROOM_SCENE_KEY);
      showIntro(null);
      show("room-panel", true);
      showIdle();
      setCountdown(null);
      hideCard("door-confirm-card");
      hideCard("wrong-choice-card");
    },
  };
}
