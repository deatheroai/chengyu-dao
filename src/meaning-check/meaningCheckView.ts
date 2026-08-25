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

/**
 * Renders Snippet 3's meaning + application-check card against a fixed
 * DOM structure (see meaning-check.html / session.html), for whichever
 * idiom the caller passes to `start()` — it never picks an idiom itself.
 * Extracted from the original Snippet 3 standalone page (`main.ts`) so
 * Snippet 5's session flow can reuse the exact same mechanic per idiom,
 * with the caller (standalone page vs. session) deciding what happens
 * after "Next" instead of this class assuming "pick another random one."
 */
export class MeaningCheckController {
  private readonly pool: IdiomContent[];
  private round!: RoundState;
  private onAdvance: () => void = () => {};

  constructor(pool: IdiomContent[]) {
    this.pool = pool;
    document.getElementById("next-btn")?.addEventListener("click", () => {
      if (!this.round?.lockedIn) return;
      this.onAdvance();
    });
  }

  /** Renders a fresh round for `idiom`. `onAdvance` fires once when the
   * user clicks "Next" after the round resolves (correct or revealed). */
  start(idiom: IdiomContent, onAdvance: () => void): void {
    this.round = {
      idiom,
      options: buildApplicationCheck(idiom, this.pool),
      attempts: 0,
      status: "choosing",
      triedWrongIndices: new Set(),
      lockedIn: false,
    };
    this.onAdvance = onAdvance;
    this.updateStatusDom();
    this.render();
  }

  private updateStatusDom(): void {
    const el = document.getElementById("check-status");
    if (!el) return;
    el.setAttribute("data-status", this.round.status);
    el.setAttribute("data-attempts", String(this.round.attempts));

    if (this.round.status === "correct") {
      el.textContent = "That's it! 🎉";
    } else if (this.round.status === "revealed") {
      el.textContent = "Here's the one that fits:";
    } else if (this.round.status === "wrong-try-again") {
      el.textContent = "Hmm, let's look again!";
    } else {
      el.textContent = "";
    }
  }

  private handleOptionClick(index: number): void {
    if (this.round.lockedIn) return;

    const option = this.round.options[index];
    const result = evaluateAttempt(option.isCorrect, this.round.attempts);
    this.round.attempts = result.attempts;

    // Every wrong pick gets marked, including the one that triggers a
    // "revealed" outcome (it's still a wrong pick, just the terminal one) -
    // otherwise the last wrong option silently reads as "locked" instead
    // of "wrong" once the round resolves.
    if (!option.isCorrect) {
      this.round.triedWrongIndices.add(index);
    }

    if (result.status === "correct" || result.status === "revealed") {
      this.round.status = result.status;
      this.round.lockedIn = true;
    } else {
      this.round.status = "wrong-try-again";
    }

    this.updateStatusDom();
    this.render();
  }

  private optionState(option: ApplicationCheckOption, index: number): "idle" | "wrong" | "correct" | "locked" {
    if (this.round.lockedIn) {
      if (option.isCorrect) return "correct";
      return this.round.triedWrongIndices.has(index) ? "wrong" : "locked";
    }
    return this.round.triedWrongIndices.has(index) ? "wrong" : "idle";
  }

  private render(): void {
    const hanziEl = document.getElementById("idiom-hanzi");
    const pinyinEl = document.getElementById("idiom-pinyin");
    const meaningEl = document.getElementById("idiom-meaning");
    const promptEl = document.getElementById("prompt-idiom");
    if (hanziEl) hanziEl.textContent = this.round.idiom.hanzi;
    if (pinyinEl) pinyinEl.textContent = this.round.idiom.pinyin;
    if (meaningEl) meaningEl.textContent = this.round.idiom.meaning;
    if (promptEl) promptEl.textContent = this.round.idiom.hanzi;

    const optionsContainer = document.getElementById("options");
    if (optionsContainer) {
      optionsContainer.innerHTML = "";
      this.round.options.forEach((option, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option";

        const hanziSpan = document.createElement("span");
        hanziSpan.className = "option-hanzi";
        hanziSpan.lang = "zh-Hans";
        hanziSpan.textContent = option.hanzi;

        const pinyinSpan = document.createElement("span");
        pinyinSpan.className = "option-pinyin";
        pinyinSpan.textContent = option.pinyin;

        btn.appendChild(hanziSpan);
        btn.appendChild(pinyinSpan);
        btn.dataset.index = String(index);
        btn.dataset.state = this.optionState(option, index);
        // Test-only hook (not styled on, not a visual cue) so E2E coverage
        // can deterministically exercise the retry/reveal paths without
        // guessing at shuffle order. Revisit before any real production
        // hardening pass if this stops being a validation prototype.
        btn.dataset.correct = String(option.isCorrect);
        btn.disabled = this.round.lockedIn;
        btn.addEventListener("click", () => this.handleOptionClick(index));
        optionsContainer.appendChild(btn);
      });
    }

    const explanationEl = document.getElementById("explanation");
    const nextBtn = document.getElementById("next-btn");
    if (explanationEl && nextBtn) {
      if (this.round.lockedIn) {
        explanationEl.textContent = this.round.idiom.dailyLifeScenario;
        explanationEl.classList.remove("hidden");
        nextBtn.classList.remove("hidden");
      } else {
        explanationEl.classList.add("hidden");
        nextBtn.classList.add("hidden");
      }
    }
  }
}
