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
 * BACKLOG.md): the question panel above the board, read aloud part by
 * part as ①②③ are eaten, and the answer room run in the same canvas
 * while the main board waits frozen underneath.
 */

const ROOM_SCENE_KEY = "AnswerRoomScene";

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

export function createQuestionFlowPage(game: Phaser.Game, snakeScene: () => SnakeGameScene | null): QuestionFlowPage {
  game.scene.add(ROOM_SCENE_KEY, AnswerRoomScene, false);
  const roomScene = (): AnswerRoomScene | null => game.scene.getScene(ROOM_SCENE_KEY) as AnswerRoomScene | null;
  const rng = createRng(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  const countdownEl = document.getElementById("countdown");
  const setCountdown = (value: number | null): void => {
    if (countdownEl) countdownEl.textContent = value === null ? "" : String(value);
  };

  let questionId = "";
  let steps: RoomStep[] = [];
  /** How much of the sentence is eaten — kept across a trip to reread; back to 0 after a wrong choice. */
  let stepIndex = 0;
  let inRoom = false;

  const content = () => answerRoomContent[questionId];

  const renderParts = (revealed: number): void => {
    const container = document.querySelector("#room-panel [data-question-parts]");
    const parts = content()?.questionParts ?? [];
    container?.replaceChildren(
      ...parts.slice(0, revealed).map((part, i) => {
        const p = document.createElement("p");
        const number = document.createElement("span");
        number.className = "part-number";
        number.textContent = String(i + 1);
        p.append(number, part);
        return p;
      }),
    );
  };

  /** The panel in reading mode: the question parts so far (and the door hint once all three are in). */
  const showReading = (): void => {
    show("question-reading", true);
    show("room-ui", false);
    const title = document.getElementById("room-panel-title");
    if (title) title.textContent = "Question";
  };

  const leaveRoom = (outcome: "correct" | "not-yet"): void => {
    inRoom = false;
    game.scene.stop(ROOM_SCENE_KEY);
    if (outcome === "correct") {
      show("room-panel", false);
      questionId = "";
    } else {
      showReading();
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
    show("question-reading", false);
    show("room-ui", true);
    const title = document.getElementById("room-panel-title");
    if (title) title.textContent = "Build the answer";
    resetRoomUi();
    renderSentence(steps, stepIndex);
    const data: AnswerRoomSceneData = {
      steps,
      stepIndex,
      rng,
      onEvent: handleRoomEvent,
      onCountdown: setCountdown,
      onState: (snake, apples, finished) => updateRoomUi(snake, apples, finished, stepIndex),
      fit: { width: GRID_WIDTH * CELL_SIZE, height: GRID_HEIGHT * CELL_SIZE },
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
      renderParts(0);
      show("door-hint", false);
      showReading();
      show("room-panel", true);
      speak("Eat the numbered apples to read the question.");
    },
    onPartRevealed: (id, revealed) => {
      if (id !== questionId) return;
      renderParts(revealed);
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
      show("room-panel", false);
      setCountdown(null);
      hideCard("door-confirm-card");
      hideCard("wrong-choice-card");
    },
  };
}
