import { pullFromCloud, pushToCloud, adoptCloudCode, getLocalCloudCode, ensureLocalCloudCode, type CloudSyncResult, type CloudLoadResult } from "../shared/cloudSync";
import { isValidCloudSaveCode } from "../shared/cloudSaveValidation";
import { exportScoresForCloud, mergeScoresFromCloud, isScienceSnakeCloudSave } from "./scienceSnakeScore";

/**
 * Science Snake's cloud sync for its high score / last-run record
 * (BACKLOG.md's "Cloud-sync for the high score" entry). Reuses
 * idiom-door's no-accounts backend (shared/cloudSync.ts,
 * api/cloud-save.ts) but under its own "science-snake" server namespace
 * and its own locally-stored code, per the completely-independent-game
 * decision (DECISIONS.md) — so the two games' saves can never overwrite
 * each other, even on a shared origin.
 *
 * No page code here, so it's unit-testable with a stubbed fetch;
 * cloudSaveStatus.ts is the thin DOM wiring on top.
 */

export const SCIENCE_SNAKE_CLOUD_CODE_KEY = "science-snake-cloud-code";
const GAME = "science-snake";

export function getScienceSnakeCloudCode(): string | null {
  return getLocalCloudCode(SCIENCE_SNAKE_CLOUD_CODE_KEY);
}

export function ensureScienceSnakeCloudCode(rng: () => number = Math.random): string {
  return ensureLocalCloudCode(rng, SCIENCE_SNAKE_CLOUD_CODE_KEY);
}

/**
 * Pulls this code's Science Snake save. An earlier version of this sync
 * (live briefly from 2026-09-25, PR #63) stored Science Snake saves
 * without naming a game, i.e. in idiom-door's namespace. So when the
 * science-snake namespace has nothing, this also looks there, and uses
 * what it finds only if it's actually a Science Snake save — the next
 * push then stores it in the right place. (The old copy is left alone:
 * it can't be told apart from an idiom-door save by key alone, so
 * nothing here ever writes to or deletes from that namespace.)
 */
async function pullScienceSnakeSave(code: string): Promise<CloudLoadResult> {
  const pulled = await pullFromCloud(code, GAME);
  if (pulled.ok || pulled.reason !== "not-found") return pulled;
  const legacy = await pullFromCloud(code);
  if (legacy.ok && isScienceSnakeCloudSave(legacy.data)) return legacy;
  return pulled;
}

/**
 * Pull, merge, then push — not a blind push. A plain push would let
 * whichever device synced last overwrite the other's scores (device A
 * pushing its high score of 80 over the 120 device B pushed earlier);
 * merging first means the cloud copy only ever gains. A 404 just means
 * nothing's been saved under this code yet, so the push goes ahead;
 * any other pull failure stops before pushing, since pushing without
 * having seen the cloud copy is exactly the overwrite this avoids.
 */
export async function syncScoresWithCloud(code: string): Promise<CloudSyncResult> {
  const pulled = await pullScienceSnakeSave(code);
  if (pulled.ok) {
    mergeScoresFromCloud(pulled.data);
  } else if (pulled.reason !== "not-found") {
    return pulled;
  }
  return pushToCloud(code, exportScoresForCloud(), GAME);
}

/**
 * Restores from a code typed in from another device: merges that
 * code's scores in and adopts it as this device's own code from now
 * on. A code with no Science Snake save behind it (never used, or only
 * ever used by idiom-door — the server keeps those separate, but this
 * also checks the data's shape) reports "not-found" and is *not*
 * adopted, so a mistyped code can't quietly redirect future syncs.
 * The merged result is pushed back best-effort; the restore itself has
 * already succeeded locally either way.
 */
export async function restoreScoresFromCloud(rawCode: string): Promise<CloudSyncResult> {
  const code = rawCode.trim().toUpperCase();
  if (!isValidCloudSaveCode(code)) return { ok: false, reason: "invalid-code" };
  const pulled = await pullScienceSnakeSave(code);
  if (!pulled.ok) return pulled;
  if (!mergeScoresFromCloud(pulled.data)) return { ok: false, reason: "not-found" };
  adoptCloudCode(code, SCIENCE_SNAKE_CLOUD_CODE_KEY);
  await pushToCloud(code, exportScoresForCloud(), GAME);
  return { ok: true };
}
