import { test, expect, type Page } from "@playwright/test";
import { ROOM_WIDTH, ROOM_HEIGHT, QUESTION_DOOR_CELLS, LADDER_CELLS, buildSteps } from "../src/science-snake/answerRoom";
import { answerRoomContent } from "../src/science-snake/answerRoomContent";

/**
 * Plays the answer-room prototype (answer-room.html) for real: real
 * ticks, real eating rules. Steering runs inside the page — after each
 * tick it finds the shortest path on the wrapping board to the chosen
 * target that doesn't pass over any other apple, the QUESTION door or
 * the ladder, and presses the arrow key for its first step (same "steer
 * in the page, reacting to each tick" reasoning as
 * helpers/scienceSnake.ts). "right" eats whatever is next (the word, or
 * the correct blue apple) and then the ladder; "wrong" does the same
 * but takes the wrong blue apple.
 */

type Target = "right" | "wrong" | "door";

const ice = answerRoomContent["aishas-melting-ice"];

async function steerTo(page: Page, target: Target): Promise<void> {
  await page.evaluate(
    ({ target, width, height, door, ladder }) => {
      const w = window as unknown as { __roomSteer?: MutationObserver };
      w.__roomSteer?.disconnect();
      const status = document.getElementById("room-status")!;
      const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
      const opposite = { up: "down", down: "up", left: "right", right: "left" } as const;
      const keyFor = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" } as const;
      type Dir = keyof typeof deltas;
      const wrap = (x: number, y: number): [number, number] => [((x % width) + width) % width, ((y % height) + height) % height];

      const steer = (): void => {
        const hx = Number(status.dataset.headX);
        const hy = Number(status.dataset.headY);
        const dir = status.dataset.direction as Dir;
        const finished = status.dataset.finished === "true";
        const apples = [...document.querySelectorAll<HTMLElement>("#room-apples span")].map((s) => ({
          x: Number(s.dataset.x),
          y: Number(s.dataset.y),
          kind: s.dataset.kind,
          correct: s.dataset.correct === "true",
        }));
        const at = (cells: { x: number; y: number }[], x: number, y: number): boolean => cells.some((c) => c.x === x && c.y === y);
        const isGoal = (x: number, y: number): boolean => {
          if (target === "door") return !finished && at(door, x, y);
          if (finished) return at(ladder, x, y);
          const wantCorrect = target !== "wrong";
          return apples.some((a) => a.x === x && a.y === y && (a.kind === "word" || a.correct === wantCorrect));
        };
        const isBlocked = (x: number, y: number): boolean =>
          !isGoal(x, y) && (at(apples, x, y) || (!finished && at(door, x, y)) || (finished && at(ladder, x, y)));

        const seen = new Set([`${hx},${hy}`]);
        const queue: { x: number; y: number; first: Dir }[] = [];
        for (const d of Object.keys(deltas) as Dir[]) {
          if (d === opposite[dir]) continue;
          const [x, y] = wrap(hx + deltas[d][0], hy + deltas[d][1]);
          if (isBlocked(x, y)) continue;
          if (isGoal(x, y)) {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: keyFor[d] }));
            return;
          }
          seen.add(`${x},${y}`);
          queue.push({ x, y, first: d });
        }
        while (queue.length) {
          const cur = queue.shift()!;
          for (const d of Object.keys(deltas) as Dir[]) {
            const [x, y] = wrap(cur.x + deltas[d][0], cur.y + deltas[d][1]);
            if (seen.has(`${x},${y}`) || isBlocked(x, y)) continue;
            if (isGoal(x, y)) {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: keyFor[cur.first] }));
              return;
            }
            seen.add(`${x},${y}`);
            queue.push({ x, y, first: cur.first });
          }
        }
      };
      const observer = new MutationObserver(steer);
      observer.observe(status, { attributes: true });
      w.__roomSteer = observer;
      steer();
    },
    { target, width: ROOM_WIDTH, height: ROOM_HEIGHT, door: QUESTION_DOOR_CELLS, ladder: LADDER_CELLS },
  );
}

async function enter(page: Page, buttonId: string): Promise<void> {
  await page.click(`#${buttonId}`);
  await expect(page.locator("#countdown")).toHaveText("3");
}

const iceSteps = buildSteps(ice);
const choiceStep = iceSteps.findIndex((step) => step.kind === "choice");

test.beforeEach(async ({ page }) => {
  await page.goto("/answer-room.html?q=aishas-melting-ice&seed=3");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
});

test("eating the words one by one, the right blue apple, then the ladder finishes the sentence", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "right");
  // One word at a time; two blue apples only at the choice.
  await expect(page.locator("#room-apples span")).toHaveCount(1);
  await expect(page.locator("#choice-box")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("#room-apples span[data-kind=option]")).toHaveCount(2);
  await expect(page.locator("#choice-box")).toContainText("it warmed up");
  await expect(page.locator("#choice-box")).toContainText("it cooled down");

  await expect(page.locator("#room-hint")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(iceSteps.length);
  await expect(page.locator("#complete-card")).toHaveClass(/visible/, { timeout: 30_000 });
  await expect(page.locator("#complete-sentence")).toHaveText(ice.phrases.join(" "));
});

test("the wrong blue apple kills the snake, and the sentence is practised again from the first word", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "wrong");
  await expect(page.locator("#thrown-out-card")).toHaveClass(/visible/, { timeout: 90_000 });
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(0);

  await enter(page, "retry-btn");
  await expect(page.locator("#room-status")).toHaveAttribute("data-step", "0");
  await expect(page.locator("#room-apples span[data-kind=word]")).toHaveCount(1);
});

test("the QUESTION door goes back to reread, keeping the words eaten so far", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "right");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(2, { timeout: 60_000 });
  await steerTo(page, "door");
  await expect(page.locator("#question-card")).toHaveClass(/visible/, { timeout: 60_000 });
  await expect(page.locator("#question-card .question-parts p")).toHaveCount(3);

  await enter(page, "back-in-btn");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(2);
  expect(choiceStep).toBeGreaterThan(2);
});

test("after a finished sentence, Next question moves on to a fresh one", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "right");
  await expect(page.locator("#complete-card")).toHaveClass(/visible/, { timeout: 120_000 });
  await page.click("#next-question-btn");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
  await expect(page.locator("#start-card .question-parts")).not.toContainText("Aisha");
  await expect(page.locator("#sentence-strip .word-chip:not(.upcoming)")).toHaveCount(0);
});
