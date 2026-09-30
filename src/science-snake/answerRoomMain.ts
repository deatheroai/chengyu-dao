import Phaser from "phaser";
import { AnswerRoomScene, ROOM_CELL_SIZE, type AnswerRoomSceneData } from "./AnswerRoomScene";
import { buildSteps, isJoiningPhrase, ROOM_WIDTH, ROOM_HEIGHT, type RoomApple, type RoomEvent, type RoomStep } from "./answerRoom";
import { answerRoomContent } from "./answerRoomContent";
import { createRng } from "./seededRandom";
import { scienceQuestionsById } from "./scienceQuestions";
import { wireJoystick } from "./joystickControl";
import { speak, chime, isMuted, setMuted } from "./voice";
import type { SnakeState } from "./snakeGrid";

/**
 * Entry point for the answer-room prototype page (answer-room.html):
 * every question's answer room, one at a time, and cards standing in
 * for the parts of the real game that aren't built yet — dying on a
 * wrong choice and going back, or going back to reread.
 *
 * `?q=<question id>` picks the first question (otherwise a random one),
 * and `?seed=N` fixes where apples land and which of A/B is right (both
 * used by the e2e test).
 */

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed"));
const rng = createRng(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : Date.now());

const questionIds = Object.keys(answerRoomContent);
const requestedId = params.get("q");
let questionIndex = requestedId && questionIds.includes(requestedId) ? questionIds.indexOf(requestedId) : Math.floor(rng() * questionIds.length);
let content = answerRoomContent[questionIds[questionIndex]];
let steps: RoomStep[] = buildSteps(content);
/** How much of the sentence is eaten. Kept across a trip through the QUESTION door; back to 0 after a wrong choice. */
let stepIndex = 0;

function showCard(id: string): void {
  document.getElementById(id)?.classList.add("visible");
}

function hideCards(): void {
  for (const el of document.querySelectorAll(".card-layer")) el.classList.remove("visible");
}

function fullSentence(): string {
  return content.phrases.join(" ");
}

/** The question's own icon, in the panel title and on the cards. */
function renderQuestionIcon(): void {
  const icon = scienceQuestionsById[questionIds[questionIndex]]?.icon ?? "❓";
  for (const el of document.querySelectorAll("[data-question-icon]")) el.textContent = icon;
}

function renderQuestionParts(): void {
  for (const container of document.querySelectorAll("[data-question-parts]")) {
    container.replaceChildren(
      ...content.questionParts.map((part, i) => {
        const p = document.createElement("p");
        const number = document.createElement("span");
        number.className = "part-number";
        number.textContent = String(i + 1);
        p.append(number, part);
        return p;
      }),
    );
  }
}

/**
 * The sentence so far, one chip per eaten step (joining words in
 * orange, the chosen science phrase in blue), then one faint dot per
 * step still to come so the child can see how far there is to go.
 */
function renderSentence(): void {
  const strip = document.getElementById("sentence-strip");
  if (!strip) return;
  const chips = steps.map((step, i) => {
    const chip = document.createElement("span");
    if (i >= stepIndex) {
      chip.className = "word-chip upcoming";
      chip.textContent = "•";
      return chip;
    }
    chip.className = "word-chip";
    if (step.kind === "choice") {
      chip.classList.add("chosen");
      chip.textContent = step.correct;
    } else {
      if (isJoiningPhrase(step.text)) chip.classList.add("joining");
      chip.textContent = step.text;
    }
    if (i === stepIndex - 1) chip.classList.add("just-eaten");
    return chip;
  });
  strip.replaceChildren(...chips);
}

/** The A/B box: only there while the two blue apples are on the board. */
function renderChoice(apples: RoomApple[]): void {
  const box = document.getElementById("choice-box");
  if (!box) return;
  const options = apples.filter((a) => a.kind === "option");
  box.classList.toggle("hidden", options.length === 0);
  const holdHint = document.createElement("p");
  holdHint.className = "choice-hold-hint";
  holdHint.textContent = "✋ Hold the joystick to move. Let go to stop and think.";
  box.replaceChildren(
    holdHint,
    ...options.map((option) => {
      const row = document.createElement("p");
      row.className = "choice-row";
      const badge = document.createElement("span");
      badge.className = "choice-badge";
      badge.textContent = option.kind === "option" ? option.label : "";
      row.append(badge, option.kind === "option" ? option.text : "");
      return row;
    }),
  );
}

let lastChoiceShown = "";

