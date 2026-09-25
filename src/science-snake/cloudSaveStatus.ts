import { ensureLocalCloudCode, pushToCloud, pullFromCloud, adoptCloudCode, type CloudSyncFailureReason } from "../shared/cloudSync";
import { exportForCloud, importFromCloud } from "./scienceSnakeScore";
import { isValidCloudSaveCode } from "../shared/cloudSaveValidation";

/**
 * Wires the cloud-save panel (science-snake.html's #cloud-save-card) —
 * BACKLOG.md's "Cloud-sync for the high score / last-run record" entry.
 * A deliberate standalone copy of idiom-door's own cloudSaveStatus.ts,
 * not a shared module — same "completely independent games" reasoning
 * seededRandom.ts already documents — but it reuses idiom-door's actual
 * cloud-save backend/API (shared/cloudSync.ts, shared/
 * cloudSaveValidation.ts, api/cloud-save.ts) under its own device code
 * (its own localStorage key, passed through to every cloudSync.ts call
 * below) so the two games' saves never collide under the same code.
 */

const CLOUD_CODE_STORAGE_KEY = "science-snake-cloud-code";

const STATUS_MESSAGES: Record<CloudSyncFailureReason, string> = {
  "not-configured": "Cloud save isn't set up for this game yet — try again later.",
  "not-found": "No save found for that code. Double-check it and try again.",
  "invalid-code": "That doesn't look like a save code — check for typos.",
  network: "Couldn't reach the cloud save server. Check your connection and try again.",
};

function setStatus(card: HTMLElement, message: string): void {
  const el = card.querySelector<HTMLElement>("[data-cloud-status]");
  if (el) el.textContent = message;
}

function formatFailureMessage(result: { reason: CloudSyncFailureReason; detail?: string }): string {
  const message = STATUS_MESSAGES[result.reason];
  return result.detail ? `${message} (${result.detail})` : message;
}

function getCard(): HTMLElement | null {
  return document.getElementById("cloud-save-card");
}

/** Opens the panel, revealing this device's own code (minting one on
 * first open) and best-effort pushing the current local high
 * score/last-run under it — so opening the panel is itself enough to
 * start syncing, with nothing further to press. */
export function showCloudSaveCard(): void {
  const card = getCard();
  if (!card) return;
  const code = ensureLocalCloudCode(Math.random, CLOUD_CODE_STORAGE_KEY);
  const codeEl = card.querySelector<HTMLElement>("[data-cloud-code]");
  if (codeEl) codeEl.textContent = code;
  setStatus(card, "");
  card.classList.add("visible");

  void pushToCloud(code, exportForCloud()).then((result) => {
    if (!card.classList.contains("visible")) return; // closed before this resolved
    setStatus(card, result.ok ? "Saved to the cloud ✓" : formatFailureMessage(result));
  });
}

export function hideCloudSaveCard(): void {
  getCard()?.classList.remove("visible");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}

export async function handleCopyCode(): Promise<void> {
  const card = getCard();
  if (!card) return;
  const code = card.querySelector<HTMLElement>("[data-cloud-code]")?.textContent ?? "";
  if (!code) return;
  const copied = await copyText(code);
  setStatus(card, copied ? "Code copied!" : "Couldn't copy — select and copy the code by hand.");
}

/**
 * Restores from a typed-in code: pulls that code's data, merges it into
 * local high-score/last-run (scienceSnakeScore.ts's importFromCloud —
 * higher score / more recent run wins, never a blind overwrite), and
 * adopts the code as this device's own going forward. Reloads on success
 * so the high-score header picks up the merged result immediately, same
 * as idiom-door's own restore flow.
 */
export async function handleRestoreFromCode(rawCode: string): Promise<void> {
  const card = getCard();
  if (!card) return;
  const code = rawCode.trim().toUpperCase();
  if (!isValidCloudSaveCode(code)) {
    setStatus(card, STATUS_MESSAGES["invalid-code"]);
    return;
  }
  setStatus(card, "Restoring…");
  const result = await pullFromCloud(code);
  if (!result.ok) {
    setStatus(card, formatFailureMessage(result));
    return;
  }
  importFromCloud(result.data);
  adoptCloudCode(code, CLOUD_CODE_STORAGE_KEY);
  location.reload();
}
