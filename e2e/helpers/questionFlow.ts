import type { Page } from "@playwright/test";
import { GRID_WIDTH, GRID_HEIGHT } from "../../src/science-snake/snakeGrid";

/**
 * Steers the main board for the redesign's question flow
 * (science-snake.html). Same in-page approach as the other
 * helpers: after each tick (#snake-status changes) it finds the shortest
 * safe path on the wrapping board — never through the snake's own body,
 * poison apples, or anything that isn't the target (other numbered
 * apples, the door unless that's the target) — and presses the arrow
 * key for its first step. Falls back to any move that doesn't hit the
 * body when no path exists.
 *
 * "science": the nearest science item. "phrase": the question's next
 * phrase apple (there's only ever one). "door": the ANSWER door.
 * "golden": either golden apple (avoided for every other target).
 */
export type BoardTarget = "science" | "phrase" | "door" | "golden";

export async function steerBoardTo(page: Page, target: BoardTarget): Promise<void> {
  await page.evaluate(
    ({ target, width, height }) => {
      const w = window as unknown as { __boardSteer?: MutationObserver };
      w.__boardSteer?.disconnect();
      const status = document.getElementById("snake-status")!;
      const flow = document.getElementById("question-flow")!;
      type Dir = "up" | "down" | "left" | "right";
      const deltas: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const opposite: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
      const keyFor: Record<Dir, string> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
      const wrap = (x: number, y: number): [number, number] => [((x % width) + width) % width, ((y % height) + height) % height];
      const k = (x: number, y: number): string => `${x},${y}`;

      const steer = (): void => {
        const body: { x: number; y: number }[] = JSON.parse(status.dataset.body ?? "[]");
        if (!body.length) return;
        const head = body[0];
        const dir = status.dataset.direction as Dir;
        const items = [...document.querySelectorAll<HTMLElement>("#board-items span")].map((s) => ({
          x: Number(s.dataset.x),
          y: Number(s.dataset.y),
          type: s.dataset.type,
        }));
        const phrases = [...flow.querySelectorAll<HTMLElement>("span[data-phrase]")].map((s) => ({
          x: Number(s.dataset.x),
          y: Number(s.dataset.y),
        }));
        const door = [...flow.querySelectorAll<HTMLElement>("span[data-door]")].map((s) => ({ x: Number(s.dataset.x), y: Number(s.dataset.y) }));
        const golden = [...flow.querySelectorAll<HTMLElement>("span[data-golden]")].map((s) => ({ x: Number(s.dataset.x), y: Number(s.dataset.y) }));

        const goals = new Set<string>();
        if (target === "science") for (const i of items) if (i.type === "science") goals.add(k(i.x, i.y));
        if (target === "phrase") for (const p of phrases) goals.add(k(p.x, p.y));
        if (target === "door") for (const d of door) goals.add(k(d.x, d.y));
        if (target === "golden") for (const g of golden) goals.add(k(g.x, g.y));

        const blocked = new Set<string>();
        for (const s of body.slice(0, -1)) blocked.add(k(s.x, s.y));
        for (const i of items) if (i.type === "poison-apple" || (i.type === "science" && target !== "science")) blocked.add(k(i.x, i.y));
        for (const p of phrases) blocked.add(k(p.x, p.y));
        for (const d of door) blocked.add(k(d.x, d.y));
        for (const g of golden) blocked.add(k(g.x, g.y));
        for (const g of goals) blocked.delete(g);

        const press = (d: Dir): void => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: keyFor[d] }));
        };
        const seen = new Set([k(head.x, head.y)]);
        const queue: { x: number; y: number; first: Dir }[] = [];
        const firsts: Dir[] = [];
        for (const d of Object.keys(deltas) as Dir[]) {
          if (d === opposite[dir]) continue;
          const [x, y] = wrap(head.x + deltas[d][0], head.y + deltas[d][1]);
          if (blocked.has(k(x, y))) continue;
          firsts.push(d);
          if (goals.has(k(x, y))) return press(d);
          seen.add(k(x, y));
          queue.push({ x, y, first: d });
        }
        while (queue.length) {
          const cur = queue.shift()!;
          for (const d of Object.keys(deltas) as Dir[]) {
            const [x, y] = wrap(cur.x + deltas[d][0], cur.y + deltas[d][1]);
            if (seen.has(k(x, y)) || blocked.has(k(x, y))) continue;
            if (goals.has(k(x, y))) return press(cur.first);
            seen.add(k(x, y));
            queue.push({ x, y, first: cur.first });
          }
        }
        if (firsts.length && !firsts.includes(dir)) press(firsts[0]);
      };
      const observer = new MutationObserver(steer);
      observer.observe(status, { attributes: true });
      w.__boardSteer = observer;
      steer();
    },
    { target, width: GRID_WIDTH, height: GRID_HEIGHT },
  );
}

export async function stopBoardSteering(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __boardSteer?: MutationObserver }).__boardSteer?.disconnect());
}
