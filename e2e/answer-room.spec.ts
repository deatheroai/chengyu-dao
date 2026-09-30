import { test, expect, type Page } from "@playwright/test";
import { ROOM_WIDTH, ROOM_HEIGHT, QUESTION_DOOR_CELLS } from "../src/science-snake/answerRoom";
import { answerRoomContent } from "../src/science-snake/answerRoomContent";

/**
 * Plays the answer-room prototype (answer-room.html) for real: real
 * ticks, real eating rules. Steering runs inside the page — after each
 * tick it finds the shortest path on the wrapping board to the chosen
 * target that doesn't pass over any other apple or the QUESTION door,
 * and presses the arrow key for its first step (same "steer in the page,
 * reacting to each tick" reasoning as helpers/scienceSnake.ts).
 */

type Target = "next" | "wrong" | "door";

const ice = answerRoomContent["aishas-melting-ice"];

async function steerTo(page: Page, target: Target): Promise<void> {
  await page.evaluate(
    ({ target, width, height, door }) => {
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
        const placed = status.dataset.placed;
        const apples = [...document.querySelectorAll<HTMLElement>("#room-apples span")].map((s) => ({
          x: Number(s.dataset.x),
          y: Number(s.dataset.y),
          id: s.dataset.phraseIndex!,
        }));
        const isGoal = (x: number, y: number): boolean => {
          if (target === "door") return door.some((c) => c.x === x && c.y === y);
          const wanted = target === "wrong" ? "wrong" : placed;
          return apples.some((a) => a.x === x && a.y === y && a.id === wanted);
        };
        const isBlocked = (x: number, y: number): boolean =>
          !isGoal(x, y) && (apples.some((a) => a.x === x && a.y === y) || door.some((c) => c.x === x && c.y === y));

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
    { target, width: ROOM_WIDTH, height: ROOM_HEIGHT, door: QUESTION_DOOR_CELLS },
  );
}

async function enter(page: Page, buttonId: string): Promise<void> {
  await page.click(`#${buttonId}`);
  await expect(page.locator("#countdown")).toHaveText("3");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/answer-room.html?q=aishas-melting-ice&seed=3");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
});

test("eating the phrases in order builds the whole sentence", async ({ page }) => {
  await expect(page.locator("#phrase-key .key-entry")).toHaveCount(ice.phrases.length + 1);
  await enter(page, "start-btn");
  await steerTo(page, "next");
  await expect(page.locator("#complete-card")).toHaveClass(/visible/, { timeout: 60_000 });
  await expect(page.locator("#complete-sentence")).toHaveText(ice.phrases.join(" "));
  await expect(page.locator("#sentence-slots .slot.filled")).toHaveCount(ice.phrases.length);
});

test("the wrong science phrase throws the snake out, but keeps the sentence so far", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "next");
  await expect(page.locator("#sentence-slots .slot.filled")).toHaveCount(2, { timeout: 30_000 });
  await steerTo(page, "wrong");
  await expect(page.locator("#thrown-out-card")).toHaveClass(/visible/, { timeout: 30_000 });
  await expect(page.locator("#thrown-out-reason")).toContainText("science");

  await enter(page, "retry-btn");
  await expect(page.locator("#sentence-slots .slot.filled")).toHaveCount(2);
  // Only the unplaced phrases and the wrong one come back.
  await expect(page.locator("#room-apples span")).toHaveCount(ice.phrases.length - 2 + 1);
});

test("the QUESTION door goes back to reread, with no penalty", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "next");
  await expect(page.locator("#sentence-slots .slot.filled")).toHaveCount(1, { timeout: 30_000 });
  await steerTo(page, "door");
  await expect(page.locator("#question-card")).toHaveClass(/visible/, { timeout: 30_000 });
  await expect(page.locator("#question-card .question-parts p")).toHaveCount(3);

  await enter(page, "back-in-btn");
  await expect(page.locator("#sentence-slots .slot.filled")).toHaveCount(1);
});

test("after a finished sentence, Next question moves on to a fresh one", async ({ page }) => {
  await enter(page, "start-btn");
  await steerTo(page, "next");
  await expect(page.locator("#complete-card")).toHaveClass(/visible/, { timeout: 60_000 });
  await page.click("#next-question-btn");
  await expect(page.locator("#start-card")).toHaveClass(/visible/);
  await expect(page.locator("#start-card .question-parts")).not.toContainText("Aisha");
  await expect(page.locator("#sentence-slots .slot.filled")).toHaveCount(0);
  await expect(page.locator("#phrase-key .key-entry")).toHaveCount(5);
});
