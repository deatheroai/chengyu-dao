import type { Page } from "@playwright/test";
import { ROOM_WIDTH, ROOM_HEIGHT, QUESTION_DOOR_CELLS, LADDER_CELLS } from "../../src/science-snake/answerRoom";

/**
 * Steers the answer room for real (answer-room.html, and the room inside
 * science-snake.html?answer=room — both have #room-status/#room-apples).
 * Runs inside the page: after each tick it finds the shortest path on
 * the wrapping board to the chosen target that doesn't pass over any
 * other apple, the QUESTION door or the ladder, and presses the arrow
 * key for its first step (same "steer in the page, reacting to each
 * tick" reasoning as helpers/scienceSnake.ts). "right" eats whatever is
 * next (the word, or the correct blue apple) and then the ladder;
 * "wrong" does the same but takes the wrong blue apple.
 */
export type RoomTarget = "right" | "wrong" | "door";

export async function steerRoomTo(page: Page, target: RoomTarget): Promise<void> {
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
        // The QUESTION door is only there at the A/B choice.
        const doorOpen = status.dataset.doorOpen === "true";
        const apples = [...document.querySelectorAll<HTMLElement>("#room-apples span")].map((s) => ({
          x: Number(s.dataset.x),
          y: Number(s.dataset.y),
          kind: s.dataset.kind,
          correct: s.dataset.correct === "true",
        }));
        const at = (cells: { x: number; y: number }[], x: number, y: number): boolean => cells.some((c) => c.x === x && c.y === y);
        const isGoal = (x: number, y: number): boolean => {
          if (target === "door") return doorOpen && at(door, x, y);
          if (finished) return at(ladder, x, y);
          const wantCorrect = target !== "wrong";
          return apples.some((a) => a.x === x && a.y === y && (a.kind === "word" || a.correct === wantCorrect));
        };
        const isBlocked = (x: number, y: number): boolean =>
          !isGoal(x, y) && (at(apples, x, y) || (doorOpen && at(door, x, y)) || (finished && at(ladder, x, y)));

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


export async function stopRoomSteering(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __roomSteer?: MutationObserver }).__roomSteer?.disconnect());
}
