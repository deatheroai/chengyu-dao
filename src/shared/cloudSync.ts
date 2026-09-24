import { generateCloudSaveCode, isValidCloudSaveCode, DEFAULT_CLOUD_SAVE_GAME, type CloudSaveGame } from "./cloudSaveValidation";

/** idiom-door's key, and the default for every code helper below.
 * Another game passes its own key so its code is its own — see
 * science-snake/cloudSaveStatus.ts. */
const CLOUD_CODE_STORAGE_KEY = "idiom-cloud-code";
const API_PATH = "/api/cloud-save";

/** The code this device is already syncing under, or null if cloud save
 * has never been turned on here. Storing the code itself locally (not
 * just "cloud save is on") is what makes restoring on a *second* device
 * possible — that device pastes this same code in. */
export function getLocalCloudCode(storageKey: string = CLOUD_CODE_STORAGE_KEY): string | null {
  const stored = localStorage.getItem(storageKey);
  return isValidCloudSaveCode(stored) ? stored : null;
}

function setLocalCloudCode(code: string, storageKey: string): void {
  localStorage.setItem(storageKey, code);
}

/** Returns this device's existing cloud-save code, or mints and
 * remembers a fresh one on first use. Idempotent — safe to call every
 * time the cloud-save panel opens. */
export function ensureLocalCloudCode(rng: () => number = Math.random, storageKey: string = CLOUD_CODE_STORAGE_KEY): string {
  const existing = getLocalCloudCode(storageKey);
  if (existing) return existing;
  const code = generateCloudSaveCode(rng);
  setLocalCloudCode(code, storageKey);
  return code;
}

export type CloudSyncFailureReason = "not-configured" | "not-found" | "invalid-code" | "network";

/**
 * `detail` is only ever set alongside reason "network" — the catch-all
 * for anything that isn't the two statuses (501, and 404 for a pull)
 * this module already gives a specific reason for. Collapsing every one
 * of those into an identical, detail-free "network" message once made a
 * genuine server-side error (a 500 from a bug in api/cloud-save.ts, say)
 * look indistinguishable from "you're offline" — this exists so that
 * distinction survives long enough to show up in the UI and actually be
 * diagnosable (2026-08-30: this is exactly the gap that hid restoring
 * being broken while saving worked fine, since the two hit different
 * response branches in api/cloud-save.ts).
 */
export type CloudSyncResult = { ok: true } | { ok: false; reason: CloudSyncFailureReason; detail?: string };

export type CloudLoadResult = { ok: true; data: unknown } | { ok: false; reason: CloudSyncFailureReason; detail?: string };

/** Best-effort description of a non-ok response for the `detail` field
 * above — the server's own `{error: "..."}` body when there is one
 * (api/cloud-save.ts always sends one), else just the HTTP status. */
async function describeFailedResponse(response: Response): Promise<string> {
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === "object" && "error" in body) {
      return `HTTP ${response.status}: ${String((body as { error: unknown }).error)}`;
    }
  } catch {
    // Body wasn't JSON (or was already consumed) — fall through.
  }
  return `HTTP ${response.status}`;
}

function describeThrownError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Pushes `data` to the cloud under `code`. Never throws — every
 * failure mode (backend not provisioned yet, offline, a genuine server
 * error) comes back as a typed result instead, since this always runs
 * best-effort alongside the local save that already succeeded; a cloud
 * hiccup must never look like *the game* failed to save. */
export async function pushToCloud(code: string, data: unknown, game: CloudSaveGame = DEFAULT_CLOUD_SAVE_GAME): Promise<CloudSyncResult> {
  if (!isValidCloudSaveCode(code)) return { ok: false, reason: "invalid-code" };
  try {
    // The default game is left out of the request entirely (the server
    // treats a missing game as idiom-door), so idiom-door's requests are
    // exactly what they were before per-game saves existed.
    const body = game === DEFAULT_CLOUD_SAVE_GAME ? { code, data } : { code, data, game };
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 501) return { ok: false, reason: "not-configured" };
    if (!response.ok) return { ok: false, reason: "network", detail: await describeFailedResponse(response) };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "network", detail: describeThrownError(err) };
  }
}

/** Fetches whatever's stored under `code`. Same never-throws contract
 * as pushToCloud. */
export async function pullFromCloud(code: string, game: CloudSaveGame = DEFAULT_CLOUD_SAVE_GAME): Promise<CloudLoadResult> {
  if (!isValidCloudSaveCode(code)) return { ok: false, reason: "invalid-code" };
  try {
    const gameParam = game === DEFAULT_CLOUD_SAVE_GAME ? "" : `&game=${encodeURIComponent(game)}`;
    const response = await fetch(`${API_PATH}?code=${encodeURIComponent(code)}${gameParam}`);
    if (response.status === 501) return { ok: false, reason: "not-configured" };
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (!response.ok) return { ok: false, reason: "network", detail: await describeFailedResponse(response) };
    const body = (await response.json()) as { data?: unknown };
    return { ok: true, data: body.data };
  } catch (err) {
    return { ok: false, reason: "network", detail: describeThrownError(err) };
  }
}

/** A restored/typed code always becomes this device's own going-forward
 * sync code too — so playing more afterward keeps updating the same
 * save rather than silently drifting from it. */
export function adoptCloudCode(code: string, storageKey: string = CLOUD_CODE_STORAGE_KEY): void {
  if (isValidCloudSaveCode(code)) setLocalCloudCode(code, storageKey);
}
