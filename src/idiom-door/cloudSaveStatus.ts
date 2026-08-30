import { ensureLocalCloudCode, pushToCloud, pullFromCloud, adoptCloudCode, type CloudSyncFailureReason } from "../shared/cloudSync";
import { exportForCloud, importFromCloud } from "../shared/sessionHistory";
import { isValidCloudSaveCode } from "../shared/cloudSaveValidation";

/**
 * Wires the cloud-save panel (idiom-door.html's #cloud-save-card) — see
 * DECISIONS.md's 2026-08-30 entry: no accounts, a device-typed code is
 * the whole sync model, same "full-screen card" pattern every other
 * overlay in this game uses (matchHintStatus.ts, the resurface card,
 * etc.). Two things live in this one panel:
 *  - this device's own code, generated on first open and shown so it
 *    can be copied to another device;
 *  - a "restore from a code" field, for typing a code *from* another
 *    device to pull its progress in here.
 * Both directions go through sessionHistory.ts's merge-based
 * import/export, so neither ever loses progress the other side has.
 */

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

/** Appends a failure's `detail` (cloudSync.ts — the server's own error
 * message or HTTP status, when there is one) in parentheses after the
 * friendly reason text, so a genuine server-side bug doesn't read
 * identically to "you're offline" — see cloudSync.ts's CloudSyncResult
 * doc for why this exists. */
function formatFailureMessage(result: { reason: CloudSyncFailureReason; detail?: string }): string {
  const message = STATUS_MESSAGES[result.reason];
  return result.detail ? `${message} (${result.detail})` : message;
}

function getCard(): HTMLElement | null {
  return document.getElementById("cloud-save-card");
}

/** Opens the panel, revealing this device's own code (minting one on
 * first open) and best-effort pushing the current local save under it
 * — so opening the panel is itself enough to start syncing, with
 * nothing further to press. */
export function showCloudSaveCard(): void {
  const card = getCard();
  if (!card) return;
  const code = ensureLocalCloudCode();
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

/** Copies this device's code to the clipboard, with a plain textarea
 * fallback for a browser/context where the async Clipboard API isn't
 * available (e.g. no secure context). */
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
 * Restores progress from a typed-in code: pulls that code's data,
 * merges it into local history (sessionHistory.ts's importFromCloud —
 * union, not overwrite), and adopts the code as this device's own
 * going forward so anything played next keeps syncing to the same
 * save. Reloads on success so the resurfacing/summary flow picks up
 * the newly-merged history immediately, same as the dev-only
 * seed/clear controls already do.
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
  adoptCloudCode(code);
  location.reload();
}
