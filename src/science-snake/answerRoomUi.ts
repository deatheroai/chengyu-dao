import { isJoiningPhrase, type RoomApple, type RoomStep } from "./answerRoom";
import type { SnakeState } from "./snakeGrid";
import { speak } from "./voice";

/**
 * The answer room's panel above the board — the sentence building up,
 * the A/B box at the science choice, the "climb the ladder" hint — plus
 * its hidden test hooks. Shared by the prototype page (answerRoomMain.ts)
 * and the real game (main.ts), which both have elements with these ids.
 */

/**
 * The sentence so far, one chip per eaten step (joining words in
 * orange, the chosen science phrase in blue), then one faint dot per
 * step still to come so the child can see how far there is to go.
 */
export function renderSentence(steps: RoomStep[], stepIndex: number): void {
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
  // Where the sentence is one line that doesn't wrap (the main game's
  // bar), keep the newest word in view.
  const newest = chips[stepIndex - 1];
  if (newest) strip.scrollLeft = Math.max(0, newest.offsetLeft + newest.offsetWidth - strip.clientWidth + 48);
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

let lastChoiceSpoken = "";

/** Call on every room entry, so the A/B options are read out again if they reappear. */
export function resetRoomUi(): void {
  lastChoiceSpoken = "";
}

/** The room scene's `onState`: the A/B box (read out once as it appears), the ladder hint, and the hidden test hooks. */
export function updateRoomUi(snake: SnakeState, apples: RoomApple[], finished: boolean, stepIndex: number): void {
  renderChoice(apples);
  const options = apples.filter((a) => a.kind === "option");
  const choiceKey = options.map((a) => (a.kind === "option" ? `${a.label}:${a.text}` : "")).join("|");
  if (options.length && choiceKey !== lastChoiceSpoken) {
    lastChoiceSpoken = choiceKey;
    speak(options.map((a) => (a.kind === "option" ? `${a.label}. ${a.text}.` : "")).join(" "));
  }
  if (!options.length) lastChoiceSpoken = "";
  document.getElementById("room-hint")?.classList.toggle("hidden", !finished);

  const status = document.getElementById("room-status");
  if (status) {
    status.dataset.headX = String(snake.body[0].x);
    status.dataset.headY = String(snake.body[0].y);
    status.dataset.direction = snake.direction;
    status.dataset.step = String(stepIndex);
    status.dataset.finished = String(finished);
  }
  document.getElementById("room-apples")?.replaceChildren(
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
