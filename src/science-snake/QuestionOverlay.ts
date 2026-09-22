import type { ScienceQuestion } from "./types";
import { resolveAttempt } from "./answerGrading";
import { chunkWords, revealedText, isFullyRevealed, nextRevealedCount } from "./chunkWords";

export type QuestionOutcome = "correct" | "indigestion";

/**
 * Runs the two-try question flow for one eaten science item (BACKLOG.md's
 * "Phaser scene + DOM question overlay" entry) — plain DOM over the
 * Phaser canvas, same pattern `writingStage.ts` uses for anything
 * text-input-heavy, since there's no game physics here for a Scene to
 * usefully own. Calls `onResolved` exactly once: "correct" (either try),
 * or "indigestion" once a wrong-twice reveal has been fully stepped
 * through via its own Continue tap — the snake-growth/spawn/scoring
 * consequences of either outcome belong to whoever called this, not to
 * this file.
 */
export function askQuestion(question: ScienceQuestion, onResolved: (outcome: QuestionOutcome) => void): void {
  const overlay = document.getElementById("question-overlay");
  const iconEl = document.getElementById("question-icon");
  const promptEl = document.getElementById("question-prompt");
  const hintEl = document.getElementById("question-hint");
  const input = document.getElementById("question-input") as HTMLTextAreaElement | null;
  const submitBtn = document.getElementById("question-submit-btn");
  const askForm = document.getElementById("question-ask-form");
  const revealSection = document.getElementById("question-reveal");
  const revealTextEl = document.getElementById("question-reveal-text");
  const nextBtn = document.getElementById("question-reveal-next-btn");
  const continueBtn = document.getElementById("question-reveal-continue-btn");

  if (!overlay || !promptEl || !input || !submitBtn || !askForm || !revealSection || !revealTextEl || !nextBtn || !continueBtn) {
    // Shouldn't happen on the real page — falls back to an immediate,
    // ungraded "correct" rather than ever silently hanging the game on a
    // missing element.
    onResolved("correct");
    return;
  }

  if (iconEl) iconEl.textContent = question.icon;
  promptEl.textContent = question.prompt;
  if (hintEl) {
    hintEl.textContent = "";
    hintEl.classList.add("hidden");
  }
  input.value = "";
  askForm.classList.remove("hidden");
  revealSection.classList.add("hidden");
  overlay.classList.add("visible");

  let tryNumber: 1 | 2 = 1;
  let revealedCount = 0;
  let chunks: string[] = [];

  const renderReveal = (): void => {
    revealTextEl.textContent = revealedText(chunks, revealedCount);
    const done = isFullyRevealed(chunks, revealedCount);
    nextBtn.classList.toggle("hidden", done);
    continueBtn.classList.toggle("hidden", !done);
  };

  const cleanupListeners = (): void => {
    submitBtn.removeEventListener("click", onSubmitClick);
    nextBtn.removeEventListener("click", onNextClick);
    continueBtn.removeEventListener("click", onContinueClick);
  };

  const finish = (outcome: QuestionOutcome): void => {
    overlay.classList.remove("visible");
    cleanupListeners();
    onResolved(outcome);
  };

  function onSubmitClick(): void {
    const result = resolveAttempt(question, input!.value, tryNumber);
    if (result.outcome === "correct") {
      finish("correct");
      return;
    }
    if (result.outcome === "retry") {
      tryNumber = 2;
      input!.value = "";
      if (hintEl) {
        hintEl.textContent = question.hint;
        hintEl.classList.remove("hidden");
      }
      return;
    }
    // "reveal" — the second wrong try. Starts with the first chunk
    // already shown (not an empty screen requiring an extra tap just to
    // see anything), then each "Next →" tap reveals one more.
    chunks = chunkWords(question.modelAnswer);
    revealedCount = Math.min(1, chunks.length);
    askForm!.classList.add("hidden");
    revealSection!.classList.remove("hidden");
    renderReveal();
  }

  function onNextClick(): void {
    revealedCount = nextRevealedCount(chunks, revealedCount);
    renderReveal();
  }

  function onContinueClick(): void {
    finish("indigestion");
  }

  submitBtn.addEventListener("click", onSubmitClick);
  nextBtn.addEventListener("click", onNextClick);
  continueBtn.addEventListener("click", onContinueClick);
}
