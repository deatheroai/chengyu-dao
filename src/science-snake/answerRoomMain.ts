import Phaser from "phaser";
import { AnswerRoomScene, ROOM_CELL_SIZE, type AnswerRoomSceneData } from "./AnswerRoomScene";
import { buildKey, isJoiningPhrase, isSpent, ROOM_WIDTH, ROOM_HEIGHT, type KeyEntry, type RoomApple, type RoomEvent } from "./answerRoom";
import { answerRoomContent } from "./answerRoomContent";
import { createRng } from "./seededRandom";
import { scienceQuestionsById } from "./scienceQuestions";
import { wireJoystick } from "./joystickControl";
import { speak, chime, isMuted, setMuted } from "./voice";
import type { SnakeState } from "./snakeGrid";

/**
 * Entry point for the answer-room prototype page (answer-room.html):
 * every question's answer room, one at a time, and cards standing
 * in for the parts of the real game that aren't built yet — being
 * thrown back to the main board, or going back to reread.
 *
 * `?q=<question id>` picks the first question (otherwise a random one),
 * and `?seed=N` fixes the key order and apple layout (both used by the
 * e2e test).
 */

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed"));
const rng = createRng(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : Date.now());

const questionIds = Object.keys(answerRoomContent);
const requestedId = params.get("q");
let questionIndex = requestedId && questionIds.includes(requestedId) ? questionIds.indexOf(requestedId) : Math.floor(rng() * questionIds.length);
let content = answerRoomContent[questionIds[questionIndex]];

let key: KeyEntry[] = buildKey(content, rng);
let placedCount = 0;

function showCard(id: string): void {
  document.getElementById(id)?.classList.add("visible");
}

function hideCards(): void {
  for (const el of document.querySelectorAll(".card-layer")) el.classList.remove("visible");
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

function renderPanel(): void {
  const slots = document.getElementById("sentence-slots");
  slots?.replaceChildren(
    ...content.phrases.map((phrase, i) => {
      const slot = document.createElement("span");
      slot.className = "slot";
      if (isJoiningPhrase(phrase)) slot.classList.add("joining");
      if (i < placedCount) {
        slot.classList.add("filled");
        slot.textContent = phrase;
      } else if (i === placedCount) {
        slot.classList.add("next");
      }
      return slot;
    }),
  );

  const keyEl = document.getElementById("phrase-key");
  keyEl?.replaceChildren(
    ...key.map((entry) => {
      const row = document.createElement("span");
      row.className = "key-entry";
      if (isSpent(entry, placedCount)) row.classList.add("used");
      const symbol = document.createElement("span");
      symbol.className = "key-symbol";
      symbol.style.color = entry.symbol.color;
      symbol.textContent = entry.symbol.glyph;
      row.append(symbol, entry.text);
      return row;
    }),
  );
}

function updateStatus(snake: SnakeState, apples: RoomApple[]): void {
  const status = document.getElementById("room-status");
  if (status) {
    status.dataset.headX = String(snake.body[0].x);
    status.dataset.headY = String(snake.body[0].y);
    status.dataset.direction = snake.direction;
    status.dataset.placed = String(placedCount);
  }
  const container = document.getElementById("room-apples");
  container?.replaceChildren(
    ...apples.map((apple) => {
      const span = document.createElement("span");
      span.dataset.x = String(apple.position.x);
      span.dataset.y = String(apple.position.y);
      span.dataset.phraseIndex = apple.phraseIndex === null ? "wrong" : String(apple.phraseIndex);
      return span;
    }),
  );
}

function fullSentence(): string {
  return content.phrases.join(" ");
}

function handleRoomEvent(event: RoomEvent): void {
  if (event.kind === "placed") {
    placedCount = event.placedCount;
    chime();
    renderPanel();
  } else if (event.kind === "complete") {
    placedCount = event.placedCount;
    renderPanel();
    const sentenceEl = document.getElementById("complete-sentence");
    if (sentenceEl) sentenceEl.textContent = fullSentence();
    showCard("complete-card");
    speak(fullSentence());
  } else if (event.kind === "thrown-out") {
    chime(true);
    const reasonEl = document.getElementById("thrown-out-reason");
    if (reasonEl) {
      reasonEl.textContent =
        event.reason === "wrong-phrase"
          ? "That phrase doesn't fit the science. Go through the ↩ Q door to reread the question if you need to."
          : "That piece doesn't come next. Look at the glowing slot: what goes there?";
    }
    showCard("thrown-out-card");
  } else if (event.kind === "question-door") {
    showCard("question-card");
  }
}

function bootstrap(): void {
  // The panel above the board is filled in before Phaser measures its
  // space, and a ResizeObserver re-fits the board whenever the panel's
  // height changes (a filled slot can wrap onto a new line) — otherwise
  // the board keeps its first size and slides under the panel or the
  // joystick.
  renderQuestionIcon();
  renderQuestionParts();
  renderPanel();

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
    const data: AnswerRoomSceneData = {
      key,
      placedCount,
      totalPhrases: content.phrases.length,
      rng,
      onEvent: handleRoomEvent,
      onCountdown: (value) => {
        if (countdownEl) countdownEl.textContent = value === null ? "" : String(value);
      },
      onState: updateStatus,
    };
    game.scene.start("AnswerRoomScene", data);
    renderPanel();
  };

  const container = document.getElementById("game-container");
  if (container) new ResizeObserver(() => game.scale.refresh()).observe(container);

  document.getElementById("start-btn")?.addEventListener("click", () => {
    // This tap also unlocks speech on iOS for the rest of the visit.
    speak(content.questionParts.join(" "));
    enterRoom();
  });
  document.getElementById("back-in-btn")?.addEventListener("click", enterRoom);
  document.getElementById("retry-btn")?.addEventListener("click", enterRoom);
  document.getElementById("read-question-btn")?.addEventListener("click", () => speak(content.questionParts.join(" ")));
  document.getElementById("hear-again-btn")?.addEventListener("click", () => speak(fullSentence()));
  document.getElementById("play-again-btn")?.addEventListener("click", () => {
    key = buildKey(content, rng);
    placedCount = 0;
    enterRoom();
  });
  // Moves on to the next question: shows its start card (the question
  // read aloud again) rather than dropping straight into the room.
  document.getElementById("next-question-btn")?.addEventListener("click", () => {
    questionIndex = (questionIndex + 1) % questionIds.length;
    content = answerRoomContent[questionIds[questionIndex]];
    key = buildKey(content, rng);
    placedCount = 0;
    renderQuestionIcon();
    renderQuestionParts();
    renderPanel();
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
  if (joystick && knob) wireJoystick(joystick, knob, (direction) => scene()?.requestDirection(direction));
}

bootstrap();
