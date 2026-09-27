import type { CloudSyncFailureReason, CloudSyncResult } from "../shared/cloudSync";
import { ensureScienceSnakeCloudCode, getScienceSnakeCloudCode, restoreScoresFromCloud, syncScoresWithCloud } from "./scoreCloudSync";

/**
 * Wires science-snake.html's #cloud-save-card — the same panel shape as
 * idiom-door's own (idiom-door/cloudSaveStatus.ts): this device's code
 * to copy onto another device, plus a field to restore from a code
 * typed in from one. It's opened only from the start/win/lose cards,
 * never mid-run, so the game never keeps moving underneath it.
 */

const STATUS_MESSAGES: Record<CloudSyncFailureReason, string> = {
  "not-configured": "Cloud save isn't set up for this game yet — try again later.",
  "not-found": "No Science Snake save found for that code. Double-check it and try again.",
  "invalid-code": "That doesn't look like a save code — check for typos.",
  network: "Couldn't reach the cloud save server. Check your connection and try again.",
};

function formatResult(result: CloudSyncResult, successMessage: string): string {
  if (result.ok) return successMessage;
  const message = STATUS_MESSAGES[result.reason];
  return result.detail ? `${message} (${result.detail})` : message;
}

function getCard(): HTMLElement | null {
  return document.getElementById("cloud-save-card");
}

function setStatus(card: HTMLElement, message: string): void {
  const el = card.querySelector<HTMLElement>("[data-cloud-status]");
  if (el) el.textContent = message;
}

/** Opens the panel showing this device's code (minting one on first
 * open), then syncs straight away — opening it is enough to turn sync
 * on, same as idiom-door. `onScoresChanged` lets the page refresh its
 * high-score display if the sync pulled in a better score. */
export function showCloudSaveCard(onScoresChanged: () => void): void {
  const card = getCard();
  if (!card) return;
  const code = ensureScienceSnakeCloudCode();
  const codeEl = card.querySelector<HTMLElement>("[data-cloud-code]");
  if (codeEl) codeEl.textContent = code;
  setStatus(card, "Saving…");
  card.classList.add("visible");

  void syncScoresWithCloud(code).then((result) => {
    if (result.ok) onScoresChanged();
    if (!card.classList.contains("visible")) return; // closed before this resolved
    setStatus(card, formatResult(result, "Saved to the cloud ✓"));
  });
}

export function hideCloudSaveCard(): void {
  getCard()?.classList.remove("visible");
}

/** Copies this device's code, with a textarea fallback for a context
 * where the async Clipboard API isn't available. */
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
  setStatus(card, (await copyText(code)) ? "Code copied!" : "Couldn't copy — select and copy the code by hand.");
}

/** Restores from a typed code. Unlike idiom-door this doesn't reload
 * the page — the only thing that changes is the stored scores, so
 * refreshing the high-score display is enough. */
export async function handleRestoreFromCode(rawCode: string, onScoresChanged: () => void): Promise<void> {
  const card = getCard();
  if (!card) return;
  setStatus(card, "Restoring…");
  const result = await restoreScoresFromCloud(rawCode);
  if (result.ok) {
    const codeEl = card.querySelector<HTMLElement>("[data-cloud-code]");
    if (codeEl) codeEl.textContent = getScienceSnakeCloudCode() ?? "";
    onScoresChanged();
  }
  setStatus(card, formatResult(result, "Scores restored ✓"));
}

/** Best-effort background sync after a finished run — only once sync
 * has been turned on here (a code exists), and silently, without
 * opening the panel. */
export function syncAfterRun(onScoresChanged: () => void): void {
  const code = getScienceSnakeCloudCode();
  if (!code) return;
  void syncScoresWithCloud(code).then((result) => {
    if (result.ok) onScoresChanged();
  });
}
