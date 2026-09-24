import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { syncAfterRun } from "./cloudSaveStatus";
import { SCIENCE_SNAKE_CLOUD_CODE_KEY } from "./scoreCloudSync";
import { recordRun } from "./scienceSnakeScore";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncAfterRun", () => {
  it("does nothing at all until sync has been turned on (no code yet)", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    recordRun({ applesEaten: 3, questionsCorrect: 0 }, 1000);
    syncAfterRun(() => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("syncs the finished run under this device's code, then lets the page refresh its display", async () => {
    localStorage.setItem(SCIENCE_SNAKE_CLOUD_CODE_KEY, "234567AB");
    const posted: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        if (init?.method === "POST") {
          posted.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "not-found" }), { status: 404 });
      }),
    );
    recordRun({ applesEaten: 3, questionsCorrect: 0 }, 1000);
    const refreshed = new Promise<void>((resolve) => syncAfterRun(resolve));
    await refreshed;
    const run = { applesEaten: 3, questionsCorrect: 0, score: 15, achievedAt: 1000 };
    expect(posted).toEqual([{ code: "234567AB", game: "science-snake", data: { highScore: run, lastRun: run } }]);
  });
});
