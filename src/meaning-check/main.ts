import { idioms } from "../idioms/idioms";
import { buildApplicationCheck } from "./applicationCheck";
import type { ApplicationCheckOption } from "./applicationCheck";
import { evaluateAttempt } from "./attemptState";
import type { AttemptStatus } from "./attemptState";
import type { IdiomContent } from "../idioms/types";

interface RoundState {
  idiom: IdiomContent;
  options: ApplicationCheckOption[];
  attempts: number;
  status: AttemptStatus | "choosing";
  triedWrongIndices: Set<number>;
  lockedIn: boolean;
}

let round: RoundState;

function pickRandomIdiom(exclude?: IdiomContent): IdiomContent {
  if (idioms.length === 1) return idioms[0];
  let next = idioms[Math.floor(Math.random() * idioms.length)];
  while (exclude && next.id === exclude.id) {
    next = idioms[Math.floor(Math.random() * idioms.length)];
  }
  return next;
}

function startRound(exclude?: IdiomContent): void {
  const idiom = pickRandomIdiom(exclude);
  round = {
    idiom,
    options: buildApplicationCheck(idiom, idioms),
    attempts: 0,
    status: "choosing",
    triedWrongIndices: new Set(),
    lockedIn: false,
  };
  updateStatusDom();
  render();
}

function updateStatusDom(): void {
  const el = document.getElementById("check-status");
  if (!el) return;
  el.setAttribute("data-status", round.status);
  el.setAttribute("data-attempts", String(round.attempts));

  if (round.status === "correct") {
    el.textContent = "That's it! 🎉";
  } else if (round.status === "revealed") {
    el.textContent = "Here's the one that fits:";
  } else if (round.status === "wrong-try-again") {
    el.textContent = "Hmm, let's look again!";
  } else {
    el.textContent = "";
  }
}

function handleOptionClick(index: number): void {
  if (round.lockedIn) return;

  const option = round.options[index];
  const result = evaluateAttempt(option.isCorrect, round.attempts);
  round.attempts = result.attempts;

  // Every wrong pick gets marked, including the one that triggers a
  // "revealed" outcome (it's still a wrong pick, just the terminal one) -
  // otherwise the last wrong option silently reads as "locked" instead
  // of "wrong" once the round resolves.
  if (!option.isCorrect) {
    round.triedWrongIndices.add(index);
  }

  if (result.status === "correct" || result.status === "revealed") {
    round.status = result.status;
    round.lockedIn = true;
  } else {
    round.status = "wrong-try-again";
  }

  updateStatusDom();
  render();
}

function optionState(option: ApplicationCheckOption, index: number): "idle" | "wrong" | "correct" | "locked" {
  if (round.lockedIn) {
    if (option.isCorrect) return "correct";
    return round.triedWrongIndices.has(index) ? "wrong" : "locked";
  }
  return round.triedWrongIndices.has(index) ? "wrong" : "idle";
}

function render(): void {
  const hanziEl = document.getElementById("idiom-hanzi");
  const pinyinEl = document.getElementById("idiom-pinyin");
  const meaningEl = document.getElementById("idiom-meaning");
  const promptEl = document.getElementById("prompt-idiom");
  if (hanziEl) hanziEl.textContent = round.idiom.hanzi;
  if (pinyinEl) pinyinEl.textContent = round.idiom.pinyin;
  if (meaningEl) meaningEl.textContent = round.idiom.meaning;
  if (promptEl) promptEl.textContent = round.idiom.hanzi;

  const optionsContainer = document.getElementById("options");
  if (optionsContainer) {
    optionsContainer.innerHTML = "";
    round.options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.textContent = option.text;
      btn.dataset.index = String(index);
      btn.dataset.state = optionState(option, index);
      // Test-only hook (not styled on, not a visual cue) so E2E coverage
      // can deterministically exercise the retry/reveal paths without
      // guessing at shuffle order. Revisit before any real production
      // hardening pass if this stops being a validation prototype.
      btn.dataset.correct = String(option.isCorrect);
      btn.disabled = round.lockedIn;
      btn.addEventListener("click", () => handleOptionClick(index));
      optionsContainer.appendChild(btn);
    });
  }

  const explanationEl = document.getElementById("explanation");
  const nextBtn = document.getElementById("next-btn");
  if (explanationEl && nextBtn) {
    if (round.lockedIn) {
      explanationEl.textContent = round.idiom.dailyLifeScenario;
      explanationEl.classList.remove("hidden");
      nextBtn.classList.remove("hidden");
    } else {
      explanationEl.classList.add("hidden");
      nextBtn.classList.add("hidden");
    }
  }
}

function bootstrap(): void {
  startRound();
  document.getElementById("next-btn")?.addEventListener("click", () => startRound(round.idiom));
}

bootstrap();
