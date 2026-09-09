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

export interface SessionHistoryData {
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

/** How many sessions this device has ever completed — `hasPriorSession`
 * only needed "any at all," but the writing/tracing stage's own
 * skip-the-demo-once-experienced gate (writingScore.ts's
 * `shouldSkipStrokeDemo`) needs the actual count. */
export function completedSessionCount(): number {
  return load().completedSessions.length;
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

/** Cloud-save export (cloudSync.ts) — the exact shape stored under a
 * device's save code, so a restore on another device round-trips
 * through importFromCloud below with nothing lost or reshaped. */
export function exportForCloud(): SessionHistoryData {
  return load();
}

/**
 * Cloud-save restore: merges a fetched save into whatever's already
 * local rather than overwriting it outright, so restoring on a device
 * that already has *some* history (e.g. re-entering a code after
 * playing a little on a fresh device first) can't lose either side's
 * progress. Sessions are deduplicated by their (completedAt, idiomIds)
 * pair — the same session recorded twice (e.g. syncing the same code on
 * two devices) merges into one entry instead of duplicating.
 */
export function importFromCloud(remote: unknown): void {
  if (!remote || typeof remote !== "object" || !Array.isArray((remote as SessionHistoryData).completedSessions)) {
    return;
  }
  const local = load();
  const seen = new Set(local.completedSessions.map(sessionKey));
  for (const session of (remote as SessionHistoryData).completedSessions) {
    if (!session || !Array.isArray(session.idiomIds) || typeof session.completedAt !== "number") continue;
    const key = sessionKey(session);
    if (seen.has(key)) continue;
    seen.add(key);
    local.completedSessions.push(session);
  }
  save(local);
}

function sessionKey(session: CompletedSessionRecord): string {
  return `${session.completedAt}:${session.idiomIds.join(",")}`;
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
