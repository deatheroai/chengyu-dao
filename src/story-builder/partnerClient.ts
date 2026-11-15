import {
  cleanStartResponse,
  cleanTurnResponse,
  type StartResponse,
  type TurnRequest,
  type TurnResponse,
} from "./partnerApi";

const ENDPOINT = "/api/story-partner";

/** Whether the AI partner is set up. Any failure means "no": the page
 * then runs its pre-written stories. */
export async function partnerEnabled(): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, { method: "GET" });
    if (!res.ok) return false;
    const body = (await res.json()) as { enabled?: unknown };
    return body.enabled === true;
  } catch {
    return false;
  }
}

async function post(body: unknown): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 团团's opening for the child's own idea, or null if AI failed. */
export async function requestStart(idea: string): Promise<StartResponse | null> {
  return cleanStartResponse(await post({ action: "start", idea }));
}

/** 团团's verdict on a mission plus the next beat, or null if AI failed. */
export async function requestTurn(req: Omit<TurnRequest, "action">): Promise<TurnResponse | null> {
  return cleanTurnResponse(await post({ action: "turn", ...req }));
}
