const STORAGE_KEY = "idiom-session-history";

export interface CompletedSessionRecord {
  idiomIds: string[];
  /** Epoch ms. Not used for any real date-based gating yet — this
   * snippet treats "any prior completed session" as enough signal to
   * resurface from, per SNIPPET_PLANS.md's "a dev-only reset/toggle
   * stands in for actually waiting a day." Recorded anyway since it's
   * the natural hook a future real spaced-repetition scheduler (e.g.
   * "resurface things not seen in N days") would need. */
  completedAt: number;
}

interface SessionHistoryData {
  completedSessions: CompletedSessionRecord[];
}

function load(): SessionHistoryData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { completedSessions: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.completedSessions)) return { completedSessions: [] };
    return parsed as SessionHistoryData;
  } catch {
    return { completedSessions: [] };
  }
}

function save(data: SessionHistoryData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Called once a session reaches its summary screen. */
export function recordCompletedSession(idiomIds: string[], completedAt: number = Date.now()): void {
  const data = load();
  data.completedSessions.push({ idiomIds, completedAt });
  save(data);
}

export function hasPriorSession(): boolean {
  return load().completedSessions.length > 0;
}

/** Every idiom id discovered across every completed session, deduplicated. */
export function allDiscoveredIdiomIds(): string[] {
  const seen = new Set<string>();
  for (const session of load().completedSessions) {
    for (const id of session.idiomIds) seen.add(id);
  }
  return [...seen];
}

/**
 * Picks one previously-discovered idiom id to resurface, or null if
 * there's no prior completed session yet (a genuinely first-ever visit).
 */
export function pickResurfaceIdiomId(rng: () => number = Math.random): string | null {
  const ids = allDiscoveredIdiomIds();
  if (ids.length === 0) return null;
  return ids[Math.floor(rng() * ids.length)];
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Dev-only: seeds a fake completed prior session so the "returning
 * visitor" resurfacing flow can be exercised without first playing an
 * entire real session end-to-end. Not part of the real product flow —
 * wired to a clearly-labeled dev control in session/main.ts, standing in
 * for SNIPPET_PLANS.md's "dev-only reset/toggle... instead of actually
 * waiting a day."
 */
export function seedFakePriorSession(idiomId: string): void {
  // Backdated by a day so it reads sensibly if completedAt is ever
  // surfaced or used for real gating later — not load-bearing today.
  recordCompletedSession([idiomId], Date.now() - 86_400_000);
}
