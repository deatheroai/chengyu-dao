# Decisions Log

How this file is used is described in [`AUTONOMY.md`](./AUTONOMY.md).
Short version: things a session can't safely decide for itself go in
**Pending**, get asked about in one batch at the next check-in, and move to
**Resolved** once answered. **Needs Your Action** is different — not a
choice, just a step only you can physically do (flipping a dashboard
setting, creating an account); the loop won't block other work waiting on
these.

## Pending Decisions

None open right now.

## Needs Your Action (not decisions — steps only you can take)

- **Confirm Vercel's Production Branch is `main`.** Free (Hobby) tier
  doesn't allow pointing Production at another branch — this repo's own
  daily-cycle/session convention (see `AUTONOMY.md`'s "Landing changes")
  depends on that being true, same as it was for the parent `TestAI`
  monorepo. Nothing to do if it's already the default; flag it if you've
  changed it.

## Resolved

- **2026-09-11 — Daily cycle: shipped the standing example-sentence
  review pass, found (but didn't land) a real e2e robustness bug along
  the way — pushed and opened a PR without merging.** Pending Decisions
  was empty; no open GitHub issues or PRs to check in on first.
  `BACKLOG.md`'s unblocked `todo` items were all genuinely buildable, so
  picked the top-to-bottom next one, the standing "review the
  example-sentence pool" track: hand-read all 45 idioms'
  `exampleSentence.hanzi` against their own `meaning` field, found and
  fixed one (同甘共苦 only showed half of its "sweet times and bitter
  times together" meaning) — see `BACKLOG.md`'s entry for detail.
  `npm run typecheck`/`test` (335 passed, unchanged)/`build` all green.
  `npm run test:e2e` was not: one mobile test
  (`idiom-door.spec.ts`'s "each jump costs HP, and a wrong catch costs
  extra on top") failed. Before treating that as this cycle's own
  regression, checked it against an unmodified `origin/main` worktree
  (`git worktree add`, no code changes) — same failure, identically,
  confirming it's pre-existing and unrelated to a content-only sentence
  edit. Root-caused and logged as its own `BACKLOG.md` `todo` entry
  (a date-seeded level-layout edge case where a deliberate "wrong tile"
  jump chain-catches into the actually-correct tile within the same
  arc) rather than attempting a fix in the same sitting — out of scope
  for this cycle's chosen item, and worth its own focused session per
  this file's "don't manufacture busywork" guidance in reverse (don't
  bolt an unrelated fix onto an unrelated PR either). Per `AUTONOMY.md`'s
  landing gate (typecheck/test/build/test:e2e must **all** be green
  before the daily cycle auto-merges its own PR) and this cycle's own
  explicit instructions, did not merge: pushed
  `claude/daily-2026-09-11` and opened a PR describing the sentence fix
  and this e2e finding, then stopped rather than merging with red CI.
- **2026-09-10 — Daily cycle: shipped the door-stage burning-tile fix.**
  Pending Decisions was empty. No open GitHub issues or PRs to check in on
  first. `BACKLOG.md`'s unblocked `todo` items (writing/tracing stage + its
  HP gate, door-stage burning tile, standing example-sentence review track,
  milestone-only matching, growing the idiom pool toward 100) were all
  genuinely buildable — none needed a decision — so picked the smallest,
  self-contained one that was pure implementation rather than a fresh
  content-authoring/sourcing pass or a scope decision of its own: a wrong
  catch in the door stage now scorches that specific tile and marks it
  inert, so one lingering "touch-and-go" jump near a tile can't register
  several repeat wrong catches on the same tile. Checked first that this
  can't soft-lock a level — `levelContent.ts` already generates 5-9 tiles
  per character specifically for this kind of redundancy — before landing
  it; see `BACKLOG.md`'s entry for the full detail. All gates green
  (typecheck/test/build/e2e); PR opened and merged per the standing
  2026-08-26 auto-land policy. The writing/tracing stage (new mechanic +
  bundled HanziWriter data), its HP-gate follow-up, milestone-only
  matching, and the next idiom-pool batch are left for future sessions —
  each is its own real scope, not a fit alongside this one.
- **2026-09-09 — Daily cycle: shipped the door-stage glyph-matching fix,
  unblocking the last 3 idioms.** Pending Decisions was empty. No open
  GitHub issues or PRs to check in on first. `BACKLOG.md`'s unblocked
  `todo` items (writing/tracing stage + its HP gate, door-stage burning
  tile, this glyph-matching fix, milestone-only matching, growing the
  idiom pool) were all genuinely buildable — none needed a decision — so
  picked the smallest, most self-contained one for one focused session:
  door stage's catch check now matches a caught tile's actual glyph
  against the next-needed character instead of a pre-baked position
  index, which is what let 一心一意/有始有终/相亲相爱 (the 3 idioms that
  repeat a character) join the eligible pool — see `BACKLOG.md`'s entry
  for the full detail. All gates green (typecheck/test/build/e2e); PR
  opened and merged per the standing 2026-08-26 auto-land policy. The
  larger items (the writing/tracing stage + HP economy, burning tiles,
  milestone-only matching, growing the idiom pool toward 100) are left
  for future sessions — each is its own real scope, not a fit alongside
  this one.
- **2026-09-08 — Daily cycle check-in: nothing unblocked, no code
  changes.** Pending Decisions was empty. `BACKLOG.md`'s active sections
  (Chinese Idiom Discovery Game, Platform/infra) are all `done`; the only
  remaining entries are the three `blocked` "Later / explicitly out of
  scope for now" items (multiplayer, monetization, Upper Primary tier) —
  still deliberately deferred per `AUTONOMY.md`, not waiting on a decision
  to raise. No open GitHub issues or PRs. Checked `src/` for stray
  TODO/FIXME markers as a sanity check before concluding there was nothing
  to build — none found (the two case-insensitive grep hits were false
  positives from `...PositionsToDom`/`...positionsToDom` identifiers, not
  actual TODOs). CI on `main` (`cd5d7f4`) is green. Per `AUTONOMY.md`'s
  "don't manufacture busywork" guidance, this cycle made no code changes
  and ends here.
- **2026-09-07 — PR #17 (door-stage fall-speed tuning) merged by you;
  found and fixed the actual gap behind "why isn't automation telling
  you to merge?".** You merged #17 yourself; CI on `main` at the merge
  commit (`7aff858`) is green. The automation not offering to merge was
  working as designed — its own description asked for your subjective
  playtest read before judging it, same as #14/#16 before it, so no
  session should merge it unattended. But you flagged you could
  "only test on Vercel live" — i.e. only on the production URL, which
  only reflects `main`, so a not-yet-merged PR was untestable to you.
  That's a real gap: Vercel already posts a per-PR preview deployment
  (`vercel[bot]`'s comment on #17 linked
  `chengyu-dao-git-claude-door-fast-fall-dai-fd9e.vercel.app`, live
  since the PR opened) that lets a PR be played *before* merging — it
  just wasn't being surfaced. Fixed by adding a "Playtest PRs before
  merging" convention to `AUTONOMY.md` requiring every PR description
  that asks for a human playtest to link its Vercel preview URL
  explicitly, instead of a vague "try it once deployed" that reads as
  post-merge.
- **2026-09-07 — Daily cycle check-in: nothing unblocked, no code
  changes.** Pending Decisions was empty. `BACKLOG.md`'s active sections
  (Chinese Idiom Discovery Game, Platform/infra) are all `done`; the only
  remaining entries are the three `blocked` "Later / explicitly out of
  scope for now" items (multiplayer, monetization, Upper Primary tier) —
  still deliberately deferred per `AUTONOMY.md`, not waiting on a decision
  to raise. No open GitHub issues. PR #17 (door-stage fall-speed tuning)
  is still the only open PR — unchanged since the 2026-09-06 check-in,
  still explicitly waiting on your own playtest before it's judged, so
  left unmerged again rather than auto-landed; still logged above under
  "Needs Your Action". CI on `main` (`25feb7a`) is green. Per
  `AUTONOMY.md`'s "don't manufacture busywork" guidance, this cycle made
  no code changes and ends here.
- **2026-09-06 — Daily cycle check-in: nothing unblocked, no code
  changes.** Pending Decisions was empty. `BACKLOG.md`'s active sections
  (Chinese Idiom Discovery Game, Platform/infra) are all `done`; the only
  remaining entries are the three `blocked` "Later / explicitly out of
  scope for now" items (multiplayer, monetization, Upper Primary tier) —
  still deliberately deferred per `AUTONOMY.md`, not waiting on a decision
  to raise. No open GitHub issues. PR #17 (door-stage fall-speed tuning)
  is still the only open PR — unchanged since the 2026-09-05 check-in,
  still explicitly waiting on your own playtest before it's judged, so
  left unmerged again rather than auto-landed; still logged above under
  "Needs Your Action". CI on `main` (`6d42cbf`) is green. Per
  `AUTONOMY.md`'s "don't manufacture busywork" guidance, this cycle made
  no code changes and ends here.
- **2026-09-05 — Daily cycle check-in: nothing unblocked, no code
  changes.** Pending Decisions was empty. `BACKLOG.md`'s active sections
  (Chinese Idiom Discovery Game, Platform/infra) are all `done`; the only
  remaining entries are the three `blocked` "Later / explicitly out of
  scope for now" items (multiplayer, monetization, Upper Primary tier) —
  deliberately deferred per `AUTONOMY.md`, not waiting on a decision to
  raise. No open GitHub issues. One open PR, #17 (door-stage fall-speed
  tuning from an interactive session, all gates green, mergeable) — left
  unmerged rather than auto-landed since it's explicitly waiting on your
  own playtest, not this cycle's own work; logged above under "Needs
  Your Action" instead. CI on `main` (`3e9d15c`) is green. Per
  `AUTONOMY.md`'s "don't manufacture busywork" guidance, this cycle made
  no code changes and ends here.
- **2026-09-04 — Daily cycle check-in: nothing unblocked, no action taken.**
  Pending Decisions was empty. `BACKLOG.md`'s active sections (Chinese
  Idiom Discovery Game, Platform/infra) are all `done`; the only
  remaining entries are the three `blocked` "Later / explicitly out of
  scope for now" items (multiplayer, monetization, Upper Primary
  tier) — none of which are waiting on a decision to raise, they're
  deliberately deferred per `AUTONOMY.md` until explicitly asked for.
  No open GitHub issues or PRs either. CI on `main`
  (`b859eeb`) is green. Per `AUTONOMY.md`'s "don't manufacture busywork"
  guidance, this cycle made no code changes and ends here rather than
  inventing scope (e.g. expanding the curated 15-idiom set) that wasn't
  actually asked for.
