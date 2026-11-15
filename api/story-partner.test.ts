import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real SDK and Redis client make network calls; both are mocked so
// this tests the handler's own routing, validation, limits and fallbacks.
const parse = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class RateLimitError extends Error {}
  const Anthropic = vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { parse } };
  });
  Object.assign(Anthropic, { RateLimitError });
  return { default: Anthropic };
});

const counts = new Map<string, number>();
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function RedisMock() {
    return {
      incr: vi.fn(async (k: string) => {
        counts.set(k, (counts.get(k) ?? 0) + 1);
        return counts.get(k)!;
      }),
      expire: vi.fn(async () => 1),
    };
  }),
}));

import handler from "./story-partner";

const hints = { see: ["红红的"], hear: ["哗啦啦"], smell: [], touch: [], feel: [], pattern: [] };
const turnBody = {
  action: "turn",
  story: [{ by: "partner", text: "下雨了。" }],
  original: "雨很大。",
  sentence: "雨哗啦啦地下着。",
  mission: "hear",
  turnsLeft: 1,
};

function post(body: unknown, ip = "1.2.3.4"): Promise<Response> {
  return handler.fetch(
    new Request("https://example.com/api/story-partner", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  parse.mockReset();
  counts.clear();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});
afterEach(() => vi.restoreAllMocks());

describe("story-partner", () => {
  it("reports whether AI is enabled", async () => {
    let res = await handler.fetch(new Request("https://example.com/api/story-partner"));
    expect(await res.json()).toEqual({ enabled: false });
    process.env.ANTHROPIC_API_KEY = "test";
    res = await handler.fetch(new Request("https://example.com/api/story-partner"));
    expect(await res.json()).toEqual({ enabled: true });
  });

  it("returns 501 without a key and 400 for bad requests", async () => {
    expect((await post(turnBody)).status).toBe(501);
    process.env.ANTHROPIC_API_KEY = "test";
    const res = await post({ action: "turn" });
    expect(res.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("asks Haiku for a turn and returns the cleaned verdict", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { missionDone: true, reaction: "我听到雨声了！", hint: "", next: { line: "小猫跑出去了。", question: "然后呢？", hints } },
    });
    const res = await post(turnBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.missionDone).toBe(true);
    expect(body.next.line).toBe("小猫跑出去了。");
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("claude-haiku-5-5");
    expect(args.messages[0].content).toContain("<improved>雨哗啦啦地下着。</improved>");
    expect(args.messages[0].content).toContain("1 more turn");
  });

  it("asks for an ending on the last turn", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { missionDone: false, reaction: "好句子！", hint: "雨是什么声音？", next: { line: "大家都笑了。", question: "", hints } },
    });
    await post({ ...turnBody, turnsLeft: 0 });
    expect(parse.mock.calls[0][0].messages[0].content).toContain("happy ending");
  });

  it("starts a story from the child's idea", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { next: { line: "从前有一只会飞的小狗。", question: "它去哪儿？", hints } } });
    const res = await post({ action: "start", idea: "会飞的小狗" });
    expect((await res.json()).next.line).toContain("小狗");
  });

  it("returns 502 on a refusal, bad output or an SDK error", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    vi.spyOn(console, "error").mockImplementation(() => {});
    parse.mockResolvedValueOnce({ stop_reason: "refusal", parsed_output: null });
    expect((await post(turnBody)).status).toBe(502);
    parse.mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: { missionDone: true } });
    expect((await post(turnBody)).status).toBe(502);
    parse.mockRejectedValueOnce(new Error("boom"));
    const res = await post(turnBody);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "ai-failed" });
  });

  it("caps requests per IP per day when Redis is configured", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "t";
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { missionDone: true, reaction: "好！", hint: "", next: { line: "好的。", question: "然后呢？", hints } },
    });
    for (let i = 0; i < 150; i++) expect((await post(turnBody)).status).toBe(200);
    expect((await post(turnBody)).status).toBe(429);
    expect((await post(turnBody, "5.6.7.8")).status).toBe(200);
  });
});
