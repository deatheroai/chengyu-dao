/**
 * Shared between the client (cloudSync.ts, generating/validating a code
 * before it ever leaves the device) and the server (api/cloud-save.ts,
 * validating what actually lands in the request) so both sides agree on
 * exactly one definition of "a well-formed code" / "a payload worth
 * storing" — see DECISIONS.md's 2026-08-30 cloud-saves entry.
 *
 * The alphabet deliberately excludes visually-ambiguous characters
 * (0/O, 1/I/L) since a code is meant to be read off one device's screen
 * and typed on another's, often by a child.
 */
export const CLOUD_SAVE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CLOUD_SAVE_CODE_LENGTH = 8;

const CODE_PATTERN = new RegExp(`^[${CLOUD_SAVE_CODE_ALPHABET}]{${CLOUD_SAVE_CODE_LENGTH}}$`);

/**
 * No accounts/auth (see DECISIONS.md) means this code is the *entire*
 * access control on a save — keeping the space large discourages
 * casually guessing someone else's, without needing a login system.
 * 33^8 is ~2.8 * 10^12 possibilities.
 */
export function isValidCloudSaveCode(code: unknown): code is string {
  return typeof code === "string" && CODE_PATTERN.test(code);
}

/** Generates a fresh code. Injectable rng only so tests can pin the
 * output deterministically, same pattern as sessionHistory.ts's
 * pickResurfaceIdiomId. */
export function generateCloudSaveCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CLOUD_SAVE_CODE_LENGTH; i++) {
    code += CLOUD_SAVE_CODE_ALPHABET[Math.floor(rng() * CLOUD_SAVE_CODE_ALPHABET.length)];
  }
  return code;
}

/** A generous but real ceiling on what a save blob may contain — this
 * repo's whole save today is a short list of {idiomIds, completedAt}
 * records, nowhere near this size; the cap exists so an unauthenticated
 * write endpoint (no accounts, just a code) can't be used to stash
 * arbitrarily large payloads. */
export const MAX_CLOUD_SAVE_PAYLOAD_BYTES = 20_000;

export function isValidCloudSavePayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  try {
    return JSON.stringify(data).length <= MAX_CLOUD_SAVE_PAYLOAD_BYTES;
  } catch {
    return false;
  }
}