- **2026-08-30 — Upstash Redis integration installed and connected.**
  The one human step `BACKLOG.md`'s cloud-saves entry needed — done;
  `/api/cloud-save` now has real `KV_REST_API_URL`/`KV_REST_API_TOKEN`
  (or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) to read, so
  the cloud-save panel should show "Saved to the cloud ✓" instead of
  "isn't set up yet" on the next deploy. Worth a quick manual check on
  the live site to confirm.
- **2026-08-30 — Build cloud saves now, Vercel-native backend, free
  tier only.** Asked directly (irreversible/costly-commitment call per
  `AUTONOMY.md`): yes, build it now — the original consolidation
  blocker resolved back on 2026-08-26. Backend is **Vercel-native**
  (Vercel Postgres/Neon or Vercel KV, decided at implementation time by
  whichever fits the save-data shape better) rather than adding a
  separate vendor like Firebase or Supabase, since the site is already
  fully committed to Vercel for hosting. **Free tier only for now** —
  no paid tier authorized. Sync should use a device link-code flow
  (type a short code from one device into another) rather than any
  account/auth system, since the audience is children and this avoids
  collecting personal information entirely. `BACKLOG.md`'s cloud-saves
  item is unblocked to reflect this.
- **2026-08-26 — `idiom-door` is the real root-URL game; the other five
  prototypes are archived.** Asked directly (this scope/direction call
  isn't guessable per `AUTONOMY.md`): `idiom-door` becomes the core
  mechanic (by far the most developed at the time, ~3065 lines vs.
  330-700 for the others, and already `index.html`'s redirect target).
  The losing prototypes (`idiom-reveal`, `meaning-check`, `catch-meaning`,
  `platform-catch`, `session`) are archived/deleted rather than kept
  around, per your answer — their still-useful pieces
  (`applicationCheck.ts`'s distractor-sentence builder,
  `positionStatus.ts`'s DOM-position test hook, `sessionHistory.ts`'s
  resurfacing logic) were moved into `src/shared/` since `idiom-door`
  already depended on (or, for `sessionHistory`, now newly uses) them —
  see this cycle's commit for the full file-by-file move/delete list.
  You also confirmed the architecture stays modular (mechanic-per-module,
  same as today) so a level's mechanic can still be swapped later without
  a rewrite — nothing about this consolidation forecloses that.
  `idiom-door`'s own content is still the fixed 3-idiom set it always
  had; drawing dynamically from the full 15-idiom pool is follow-up work,
  logged in `BACKLOG.md` rather than attempted in the same sitting, to
  avoid destabilizing its already-large, carefully-tuned e2e suite.
- **2026-08-25 — Split from the `TestAI` monorepo, brought `AUTONOMY.md`
  over.** `chengyu-dao` is now the game's standalone home (repo root *is*
  the game, no `game/` subdirectory). Ported and adapted the parent repo's
  autonomous-working-mode doc, plus this file and `BACKLOG.md`, so future
  sessions here follow the same decision-check-in/backlog-driven process
  instead of starting from scratch. Full history before the split lives in
  `TestAI`; see `README.md`'s History section for the condensed version.
- **2026-08-25 — Removed the old castle escape-room prototype.** The
  pre-pivot castle game (rooms, dial puzzle, inventory/puzzle-overlay UI,
  Firebase-backed cloud saves) was still being served at the site root
  even though the project pivoted to the idiom-learning concept back on
  2026-08-06. Deleted it; `index.html` now redirects to `idiom-door.html`.
  Also dropped the unused `firebase` dependency and its README section
  since nothing wires cloud saves into the idiom games today.
