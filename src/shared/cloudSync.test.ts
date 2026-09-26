import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getLocalCloudCode, ensureLocalCloudCode, adoptCloudCode, pushToCloud, pullFromCloud } from "./cloudSync";

const VALID_CODE = "234567AB";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ensureLocalCloudCode / getLocalCloudCode", () => {
  it("has no code before cloud save has ever been used", () => {
    expect(getLocalCloudCode()).toBeNull();
  });

  it("mints and remembers a code on first use", () => {
    const code = ensureLocalCloudCode(() => 0.5);
    expect(code).toHaveLength(8);
    expect(getLocalCloudCode()).toBe(code);
  });

  it("is idempotent — a second call returns the same code rather than minting a new one", () => {
    const first = ensureLocalCloudCode(() => 0.1);
    const second = ensureLocalCloudCode(() => 0.9);
    expect(second).toBe(first);
  });

  it("ignores a corrupted stored value rather than returning it as a real code", () => {
    localStorage.setItem("idiom-cloud-code", "not a valid code");
    expect(getLocalCloudCode()).toBeNull();
  });
});

describe("a game's own code storage key", () => {
  it("keeps a code stored under another key separate from idiom-door's", () => {
    const snakeCode = ensureLocalCloudCode(() => 0.5, "science-snake-cloud-code");
    expect(getLocalCloudCode()).toBeNull();
    expect(getLocalCloudCode("science-snake-cloud-code")).toBe(snakeCode);
    adoptCloudCode(VALID_CODE, "science-snake-cloud-code");
    expect(getLocalCloudCode("science-snake-cloud-code")).toBe(VALID_CODE);
    expect(getLocalCloudCode()).toBeNull();
  });
});

describe("adoptCloudCode", () => {
  it("makes a valid code this device's own going-forward sync code", () => {
    adoptCloudCode(VALID_CODE);
    expect(getLocalCloudCode()).toBe(VALID_CODE);
  });

  it("ignores an invalid code rather than storing garbage", () => {
    adoptCloudCode("not valid");
    expect(getLocalCloudCode()).toBeNull();
  });
});

function stubFetch(impl: (input: string, init?: RequestInit) => Promise<Response> | Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown, init?: RequestInit) => Promise.resolve(impl(String(input), init))),
  );
}

describe("pushToCloud", () => {
  it("rejects an invalid code before ever calling fetch", async () => {
    stubFetch(() => {
      throw new Error("should not be called");
    });
    const result = await pushToCloud("bad", { x: 1 });
    expect(result).toEqual({ ok: false, reason: "invalid-code" });
  });

  it("succeeds on a 200 response", async () => {
    stubFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const result = await pushToCloud(VALID_CODE, { x: 1 });
    expect(result).toEqual({ ok: true });
  });

  it("sends the code and data as the JSON body via POST", async () => {
    let capturedInit: RequestInit | undefined;
    stubFetch((_url, init) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await pushToCloud(VALID_CODE, { completedSessions: [] });
    expect(capturedInit?.method).toBe("POST");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({ code: VALID_CODE, data: { completedSessions: [] } });
  });

  it("names a non-default game in the body, so its save lands in that game's own namespace", async () => {
    let capturedInit: RequestInit | undefined;
    stubFetch((_url, init) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await pushToCloud(VALID_CODE, { highScore: null, lastRun: null }, "science-snake");
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      code: VALID_CODE,
      data: { highScore: null, lastRun: null },
      game: "science-snake",
    });
  });

  it("reports not-configured on a 501 (backend not provisioned yet)", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "not-configured" }), { status: 501 }));
    const result = await pushToCloud(VALID_CODE, {});
    expect(result).toEqual({ ok: false, reason: "not-configured" });
  });

  it("reports network on any other non-ok response, with the server's own error as detail", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
    const result = await pushToCloud(VALID_CODE, {});
    expect(result).toEqual({ ok: false, reason: "network", detail: "HTTP 500: boom" });
  });

  it("falls back to a bare status when the failed response isn't JSON", async () => {
    stubFetch(() => new Response("<html>Internal Server Error</html>", { status: 502 }));
    const result = await pushToCloud(VALID_CODE, {});
    expect(result).toEqual({ ok: false, reason: "network", detail: "HTTP 502" });
  });

  it("reports network rather than throwing when fetch itself rejects (offline), with the error message as detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const result = await pushToCloud(VALID_CODE, {});
    expect(result).toEqual({ ok: false, reason: "network", detail: "offline" });
  });
});

describe("pullFromCloud", () => {
  it("rejects an invalid code before ever calling fetch", async () => {
    stubFetch(() => {
      throw new Error("should not be called");
    });
    const result = await pullFromCloud("bad");
    expect(result).toEqual({ ok: false, reason: "invalid-code" });
  });

  it("returns the stored data on a 200 response", async () => {
    const data = { completedSessions: [{ idiomIds: ["a"], completedAt: 1 }] };
    stubFetch(() => new Response(JSON.stringify({ ok: true, data }), { status: 200 }));
    const result = await pullFromCloud(VALID_CODE);
    expect(result).toEqual({ ok: true, data });
  });

  it("asks for a non-default game's own save via the query string, and idiom-door's without one", async () => {
    const urls: string[] = [];
    stubFetch((url) => {
      urls.push(url);
      return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
    });
    await pullFromCloud(VALID_CODE, "science-snake");
    await pullFromCloud(VALID_CODE);
    expect(urls).toEqual([`/api/cloud-save?code=${VALID_CODE}&game=science-snake`, `/api/cloud-save?code=${VALID_CODE}`]);
  });

  it("reports not-found on a 404 (code never saved to)", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "not-found" }), { status: 404 }));
    const result = await pullFromCloud(VALID_CODE);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("reports not-configured on a 501", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "not-configured" }), { status: 501 }));
    const result = await pullFromCloud(VALID_CODE);
    expect(result).toEqual({ ok: false, reason: "not-configured" });
  });

  it("reports network on any other non-ok response, with the server's own error as detail", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
    const result = await pullFromCloud(VALID_CODE);
    expect(result).toEqual({ ok: false, reason: "network", detail: "HTTP 500: boom" });
  });

  it("reports network rather than throwing when fetch itself rejects (offline), with the error message as detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );
    const result = await pullFromCloud(VALID_CODE);
    expect(result).toEqual({ ok: false, reason: "network", detail: "offline" });
  });

  it("requests with the code as a query parameter via GET", async () => {
    let capturedUrl = "";
    let capturedMethod: string | undefined;
    stubFetch((url, init) => {
      capturedUrl = url;
      capturedMethod = init?.method;
      return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
    });
    await pullFromCloud(VALID_CODE);
    expect(capturedUrl).toBe(`/api/cloud-save?code=${VALID_CODE}`);
    expect(capturedMethod ?? "GET").toBe("GET");
  });
});
