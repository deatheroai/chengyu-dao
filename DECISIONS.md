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
