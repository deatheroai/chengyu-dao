/**
 * Milestone-finale matching: BACKLOG.md's 2026-09-08 "Remove the
 * per-session match warm-up; matching becomes a milestone-finale-only
 * mechanic" entry. Every time the cumulative discovered-idiom count
 * (sessionHistory.ts's `allDiscoveredIdiomIds`) crosses a new multiple
 * of `MILESTONE_BATCH_SIZE`, that fresh batch triggers a celebratory
 * match milestone — the existing idiom-halves mechanic
 * (IdiomMatchScene/matchProgress.ts/matchLevelContent.ts's
 * `buildMatchLevel`, unchanged), split into `MILESTONE_SUB_ROUNDS`
 * sub-rounds, scoped to that batch only (not the whole history).
 *
 * This module owns two separate things, same "small self-contained
 * on-device history, same shape as saves already work" pattern as
 * shared/sessionHistory.ts itself (a deliberate second localStorage key
 * rather than folding into that one — a discovered-idiom record and a
 * milestone-finale record are different shaped facts, and keeping them
 * apart means a future change to one's shape can't accidentally corrupt
 * the other):
 *
 * 1. A tiny on-device-only history of every *finished* milestone's
 *    final HP, so a finished milestone can show it against past ones
 *    ("Round 2: 480 HP — Round 1 was 410, you're improving!") — a
 *    personal-best list and a round-over-round trend are the same
 *    underlying data, just displayed two ways (bestFinalHp/
 *    previousMilestoneFinalHp below).
 * 2. `pendingMatchMilestone`, a pure function (no localStorage of its
 *    own — takes the discovered-id list and the highest already-
 *    recorded milestone number as plain arguments, same "content-only,
 *    decoupled from that module's own machinery" split
 *    matchLevelContent.ts's own doc comment already establishes for its
 *    relationship to levelContent.ts) that decides whether a fresh
 *    milestone is due right now.
 *
 * Deliberately *not* wired into cloudSync.ts's export/import alongside
 * sessionHistory.ts's own — that's real follow-up scope of its own
 * (syncing this second key needs the same merge-not-overwrite care
 * exportForCloud/importFromCloud already give session history), not a
 * silent gap to paper over here. A milestone re-earned on a second,
 * not-yet-synced device just replays that milestone once more — no
 * fail state, same as everything else in this project.
 */
const STORAGE_KEY = "idiom-match-milestone-history";

export interface MatchMilestoneRecord {
  /** 1-indexed — milestone 1 is idioms 1-15 (discovery order), 2 is
   * 16-30, and so on. */
  milestoneNumber: number;
  finalHp: number;
  completedAt: number;
}

interface MatchMilestoneHistoryData {
  milestones: MatchMilestoneRecord[];
}

function load(): MatchMilestoneHistoryData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { milestones: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.milestones)) return { milestones: [] };
    return parsed as MatchMilestoneHistoryData;
  } catch {
    return { milestones: [] };
  }
}

