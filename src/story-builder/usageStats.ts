/**
 * Cost bookkeeping for the AI story partner, from the token counts the
 * API returns on every call. Pure functions; api/story-partner.ts stores
 * the daily totals in Redis and serves the summary at ?stats.
 */

/** Claude Haiku 5.5, USD per token (prompts up to 100K tokens). */
export const PRICE_PER_INPUT_TOKEN = 0.1 / 1_000_000;
export const PRICE_PER_OUTPUT_TOKEN = 0.5 / 1_000_000;

export function costUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * PRICE_PER_INPUT_TOKEN + outputTokens * PRICE_PER_OUTPUT_TOKEN;
}

/** One day's totals as stored: every field is a count. */
export interface DayUsage {
  day: string;
  calls: number;
  /** Calls that wrote a story's ending: roughly the number of stories finished. */
  endings: number;
  input: number;
  output: number;
}

export interface UsageSummary {
  days: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  storiesFinished: number;
  costPerStoryUsd: number | null;
}

export function summarize(days: DayUsage[]): UsageSummary {
  const calls = days.reduce((n, d) => n + d.calls, 0);
  const inputTokens = days.reduce((n, d) => n + d.input, 0);
  const outputTokens = days.reduce((n, d) => n + d.output, 0);
  const storiesFinished = days.reduce((n, d) => n + d.endings, 0);
  const cost = costUsd(inputTokens, outputTokens);
  return {
    days: days.length,
    calls,
    inputTokens,
    outputTokens,
    costUsd: round(cost),
    storiesFinished,
    costPerStoryUsd: storiesFinished ? round(cost / storiesFinished) : null,
  };
}

/** Reads a stored hash (values may come back as strings) into a DayUsage. */
export function toDayUsage(day: string, hash: Record<string, unknown> | null): DayUsage {
  const n = (k: string) => {
    const v = Number(hash?.[k] ?? 0);
    return Number.isFinite(v) ? v : 0;
  };
  return { day, calls: n("calls"), endings: n("endings"), input: n("input"), output: n("output") };
}

/** The last `count` UTC dates ending at `now`, newest first (YYYY-MM-DD). */
export function lastDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10));
}

const round = (x: number) => Math.round(x * 1_000_000) / 1_000_000;
