import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { syncScoresWithCloud, restoreScoresFromCloud, getScienceSnakeCloudCode, ensureScienceSnakeCloudCode } from "./scoreCloudSync";
import { getLocalCloudCode } from "../shared/cloudSync";
import { recordRun, loadHighScore, loadLastRun, type ScoreRecord } from "./scienceSnakeScore";

const VALID_CODE = "234567AB";

/** An in-memory stand-in for api/cloud-save.ts, keyed the same way
 * (code + game), recording every request so tests can assert on them. */
function stubServer(initial: Record<string, unknown> = {}): { store: Map<string, unknown>; requests: string[] } {
  const store = new Map<string, unknown>(Object.entries(initial));
  const requests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { code: string; data: unknown; game?: string };
        requests.push(`POST ${body.game ?? "idiom-door"}`);
        store.set(`${body.game ?? "idiom-door"}:${body.code}`, body.data);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      const params = new URL(url, "https://example.com").searchParams;
      const key = `${params.get("game") ?? "idiom-door"}:${params.get("code")}`;
      requests.push(`GET ${params.get("game") ?? "idiom-door"}`);
      if (!store.has(key)) return new Response(JSON.stringify({ error: "not-found" }), { status: 404 });
      return new Response(JSON.stringify({ ok: true, data: store.get(key) }), { status: 200 });
    }),
  );
  return { store, requests };
}

function record(score: number, achievedAt: number): ScoreRecord {
  return { applesEaten: score / 5, questionsCorrect: 0, score, achievedAt };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Science Snake's own cloud code", () => {
  it("is separate from idiom-door's", () => {
    const code = ensureScienceSnakeCloudCode(() => 0.3);
    expect(getScienceSnakeCloudCode()).toBe(code);
    expect(getLocalCloudCode()).toBeNull();
  });
});

describe("syncScoresWithCloud", () => {
  it("pushes this device's scores under the science-snake namespace when nothing is saved yet", async () => {
    const { store, requests } = stubServer();
    recordRun({ applesEaten: 10, questionsCorrect: 1 }, 1000);
    expect(await syncScoresWithCloud(VALID_CODE)).toEqual({ ok: true });
    // The idiom-door GET is the fallback for saves made by the earlier,
    // un-namespaced version (see the last describe block below).
    expect(requests).toEqual(["GET science-snake", "GET idiom-door", "POST science-snake"]);
    const run = { applesEaten: 10, questionsCorrect: 1, score: 80, achievedAt: 1000 };
    expect(store.get(`science-snake:${VALID_CODE}`)).toEqual({ highScore: run, lastRun: run });
  });

  it("merges before pushing, so a lower local high score can't overwrite a higher cloud one", async () => {
    const { store } = stubServer({ [`science-snake:${VALID_CODE}`]: { highScore: record(120, 500), lastRun: record(120, 500) } });
    recordRun({ applesEaten: 16, questionsCorrect: 0 }, 1000); // 80
    await syncScoresWithCloud(VALID_CODE);
    expect(store.get(`science-snake:${VALID_CODE}`)).toEqual({ highScore: record(120, 500), lastRun: record(80, 1000) });
    expect(loadHighScore()).toEqual(record(120, 500));
  });

  it("never touches idiom-door's save under the same code", async () => {
    const idiomSave = { completedSessions: [{ idiomIds: ["a"], completedAt: 1 }] };
    const { store } = stubServer({ [`idiom-door:${VALID_CODE}`]: idiomSave });
    recordRun({ applesEaten: 1, questionsCorrect: 0 }, 1000);
    await syncScoresWithCloud(VALID_CODE);
    expect(store.get(`idiom-door:${VALID_CODE}`)).toEqual(idiomSave);
  });

  it("doesn't push at all when the pull fails for any reason other than not-found", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        requests.push(init?.method ?? "GET");
        return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
      }),
    );
    const result = await syncScoresWithCloud(VALID_CODE);
    expect(result).toEqual({ ok: false, reason: "network", detail: "HTTP 500: boom" });
    expect(requests).toEqual(["GET"]);
  });

  it("reports not-configured when the backend isn't provisioned", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "not-configured" }), { status: 501 })));
    expect(await syncScoresWithCloud(VALID_CODE)).toEqual({ ok: false, reason: "not-configured" });
  });
});

