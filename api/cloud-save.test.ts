import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The real @upstash/redis client makes real network calls, so it's
// mocked here with an in-memory Map standing in for the Redis store —
// this is testing api/cloud-save.ts's own routing/validation/error-
// handling logic, not Upstash's client library. vi.mock calls are
// hoisted above imports by Vitest, so this is safe to declare before
// the `import handler from "./cloud-save"` below despite appearing
// textually after it isn't required.
const store = new Map<string, unknown>();
const mockSet = vi.fn(async (key: string, value: unknown) => {
  store.set(key, value);
});
const mockGet = vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null));

vi.mock("@upstash/redis", () => ({
  // A plain arrow function can't be `new`'d (getRedis.ts does
  // `new Redis(...)`) — a regular function that explicitly returns an
  // object works fine as a constructor stand-in.
  Redis: vi.fn().mockImplementation(function RedisMock() {
    return { get: mockGet, set: mockSet };
  }),
}));

import handler from "./cloud-save";

const VALID_CODE = "234567AB";
const ENV_KEYS = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

function clearRedisEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

function setConfigured(): void {
  process.env.KV_REST_API_URL = "https://example.upstash.io";
  process.env.KV_REST_API_TOKEN = "test-token";
}

function post(body: unknown): Promise<Response> {
  return handler.fetch(
    new Request("https://example.com/api/cloud-save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function get(code: string): Promise<Response> {
  return handler.fetch(new Request(`https://example.com/api/cloud-save?code=${code}`));
}

beforeEach(() => {
  store.clear();
  mockSet.mockClear();
  mockGet.mockClear();
  clearRedisEnv();
});

afterEach(() => {
  clearRedisEnv();
});

describe("no Upstash integration provisioned yet", () => {
  it("returns 501 for POST", async () => {
    const res = await post({ code: VALID_CODE, data: {} });
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "not-configured" });
  });

  it("returns 501 for GET", async () => {
    const res = await get(VALID_CODE);
    expect(res.status).toBe(501);
  });

  it("accepts UPSTASH_REDIS_REST_* as an alternative to KV_REST_API_*", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    const res = await get(VALID_CODE);
    expect(res.status).not.toBe(501);
  });
});

describe("configured", () => {
  beforeEach(setConfigured);

  it("round-trips a save through POST then GET", async () => {
    const data = { completedSessions: [{ idiomIds: ["a"], completedAt: 1 }] };
    const postRes = await post({ code: VALID_CODE, data });
    expect(postRes.status).toBe(200);
    expect(await postRes.json()).toEqual({ ok: true });

    const getRes = await get(VALID_CODE);
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toEqual({ ok: true, data });
  });

  it("404s a GET for a code nothing was ever saved under", async () => {
    const res = await get(VALID_CODE);
    expect(res.status).toBe(404);
  });

  it("400s a POST with an invalid code, without ever calling redis.set", async () => {
    const res = await post({ code: "bad", data: {} });
    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("400s a POST with an oversized payload, without ever calling redis.set", async () => {
    const res = await post({ code: VALID_CODE, data: { blob: "x".repeat(30_000) } });
    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("400s a GET with an invalid code, without ever calling redis.get", async () => {
    const res = await get("not-a-real-code");
    expect(res.status).toBe(400);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("400s a POST with an unparseable body", async () => {
    const res = await handler.fetch(
      new Request("https://example.com/api/cloud-save", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
  });

  it("keeps a save that names no game at idiom-door's original key", async () => {
    await post({ code: VALID_CODE, data: { completedSessions: [] } });
    expect(store.has(`chengyu-dao:cloud-save:${VALID_CODE}`)).toBe(true);
  });

  it("keeps each game's save separate under the same code", async () => {
    const idiomData = { completedSessions: [{ idiomIds: ["a"], completedAt: 1 }] };
    const snakeData = { highScore: null, lastRun: null };
    await post({ code: VALID_CODE, data: idiomData });
    await post({ code: VALID_CODE, data: snakeData, game: "science-snake" });

    expect(await (await get(VALID_CODE)).json()).toEqual({ ok: true, data: idiomData });
    const snakeRes = await handler.fetch(new Request(`https://example.com/api/cloud-save?code=${VALID_CODE}&game=science-snake`));
    expect(await snakeRes.json()).toEqual({ ok: true, data: snakeData });
  });

  it("404s a science-snake GET for a code that only has an idiom-door save", async () => {
    await post({ code: VALID_CODE, data: { completedSessions: [] } });
    const res = await handler.fetch(new Request(`https://example.com/api/cloud-save?code=${VALID_CODE}&game=science-snake`));
    expect(res.status).toBe(404);
  });

  it("400s an unknown game on POST or GET, without touching redis", async () => {
    const postRes = await post({ code: VALID_CODE, data: {}, game: "tetris" });
    expect(postRes.status).toBe(400);
    expect(await postRes.json()).toEqual({ error: "invalid-game" });
    const getRes = await handler.fetch(new Request(`https://example.com/api/cloud-save?code=${VALID_CODE}&game=tetris`));
    expect(getRes.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("405s any method other than GET/POST", async () => {
    const res = await handler.fetch(new Request("https://example.com/api/cloud-save", { method: "DELETE" }));
    expect(res.status).toBe(405);
  });

  // 2026-08-30: exactly the bug class that hid behind "Couldn't reach
  // the cloud save server" when restoring failed but saving worked —
  // see cloudSync.ts's `detail` field and DECISIONS.md's follow-up
  // entry. A thrown Redis error must become a real JSON 500, not an
  // uncaught exception (which Vercel turns into a bare, body-less 500
  // client-side code can't describe any further).
  it("returns a real JSON 500, not an uncaught exception, when redis.get fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("ECONNRESET"));
    const res = await get(VALID_CODE);
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("ECONNRESET");
  });

  it("returns a real JSON 500, not an uncaught exception, when redis.set fails", async () => {
    mockSet.mockRejectedValueOnce(new Error("ECONNRESET"));
    const res = await post({ code: VALID_CODE, data: {} });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("ECONNRESET");
  });
});
