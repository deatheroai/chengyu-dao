import Phaser from "phaser";
import { SnakeGameScene, CELL_SIZE, type RunStats, type LoseReason } from "./SnakeGameScene";
import { GRID_WIDTH, GRID_HEIGHT } from "./snakeGrid";
import { wireJoystick } from "./joystickControl";
import { preventDoubleTapZoom } from "./noZoom";
import { createQuestionFlowPage } from "./questionFlowPage";
import { unlockSpeech } from "./voice";
import { recordRun, describeRunOutcome, loadHighScore, APPLE_POINTS, CORRECT_ANSWER_POINTS } from "./scienceSnakeScore";
import { showCloudSaveCard, hideCloudSaveCard, handleCopyCode, handleRestoreFromCode, syncAfterRun } from "./cloudSaveStatus";

function showCard(id: string): void {
  document.getElementById(id)?.classList.add("visible");
}

function hideCard(id: string): void {
  document.getElementById(id)?.classList.remove("visible");
}

function showHighScore(): void {
  const record = loadHighScore();
  const el = document.getElementById("high-score-display");
  if (el) el.textContent = record ? `🏆 High score: ${record.score}` : "";
}

function showWinCard(stats: RunStats): void {
  const outcome = recordRun(stats);
  const el = document.getElementById("win-stats");
  if (el) {
    el.textContent = `🍎 ${stats.applesEaten} apples × ${APPLE_POINTS} + 🔬 ${stats.questionsCorrect} correct × ${CORRECT_ANSWER_POINTS} = ${outcome.score} points`;
  }
  const comparisonEl = document.getElementById("win-comparison");
  if (comparisonEl) comparisonEl.textContent = describeRunOutcome(outcome);
  showCard("win-card");
}

const LOSE_MESSAGES: Record<LoseReason, string> = {
  suffocation: "Too many unanswered questions piled up — the snake couldn't breathe!",
  "self-collision": "Ouch — the snake ran into itself!",
};

function showLoseCard(reason: LoseReason, stats: RunStats): void {
  // Recorded on a loss too, not just a win (per your "knows if he's
  // improved each round" ask) — a run that suffocates early having
  // answered several questions correctly can still score more than a
  // scraped-together win, so it deserves the same improvement feedback.
  const outcome = recordRun(stats);
  const messageEl = document.getElementById("lose-message");
  if (messageEl) messageEl.textContent = LOSE_MESSAGES[reason];
  const statsEl = document.getElementById("lose-stats");
  if (statsEl) statsEl.textContent = `🍎 ${stats.applesEaten} apples · 🔬 ${stats.questionsCorrect} correct answers · ${outcome.score} points`;
  const comparisonEl = document.getElementById("lose-comparison");
  if (comparisonEl) comparisonEl.textContent = describeRunOutcome(outcome);
  showCard("lose-card");
}

function bootstrap(): void {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#f5faf0",
    width: GRID_WIDTH * CELL_SIZE,
    height: GRID_HEIGHT * CELL_SIZE,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Registered manually below with autoStart:false, same as
    // idiom-door/main.ts — the run must not begin until the start
    // card's button is pressed.
    scene: [],
  };

  const game = new Phaser.Game(config);
  game.scene.add("SnakeGameScene", SnakeGameScene, false);
  const snakeScene = (): SnakeGameScene | null => game.scene.getScene("SnakeGameScene") as SnakeGameScene | null;

  // The redesign's question flow (question apples, ANSWER door, answer
  // room) is opt-in with ?answer=room until it replaces the typed-answer
  // overlay as the default (BACKLOG.md's redesign entry, step 4).
  const questionFlow = new URLSearchParams(location.search).get("answer") === "room" ? createQuestionFlowPage(game, snakeScene) : null;
  // Its question panel takes height above the board, so the joystick
  // moves out from over the board into its own row below it
  // (answerRoom.css's body.question-flow rules).
  if (questionFlow) {
    document.body.classList.add("question-flow");
    // The bar is there from the start (behind the start card), so the
    // board is sized once and never changes.
    questionFlow.reset();
  }

  // The question panel comes and goes above the board; re-read the
  // board's space whenever it does (same fix as answer-room.html).
  const container = document.getElementById("game-container");
  if (container) {
    new ResizeObserver(() => {
      game.scale.getParentBounds();
      game.scale.refresh();
    }).observe(container);
  }

  const startGame = (): void => {
    hideCard("start-card");
    hideCard("win-card");
    hideCard("lose-card");
    if (game.scene.isActive("SnakeGameScene")) game.scene.stop("SnakeGameScene");
    questionFlow?.reset();
    // This tap unlocks speech on iOS for the rest of the visit.
    if (questionFlow) unlockSpeech();
    game.scene.start("SnakeGameScene", {
      questionFlow: questionFlow?.hooks,
      onWin: (stats: RunStats) => {
        // showWinCard records the run (and so updates the stored high
        // score) — showHighScore must read that *after*, not before, or
        // the header keeps showing the pre-run value on the very run
        // that just beat it.
        showWinCard(stats);
        showHighScore();
        syncAfterRun(showHighScore);
      },
      onLose: (reason: LoseReason, stats: RunStats) => {
        showLoseCard(reason, stats);
        showHighScore();
        syncAfterRun(showHighScore);
      },
    });
  };

  showHighScore();
  showCard("start-card");
  document.getElementById("start-btn")?.addEventListener("click", startGame);
  document.getElementById("win-play-again-btn")?.addEventListener("click", startGame);
  document.getElementById("lose-play-again-btn")?.addEventListener("click", startGame);

  // Cloud save — reachable only from the start/win/lose cards (each has
  // its own open button), so the game is never running underneath it.
  for (const button of document.querySelectorAll(".cloud-save-open-btn")) {
    button.addEventListener("click", () => showCloudSaveCard(showHighScore));
  }
  document.getElementById("cloud-save-dismiss-btn")?.addEventListener("click", hideCloudSaveCard);
  document.getElementById("cloud-copy-btn")?.addEventListener("click", () => void handleCopyCode());
  const restoreInput = document.getElementById("cloud-restore-input") as HTMLInputElement | null;
  document.getElementById("cloud-restore-btn")?.addEventListener("click", () => {
    void handleRestoreFromCode(restoreInput?.value ?? "", showHighScore);
  });

  // On-screen joystick (joystickControl.ts) — same "DOM control calls a
  // public method on the live scene instance" pattern idiom-door's own
  // #jump-btn uses.
  const joystick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  if (joystick && knob) {
    wireJoystick(
      joystick,
      knob,
      (direction) => (questionFlow ? questionFlow.steer(direction) : snakeScene()?.requestDirection(direction)),
      (held) => questionFlow?.setJoystickHeld(held),
      // With the question flow on, the whole strip under the board takes
      // touches with a smaller dead zone (same as the answer room's own
      // page) — per "the joystick less reactive".
      questionFlow ? { hitArea: document.getElementById("dpad-bar") ?? undefined, deadZoneRatio: 0.2 } : {},
    );
  }
}

preventDoubleTapZoom();
bootstrap();
