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
const hashes = new Map<string, Record<string, number>>();
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function RedisMock() {
    return {
      incr: vi.fn(async (k: string) => {
        counts.set(k, (counts.get(k) ?? 0) + 1);
        return counts.get(k)!;
      }),
      expire: vi.fn(async () => 1),
      hincrby: vi.fn(async (k: string, f: string, by: number) => {
        const h = hashes.get(k) ?? {};
        h[f] = (h[f] ?? 0) + by;
        hashes.set(k, h);
        return h[f];
      }),
      hgetall: vi.fn(async (k: string) => hashes.get(k) ?? null),
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
  hashes.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
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
      usage: { input_tokens: 1800, output_tokens: 300 },
      parsed_output: { missionDone: true, reaction: "我听到雨声了！", hint: "", next: { line: "小猫跑出去了。", question: "然后呢？", hints } },
    });
    const res = await post(turnBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.missionDone).toBe(true);
    expect(body.next.line).toBe("小猫跑出去了。");
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("claude-haiku-5-5");
    // Story turns stay fast: no thinking, low effort.
    expect(args.thinking).toEqual({ type: "disabled" });
    expect(args.output_config.effort).toBe("low");
    expect(args.messages[0].content).toContain("<improved>雨哗啦啦地下着。</improved>");
    expect(args.messages[0].content).toContain("1 more turn");
  });

  it("passes on 错别字 fixes and the 📗 新词, and asks for them in a Singapore setting", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: {
        missionDone: true,
        reaction: "好热闹！",
        hint: "",
        fixes: [{ wrong: "芭莎", right: "巴刹", why: "巴刹是卖菜卖鱼的市场" }],
        next: {
          line: "婆婆走到鱼摊，和叔叔讨价还价。",
          question: "然后呢？",
          hints,
          word: { word: "讨价还价", meaning: "商量价钱" },
          guide: { explain: "鱼摊上有什么？叔叔在做什么？", starters: ["冰块上", "叔叔拿起", "婆婆说"], example: "冰块上躺着一条条银色的鱼。" },
        },
      },
    });
    const res = await post({ ...turnBody, sentence: "芭莎里人很多，吵吵闹闹。" });
    const body = await res.json();
    expect(body.fixes).toEqual([{ wrong: "芭莎", right: "巴刹", why: "巴刹是卖菜卖鱼的市场" }]);
    expect(body.next.word).toEqual({ word: "讨价还价", meaning: "商量价钱" });
    expect(body.next.guide.starters).toEqual(["冰块上", "叔叔拿起", "婆婆说"]);
    const args = parse.mock.calls[0][0];
    expect(args.system).toContain("组屋楼下");
    expect(args.system).toContain("not fairy tales");
    expect(args.messages[0].content).toContain('"fixes"');
    expect(args.messages[0].content).toContain('"guide"');
  });

  it("asks for alternatives without hints and gives them the hints of next", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    const next = { line: "大家唱生日歌。", question: "然后呢？", hints };
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { missionDone: true, reaction: "好！", hint: "", fixes: [], next, alternatives: [{ line: "大家去游乐场。", question: "玩什么？" }] },
    });
    const body = await (await post({ ...turnBody, choices: true })).json();
    expect(body.alternatives).toEqual([{ line: "大家去游乐场。", question: "玩什么？", hints }]);
    expect(parse.mock.calls[0][0].messages[0].content).toContain('without "hints"');
  });

  it("never asks for fixes on a parent's turn", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { missionDone: false, reaction: "好！", hint: "", fixes: [], next: { line: "好的。", question: "然后呢？", hints } },
    });
    const { mission: _m, ...parentTurn } = turnBody;
    await post({ ...parentTurn, writer: "parent" });
    expect(parse.mock.calls[0][0].messages[0].content).toContain("never correct a parent");
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

  it("judges one sense for 句子长大了 with its own prompt", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      usage: { input_tokens: 500, output_tokens: 100 },
      parsed_output: { senseDone: true, readsWell: true, fixHint: "", reaction: "好白的小狗！", hint: "", hints },
    });
    const res = await post({ action: "grow", plain: "小狗在跑。", before: "小狗在跑。", sentence: "白白的小狗在跑。", sense: "see" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ senseDone: true, readsWell: true, fixHint: "", reaction: "好白的小狗！", hint: "", hints });
    const args = parse.mock.calls[0][0];
    expect(args.messages[0].content).toContain("一碗面汤的味道面");
    expect(args.system).toContain("one sense at a time");
    // Judging whether a sentence reads well: thinking on (Haiku 5.5's adaptive default), medium effort.
    expect(args.thinking).toBeUndefined();
    expect(args.output_config.effort).toBe("medium");
    expect(args.messages[0].content).toContain("小狗汪汪叫在跑");
    expect(args.messages[0].content).toContain("<improved>白白的小狗在跑。</improved>");
    expect(args.messages[0].content).toContain("看到");
    expect(args.messages[0].content).toContain("When in doubt, answer true");
  });

  it("counts quietness as a sound (默默地 was judged not a sound)", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { senseDone: true, reaction: "好安静！", hint: "", hints } });
    await post({ action: "grow", plain: "月亮出来了。", before: "月亮出来了。", sentence: "月亮默默地出来了。", sense: "hear" });
    expect(parse.mock.calls[0][0].messages[0].content).toContain("默默地");
    expect(parse.mock.calls[0][0].messages[0].content).toContain("静悄悄");
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

  it("logs and totals token usage, and serves it at ?stats", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    const stats = () => handler.fetch(new Request("https://example.com/api/story-partner?stats"));
    expect((await stats()).status).toBe(501); // no database configured

    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "t";
    const reply = (n: number) => ({
      stop_reason: "end_turn",
      usage: { input_tokens: 2000, output_tokens: 400 },
      parsed_output: { missionDone: true, reaction: "好！", hint: "", next: { line: `第${n}句。`, question: n < 3 ? "然后呢？" : "", hints } },
    });
    parse.mockResolvedValueOnce(reply(1)).mockResolvedValueOnce(reply(2)).mockResolvedValueOnce(reply(3));
    await post({ ...turnBody, turnsLeft: 2 });
    await post({ ...turnBody, turnsLeft: 1 });
    await post({ ...turnBody, turnsLeft: 0 });

    const logged = vi.mocked(console.log).mock.calls.map((c) => JSON.parse(String(c[0])));
    expect(logged).toHaveLength(3);
    expect(logged[0]).toMatchObject({ event: "story-partner-usage", action: "turn", inputTokens: 2000, outputTokens: 400 });

    const res = await stats();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.today).toMatchObject({ calls: 3, inputTokens: 6000, outputTokens: 1200, storiesFinished: 1 });
    expect(body.today.costUsd).toBeCloseTo(0.0012);
    expect(body.today.costPerStoryUsd).toBeCloseTo(0.0012);
    expect(body.byDay).toHaveLength(7);
    // Only numbers are stored, never story text.
    expect(JSON.stringify([...hashes.values()])).not.toMatch(/\p{Script=Han}/u);
  });

  it("explains why the stats database can't be reached", async () => {
    process.env.KV_REST_API_URL = "https://gone-db.upstash.io";
    process.env.KV_REST_API_TOKEN = "secret-token";
    const { Redis } = await import("@upstash/redis");
    vi.mocked(Redis).mockImplementationOnce(function RedisDown() {
      const err = Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
      return { hgetall: vi.fn(async () => Promise.reject(err)) } as never;
    });
    const res = await handler.fetch(new Request("https://example.com/api/story-partner?stats"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("usage read failed: fetch failed (ENOTFOUND)");
    expect(body.databaseHost).toBe("gone-db.upstash.io");
    expect(JSON.stringify(body)).not.toContain("secret-token");
  });
});