function updateStatus(snake: SnakeState, apples: RoomApple[], finished: boolean): void {
  renderChoice(apples);
  // Read the two options out once, the moment they appear.
  const choiceKey = apples.map((a) => (a.kind === "option" ? `${a.label}:${a.text}` : "")).join("|");
  if (apples.some((a) => a.kind === "option") && choiceKey !== lastChoiceShown) {
    lastChoiceShown = choiceKey;
    speak(apples.map((a) => (a.kind === "option" ? `${a.label}. ${a.text}.` : "")).join(" "));
  }
  if (!apples.some((a) => a.kind === "option")) lastChoiceShown = "";
  document.getElementById("room-hint")?.classList.toggle("hidden", !finished);

  const status = document.getElementById("room-status");
  if (status) {
    status.dataset.headX = String(snake.body[0].x);
    status.dataset.headY = String(snake.body[0].y);
    status.dataset.direction = snake.direction;
    status.dataset.step = String(stepIndex);
    status.dataset.finished = String(finished);
  }
  const container = document.getElementById("room-apples");
  container?.replaceChildren(
    ...apples.map((apple) => {
      const span = document.createElement("span");
      span.dataset.x = String(apple.position.x);
      span.dataset.y = String(apple.position.y);
      span.dataset.kind = apple.kind;
      if (apple.kind === "option") span.dataset.correct = String(apple.correct);
      return span;
    }),
  );
}

function handleRoomEvent(event: RoomEvent, newStepIndex: number): void {
  if (event.kind === "ate-word" || event.kind === "chose-right") {
    stepIndex = newStepIndex;
    chime();
    renderSentence();
    if (stepIndex === steps.length) speak(fullSentence());
  } else if (event.kind === "chose-wrong") {
    chime(true);
    stepIndex = 0;
    renderSentence();
    showCard("thrown-out-card");
  } else if (event.kind === "question-door") {
    showCard("question-card");
  } else if (event.kind === "exited") {
    const sentenceEl = document.getElementById("complete-sentence");
    if (sentenceEl) sentenceEl.textContent = fullSentence();
    showCard("complete-card");
  }
}

function bootstrap(): void {
  // The panel above the board is filled in before Phaser measures its
  // space, and a ResizeObserver re-fits the board whenever the panel's
  // height changes (the sentence can wrap onto a new line, the A/B box
  // comes and goes) — otherwise the board keeps its first size and
  // slides under the panel or the joystick.
  renderQuestionIcon();
  renderQuestionParts();
  renderSentence();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#fdf8ec",
    width: ROOM_WIDTH * ROOM_CELL_SIZE,
    height: ROOM_HEIGHT * ROOM_CELL_SIZE,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [],
  });
  game.scene.add("AnswerRoomScene", AnswerRoomScene, false);
  const scene = (): AnswerRoomScene | null => game.scene.getScene("AnswerRoomScene") as AnswerRoomScene | null;

  const countdownEl = document.getElementById("countdown");

  const enterRoom = (): void => {
    hideCards();
    if (game.scene.isActive("AnswerRoomScene")) game.scene.stop("AnswerRoomScene");
    lastChoiceShown = "";
    const data: AnswerRoomSceneData = {
      steps,
      stepIndex,
      rng,
      onEvent: handleRoomEvent,
      onCountdown: (value) => {
        if (countdownEl) countdownEl.textContent = value === null ? "" : String(value);
      },
      onState: updateStatus,
    };
    game.scene.start("AnswerRoomScene", data);
    renderSentence();
  };

  const container = document.getElementById("game-container");
  // refresh() alone reuses the parent size Phaser measured last time;
  // getParentBounds() re-reads it first, same as Phaser's own
  // fullscreen handlers do. Without it the board kept its first size
  // and slid over the A/B box whenever that appeared (found on a phone
  // with the whale question, whose choice is the very first step).
  if (container) {
    new ResizeObserver(() => {
      game.scale.getParentBounds();
      game.scale.refresh();
    }).observe(container);
  }

  const readQuestion = (): void => speak(content.questionParts.join(" "));

  document.getElementById("start-btn")?.addEventListener("click", () => {
    // This tap also unlocks speech on iOS for the rest of the visit.
    readQuestion();
    enterRoom();
  });
  document.getElementById("back-in-btn")?.addEventListener("click", enterRoom);
  document.getElementById("retry-btn")?.addEventListener("click", enterRoom);
  document.getElementById("read-question-btn")?.addEventListener("click", readQuestion);
  document.getElementById("hear-again-btn")?.addEventListener("click", () => speak(fullSentence()));
  document.getElementById("play-again-btn")?.addEventListener("click", () => {
    stepIndex = 0;
    enterRoom();
  });
  // Moves on to the next question: shows its start card (the question
  // read aloud again) rather than dropping straight into the room.
  document.getElementById("next-question-btn")?.addEventListener("click", () => {
    questionIndex = (questionIndex + 1) % questionIds.length;
    content = answerRoomContent[questionIds[questionIndex]];
    steps = buildSteps(content);
    stepIndex = 0;
    renderQuestionIcon();
    renderQuestionParts();
    renderSentence();
    hideCards();
    showCard("start-card");
  });

  const muteBtn = document.getElementById("mute-btn");
  muteBtn?.addEventListener("click", () => {
    setMuted(!isMuted());
    muteBtn.textContent = isMuted() ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-label", isMuted() ? "Sound off" : "Sound on");
  });

  const joystick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  if (joystick && knob) {
    wireJoystick(
      joystick,
      knob,
      (direction) => scene()?.requestDirection(direction),
      (held) => scene()?.setJoystickHeld(held),
    );
  }
}

bootstrap();
