import Phaser from "phaser";
import { SnakeGameScene, CELL_SIZE, type RunStats, type LoseReason } from "./SnakeGameScene";
import { GRID_WIDTH, GRID_HEIGHT } from "./snakeGrid";
import { calculateScore, recordHighScoreIfBetter, loadHighScore, APPLE_POINTS, CORRECT_ANSWER_POINTS } from "./scienceSnakeScore";

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
  const record = recordHighScoreIfBetter({ applesEaten: stats.applesEaten, questionsCorrect: stats.questionsCorrect });
  const score = calculateScore(stats);
  const el = document.getElementById("win-stats");
  if (el) {
    el.textContent = `🍎 ${stats.applesEaten} apples × ${APPLE_POINTS} + 🔬 ${stats.questionsCorrect} correct × ${CORRECT_ANSWER_POINTS} = ${score} points${record.score === score ? " — new high score!" : ` (high score: ${record.score})`}`;
  }
  showCard("win-card");
}

const LOSE_MESSAGES: Record<LoseReason, string> = {
  suffocation: "Too many unanswered questions piled up — the snake couldn't breathe!",
  "self-collision": "Ouch — the snake ran into itself!",
  "wall-collision": "Ouch — the snake ran into the edge!",
};

function showLoseCard(reason: LoseReason, stats: RunStats): void {
  const messageEl = document.getElementById("lose-message");
  if (messageEl) messageEl.textContent = LOSE_MESSAGES[reason];
  const statsEl = document.getElementById("lose-stats");
  if (statsEl) statsEl.textContent = `🍎 ${stats.applesEaten} apples · 🔬 ${stats.questionsCorrect} correct answers`;
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

  const startGame = (): void => {
    hideCard("start-card");
    hideCard("win-card");
    hideCard("lose-card");
    if (game.scene.isActive("SnakeGameScene")) game.scene.stop("SnakeGameScene");
    game.scene.start("SnakeGameScene", {
      onWin: (stats: RunStats) => {
        showHighScore();
        showWinCard(stats);
      },
      onLose: (reason: LoseReason, stats: RunStats) => {
        showLoseCard(reason, stats);
      },
    });
  };

  showHighScore();
  showCard("start-card");
  document.getElementById("start-btn")?.addEventListener("click", startGame);
  document.getElementById("win-play-again-btn")?.addEventListener("click", startGame);
  document.getElementById("lose-play-again-btn")?.addEventListener("click", startGame);
}

bootstrap();
