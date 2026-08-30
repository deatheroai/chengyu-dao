import { generateCloudSaveCode, isValidCloudSaveCode } from "./cloudSaveValidation";

const CLOUD_CODE_STORAGE_KEY = "idiom-cloud-code";
const API_PATH = "/api/cloud-save";

/** The code this device is already syncing under, or null if cloud save
 * has never been turned on here. Storing the code itself locally (not
 * just "cloud save is on") is what makes restoring on a *second* device
 * possible — that device pastes this same code in. */
export function getLocalCloudCode(): string | null {
  const stored = localStorage.getItem(CLOUD_CODE_STORAGE_KEY);
  return isValidCloudSaveCode(stored) ? stored : null;
}

function setLocalCloudCode(code: string): void {
  localStorage.setItem(CLOUD_CODE_STORAGE_KEY, code);
}

/** Returns this device's existing cloud-save code, or mints and
 * remembers a fresh one on first use. Idempotent — safe to call every
 * time the cloud-save panel opens. */
export function ensureLocalCloudCode(rng: () => number = Math.random): string {
  const existing = getLocalCloudCode();
  if (existing) return existing;
  const code = generateCloudSaveCode(rng);
  setLocalCloudCode(code);
  return code;
}

export type CloudSyncFailureReason = "not-configured" | "not-found" | "invalid-code" | "network";

export type CloudSyncResult = { ok: true } | { ok: false; reason: CloudSyncFailureReason };

export type CloudLoadResult = { ok: true; data: unknown } | { ok: false; reason: CloudSyncFailureReason };

/** Pushes `data` to the cloud under `code`. Never throws — every
 * failure mode (backend not provisioned yet, offline, a genuine server
 * error) comes back as a typed result instead, since this always runs
 * best-effort alongside the local save that already succeeded; a cloud
 * hiccup must never look like *the game* failed to save. */
export async function pushToCloud(code: string, data: unknown): Promise<CloudSyncResult> {
  if (!isValidCloudSaveCode(code)) return { ok: false, reason: "invalid-code" };
  try {
    const response = await fetch(API_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, data }),
    });
    if (response.status === 501) return { ok: false, reason: "not-configured" };
    if (!response.ok) return { ok: false, reason: "network" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Fetches whatever's stored under `code`. Same never-throws contract
 * as pushToCloud. */
export async function pullFromCloud(code: string): Promise<CloudLoadResult> {
  if (!isValidCloudSaveCode(code)) return { ok: false, reason: "invalid-code" };
  try {
    const response = await fetch(`${API_PATH}?code=${encodeURIComponent(code)}`);
    if (response.status === 501) return { ok: false, reason: "not-configured" };
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (!response.ok) return { ok: false, reason: "network" };
    const body = (await response.json()) as { data?: unknown };
    return { ok: true, data: body.data };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** A restored/typed code always becomes this device's own going-forward
 * sync code too — so playing more afterward keeps updating the same
 * save rather than silently drifting from it. */
export function adoptCloudCode(code: string): void {
  if (isValidCloudSaveCode(code)) setLocalCloudCode(code);
}