describe("restoreScoresFromCloud", () => {
  it("merges another device's scores in, adopts its code, and pushes the merged result back", async () => {
    const { store } = stubServer({ [`science-snake:${VALID_CODE}`]: { highScore: record(150, 500), lastRun: record(40, 2000) } });
    recordRun({ applesEaten: 20, questionsCorrect: 0 }, 1000); // 100, older than the cloud's last run
    expect(await restoreScoresFromCloud(" 234567ab ")).toEqual({ ok: true });
    expect(loadHighScore()).toEqual(record(150, 500));
    expect(loadLastRun()).toEqual(record(40, 2000));
    expect(getScienceSnakeCloudCode()).toBe(VALID_CODE);
    expect(store.get(`science-snake:${VALID_CODE}`)).toEqual({ highScore: record(150, 500), lastRun: record(40, 2000) });
  });

  it("rejects a malformed code without any network call", async () => {
    const { requests } = stubServer();
    expect(await restoreScoresFromCloud("nope")).toEqual({ ok: false, reason: "invalid-code" });
    expect(requests).toEqual([]);
  });

  it("reports not-found, and doesn't adopt the code, when nothing is saved under it", async () => {
    stubServer();
    expect(await restoreScoresFromCloud(VALID_CODE)).toEqual({ ok: false, reason: "not-found" });
    expect(getScienceSnakeCloudCode()).toBeNull();
  });

  it("reports not-found, and doesn't adopt the code, when the data there isn't a Science Snake save", async () => {
    stubServer({ [`science-snake:${VALID_CODE}`]: { completedSessions: [] } });
    expect(await restoreScoresFromCloud(VALID_CODE)).toEqual({ ok: false, reason: "not-found" });
    expect(getScienceSnakeCloudCode()).toBeNull();
  });
});

describe("saves made by the earlier, un-namespaced version (PR #63)", () => {
  it("are picked up on sync and moved into the science-snake namespace, leaving the old copy alone", async () => {
    const legacy = { highScore: record(200, 500), lastRun: record(200, 500) };
    const { store } = stubServer({ [`idiom-door:${VALID_CODE}`]: legacy });
    expect(await syncScoresWithCloud(VALID_CODE)).toEqual({ ok: true });
    expect(loadHighScore()).toEqual(record(200, 500));
    expect(store.get(`science-snake:${VALID_CODE}`)).toEqual(legacy);
    expect(store.get(`idiom-door:${VALID_CODE}`)).toEqual(legacy);
  });

  it("can be restored from on another device", async () => {
    stubServer({ [`idiom-door:${VALID_CODE}`]: { highScore: record(200, 500), lastRun: record(200, 500) } });
    expect(await restoreScoresFromCloud(VALID_CODE)).toEqual({ ok: true });
    expect(loadHighScore()).toEqual(record(200, 500));
    expect(getScienceSnakeCloudCode()).toBe(VALID_CODE);
  });

  it("are ignored when what's in the old namespace is really an idiom-door save", async () => {
    stubServer({ [`idiom-door:${VALID_CODE}`]: { completedSessions: [] } });
    expect(await restoreScoresFromCloud(VALID_CODE)).toEqual({ ok: false, reason: "not-found" });
  });

  it("don't win over a save already in the science-snake namespace", async () => {
    stubServer({
      [`science-snake:${VALID_CODE}`]: { highScore: record(90, 900), lastRun: record(90, 900) },
      [`idiom-door:${VALID_CODE}`]: { highScore: record(200, 500), lastRun: record(200, 500) },
    });
    await syncScoresWithCloud(VALID_CODE);
    expect(loadHighScore()).toEqual(record(90, 900));
  });
});
