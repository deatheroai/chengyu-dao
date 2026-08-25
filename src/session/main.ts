import Phaser from "phaser";
import { RevealScene } from "../idiom-reveal/RevealScene";
import { updateRevealStatus } from "../idiom-reveal/domStatus";
import { MeaningCheckController } from "../meaning-check/meaningCheckView";
import { idioms, idiomsById } from "../idioms/idioms";
import { createSession, completeReveal, completeMeaningCheck, currentIdiomId, pickSessionIdioms, SESSION_LENGTH } from "./sessionState";
import type { SessionState } from "./sessionState";
import { pickResurfaceIdiomId, recordCompletedSession, clearHistory, seedFakePriorSession } from "./sessionHistory";
import type { IdiomContent } from "../idioms/types";

function updateProgressDom(state: SessionState): void {
  const el = document.getElementById("session-progress");
  if (!el) return;
  el.setAttribute("data-phase", state.phase);
  el.setAttribute("data-index", String(state.currentIndex));
  el.setAttribute("data-discovered-count", String(state.discoveredIds.length));
  el.setAttribute("data-idiom-id", currentIdiomId(state));

  if (state.phase === "complete") {
    el.classList.add("hidden");
  } else {
    el.classList.remove("hidden");
    el.textContent = `Idiom ${state.currentIndex + 1} of ${SESSION_LENGTH}`;
  }
}

function showPhaseUI(phase: SessionState["phase"]): void {
  document.getElementById("reveal-phase")?.classList.toggle("hidden", phase !== "reveal");
  document.getElementById("meaning-check-phase")?.classList.toggle("hidden", phase !== "meaning-check");
  document.getElementById("summary-phase")?.classList.toggle("hidden", phase !== "complete");
}

function renderSummary(state: SessionState): void {
  const list = document.getElementById("summary-list");
  if (!list) return;
  list.innerHTML = "";
  for (const id of state.discoveredIds) {
    const idiom = idiomsById[id];
    const item = document.createElement("li");
    item.className = "summary-idiom";
    item.dataset.idiomId = id;

    const hanzi = document.createElement("div");
    hanzi.className = "summary-idiom-hanzi";
    hanzi.lang = "zh-Hans";
    hanzi.textContent = idiom.hanzi;

    const meaning = document.createElement("div");
    meaning.className = "summary-idiom-meaning";
    meaning.textContent = idiom.meaning;

    item.appendChild(hanzi);
    item.appendChild(meaning);
    list.appendChild(item);
  }
}

/** Renders the "Do you remember this one?" callback card. Deliberately
 * has no quiz/check attached — SNIPPET_PLANS.md calls for a "brief,
 * low-stakes callback," not a retest of the idiom just reintroduced by
 * the meaning-check mechanic. */
function renderResurfaceCard(idiom: IdiomContent): void {
  document.getElementById("resurface-phase")?.setAttribute("data-idiom-id", idiom.id);
  const hanziEl = document.getElementById("resurface-hanzi");
  const pinyinEl = document.getElementById("resurface-pinyin");
  const meaningEl = document.getElementById("resurface-meaning");
  if (hanziEl) hanziEl.textContent = idiom.hanzi;
  if (pinyinEl) pinyinEl.textContent = idiom.pinyin;
  if (meaningEl) meaningEl.textContent = idiom.meaning;
}

function wireDevControls(): void {
  document.getElementById("dev-seed-history-btn")?.addEventListener("click", () => {
    const randomIdiom = idioms[Math.floor(Math.random() * idioms.length)];
    seedFakePriorSession(randomIdiom.id);
    location.reload();
  });
  document.getElementById("dev-clear-history-btn")?.addEventListener("click", () => {
    clearHistory();
    location.reload();
  });
}

function bootstrap(): void {
  wireDevControls();

  const resurfaceId = pickResurfaceIdiomId();
  if (resurfaceId) {
    document.getElementById("resurface-phase")?.classList.remove("hidden");
    document.getElementById("reveal-phase")?.classList.add("hidden");
    renderResurfaceCard(idiomsById[resurfaceId]);
    document.getElementById("resurface-continue-btn")?.addEventListener(
      "click",
      () => {
        document.getElementById("resurface-phase")?.classList.add("hidden");
        // Exclude the just-resurfaced idiom from this sitting's "new" 3,
        // so nothing is shown twice back-to-back in the same visit.
        startSession(idioms.filter((idiom) => idiom.id !== resurfaceId));
      },
      { once: true },
    );
  } else {
    startSession(idioms);
  }
}

function startSession(pool: IdiomContent[]): void {
  let state = createSession(pickSessionIdioms(pool).map((idiom) => idiom.id));
  const meaningCheck = new MeaningCheckController(idioms);
  const continueBtn = document.getElementById("continue-btn");

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#fff3e2",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [RevealScene],
  };
  const game = new Phaser.Game(config);

  function startRevealPhase(idiom: IdiomContent): void {
    // Disables whatever zone the previous RevealScene run left behind
    // (if any) before asking Phaser to swap in a new one - see
    // disableCurrentRevealInput's doc comment for why this has to be
    // synchronous, right here, rather than left to the scene swap itself.
    disableCurrentRevealInput();
    showPhaseUI("reveal");
    updateProgressDom(state);
    updateRevealStatus(0, Array.from(idiom.hanzi).length, false);
    continueBtn?.classList.add("hidden");
    game.scene.start("RevealScene", {
      idiom,
      onComplete: () => continueBtn?.classList.remove("hidden"),
    });
  }

  /** Stops the currently-running RevealScene instance (if any) from
   * reacting to further taps. See RevealScene.disableInput's doc comment
   * — this must run synchronously, before `game.scene.start()` for a new
   * idiom or before leaving the reveal phase entirely, since the actual
   * scene swap/hide only takes effect on the next frame. */
  function disableCurrentRevealInput(): void {
    (game.scene.getScene("RevealScene") as RevealScene | null)?.disableInput();
  }

  function startMeaningCheckPhase(idiom: IdiomContent): void {
    showPhaseUI("meaning-check");
    updateProgressDom(state);

    // "Next" doubles as "see your summary" on the last idiom of the
    // session, so the button's label should say so rather than implying
    // there's another idiom coming.
    const isLastIdiom = state.currentIndex === state.idiomIds.length - 1;
    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) nextBtn.textContent = isLastIdiom ? "See your summary →" : "Next idiom →";

    meaningCheck.start(idiom, () => {
      state = completeMeaningCheck(state);
      updateProgressDom(state);
      if (state.phase === "complete") {
        showPhaseUI("complete");
        renderSummary(state);
        recordCompletedSession(state.idiomIds);
      } else {
        startRevealPhase(idiomsById[currentIdiomId(state)]);
      }
    });
  }

  continueBtn?.addEventListener("click", () => {
    // Leaving the reveal phase entirely (not just restarting it) -
    // guard against a stray tap on the now-hidden-but-not-yet-destroyed
    // canvas the same way.
    disableCurrentRevealInput();
    state = completeReveal(state);
    updateProgressDom(state);
    startMeaningCheckPhase(idiomsById[currentIdiomId(state)]);
  });

  startRevealPhase(idiomsById[currentIdiomId(state)]);
}

bootstrap();