function save(data: MatchMilestoneHistoryData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Called once a milestone's last sub-round resolves. */
export function recordMatchMilestone(milestoneNumber: number, finalHp: number, completedAt: number = Date.now()): void {
  const data = load();
  data.milestones.push({ milestoneNumber, finalHp, completedAt });
  save(data);
}

export function matchMilestoneHistory(): MatchMilestoneRecord[] {
  return load().milestones;
}

/** 0 if no milestone has ever been recorded yet. */
export function highestRecordedMilestoneNumber(): number {
  return load().milestones.reduce((max, m) => Math.max(max, m.milestoneNumber), 0);
}

/** The best final HP across every milestone finished *before*
 * `milestoneNumber` — null if this is the very first, so the finale
 * summary card can skip the "personal best" line entirely rather than
 * showing a meaningless comparison. */
export function bestFinalHp(milestoneNumber: number): number | null {
  const prior = matchMilestoneHistory().filter((m) => m.milestoneNumber < milestoneNumber);
  if (prior.length === 0) return null;
  return Math.max(...prior.map((m) => m.finalHp));
}

/** The immediately-previous milestone's final HP, for the round-over-
 * round trend line ("Round 1 was 410") — null if this is the first. */
export function previousMilestoneFinalHp(milestoneNumber: number): number | null {
  const prev = matchMilestoneHistory().find((m) => m.milestoneNumber === milestoneNumber - 1);
  return prev ? prev.finalHp : null;
}

export function clearMatchMilestoneHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** How many freshly-discovered idioms make up one milestone batch. */
export const MILESTONE_BATCH_SIZE = 15;
/** The milestone's own idiom-halves mechanic is split into this many
 * sub-rounds, each covering an equal slice of the batch — per your
 * steer, gentler than one 15-pair sitting and gives the child a clear
 * "progress after each stage" beat (main.ts's milestone-round card)
 * rather than one long uninterrupted round. */
export const MILESTONE_SUB_ROUNDS = 3;
/** `MILESTONE_BATCH_SIZE` must divide evenly by `MILESTONE_SUB_ROUNDS`
 * — both are this project's own authored constants (not user input),
 * so an uneven split would be a real bug here, not a runtime edge case
 * to defend against silently. */
if (MILESTONE_BATCH_SIZE % MILESTONE_SUB_ROUNDS !== 0) {
  throw new Error(`MILESTONE_BATCH_SIZE (${MILESTONE_BATCH_SIZE}) must divide evenly by MILESTONE_SUB_ROUNDS (${MILESTONE_SUB_ROUNDS})`);
}
export const IDIOMS_PER_SUB_ROUND = MILESTONE_BATCH_SIZE / MILESTONE_SUB_ROUNDS;

export interface MatchMilestone {
  milestoneNumber: number;
  /** Exactly `MILESTONE_BATCH_SIZE` ids, in first-discovered order. */
  idiomIds: string[];
}

/**
 * Pure: given every discovered idiom id (in first-discovered order —
 * sessionHistory.ts's `allDiscoveredIdiomIds` already returns them that
 * way, since it builds a `Set` by iterating completed sessions in
 * chronological order and `Set` preserves insertion order) and the
 * highest milestone number already recorded, returns the next milestone
 * due to run, or null if none is pending.
 *
 * Only ever returns the *next* one, even if a cloud-restore merge (or
 * seeded test data) jumped the discovered count past more than one
 * threshold at once — main.ts re-checks after recording each milestone,
 * so a multi-threshold jump plays out as several milestones back to
 * back rather than being silently skipped or batched into one.
 */
export function pendingMatchMilestone(discoveredIdiomIds: string[], highestRecorded: number): MatchMilestone | null {
  const reached = Math.floor(discoveredIdiomIds.length / MILESTONE_BATCH_SIZE);
  if (reached <= highestRecorded) return null;
  const milestoneNumber = highestRecorded + 1;
  const start = (milestoneNumber - 1) * MILESTONE_BATCH_SIZE;
  return { milestoneNumber, idiomIds: discoveredIdiomIds.slice(start, start + MILESTONE_BATCH_SIZE) };
}

/** Splits a milestone's batch into `MILESTONE_SUB_ROUNDS` equal, in-order
 * chunks — no reshuffling needed here: the discovered-id order it's
 * built from is already effectively randomized (sessionIdioms.ts draws
 * each session's idioms from a daily-seeded shuffle), and
 * matchLevelContent.ts's own `buildMatchLevel` shuffles each sub-round's
 * tile *layout* independently regardless. */
export function splitIntoSubRounds(idiomIds: string[]): string[][] {
  const rounds: string[][] = [];
  for (let i = 0; i < idiomIds.length; i += IDIOMS_PER_SUB_ROUND) {
    rounds.push(idiomIds.slice(i, i + IDIOMS_PER_SUB_ROUND));
  }
  return rounds;
}
