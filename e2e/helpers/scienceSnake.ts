import { expect, type Page } from "@playwright/test";
import { GRID_WIDTH, GRID_HEIGHT } from "../../src/science-snake/snakeGrid";
import { scienceQuestions } from "../../src/science-snake/scienceQuestions";

type Dir = "up" | "down" | "left" | "right";

interface BoardState {
  head: { x: number; y: number };
  direction: Dir;
  length: number;
  items: { type: string; x: number; y: number }[];
}

const KEY: Record<Dir, string> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

/** Reads the test-only `#snake-state` hook (see SnakeGameScene.syncStateToDom) — the board is drawn to the Phaser canvas, so there's no other DOM to read positions from. */
export async function readBoard(page: Page): Promise<BoardState> {
  return page.evaluate(() => {
    const el = document.getElementById("snake-state")!;
    return {
      head: { x: Number(el.dataset.headX), y: Number(el.dataset.headY) },
      direction: el.dataset.direction as "up" | "down" | "left" | "right",
      length: Number(el.dataset.length),
      items: JSON.parse(el.dataset.items ?? "[]"),
    };
  });
}

/** Signed shortest step (-1/0/+1) along one wrapping axis of the given size. */
function wrapStep(from: number, to: number, size: number): number {
  const raw = (to - from + size) % size;
  if (raw === 0) return 0;
  return raw <= size / 2 ? 1 : -1;
}

/** Picks the next steering key toward `target`, or null to keep going straight. Never reverses; the edges wrap, so going straight always gets there eventually. */
function nextTurn(board: BoardState, target: { x: number; y: number }): Dir | null {
  const dx = wrapStep(board.head.x, target.x, GRID_WIDTH);
  const dy = wrapStep(board.head.y, target.y, GRID_HEIGHT);
  const horizontal = board.direction === "left" || board.direction === "right";
  let want: Dir | null;
  if (horizontal) {
    want = dx === 0 ? (dy > 0 ? "down" : "up") : dx > 0 ? "right" : "left";
  } else {
    want = dy === 0 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }
  if (want === board.direction || want === OPPOSITE[board.direction]) return null;
  return want;
}

/** Starts a run from the start card. */
export async function startRun(page: Page): Promise<void> {
  await page.goto("/science-snake.html");
  await page.click("#start-btn");
  await expect(page.locator("#start-card")).not.toHaveClass(/visible/);
  await expect(page.locator("#snake-state")).toHaveAttribute("data-length", /\d+/);
}

/** Steers the snake into the nearest science item and waits for the question overlay to open. Returns the question the overlay is showing. */
export async function steerIntoScienceItem(page: Page) {
  const overlay = page.locator("#question-overlay");
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (await overlay.evaluate((el) => el.classList.contains("visible"))) break;
    const board = await readBoard(page);
    const targets = board.items.filter((i) => i.type === "science");
    if (targets.length > 0) {
      const dist = (t: { x: number; y: number }) => Math.abs(t.x - board.head.x) + Math.abs(t.y - board.head.y);
      const target = targets.sort((a, b) => dist(a) - dist(b))[0];
      const turn = nextTurn(board, target);
      if (turn) await page.keyboard.press(KEY[turn]);
    }
    await page.waitForTimeout(40);
  }
  await expect(overlay).toHaveClass(/visible/);
  const prompt = (await page.locator("#question-prompt").textContent()) ?? "";
  const question = scienceQuestions.find((q) => q.prompt === prompt);
  if (!question) throw new Error(`overlay showed an unknown question: ${prompt}`);
  return question;
}

/** Submits an answer into the open question overlay. */
export async function submitAnswer(page: Page, answer: string): Promise<void> {
  await page.fill("#question-input", answer);
  await page.click("#question-submit-btn");
}
