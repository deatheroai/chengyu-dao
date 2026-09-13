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

- **2026-09-13 — Daily cycle: idiom pool batch 4 (60 → 75); pushed but
  not merged since e2e hit a pre-existing timeout issue, confirmed
  unrelated to this batch.** Pending Decisions was empty. Two other
  PRs were already open on the standing example-sentence-review track
  (#40, #44) — left both alone, same reasoning as the 2026-09-12 cycle
  (neither created by this session, no overlap with this cycle's
  scope). Picked the next idiom-pool-growth batch, continuing the same
  pattern as the last three cycles.
  Added 15 new idioms (脚踏实地/坚持不懈/一鼓作气 focus, 拾金不昧/一言为定/
  言出必行/说一不二 honesty, 推己及人/守望相助/有求必应/一视同仁 kindness,
  画蛇添足/塞翁失马/对症下药/循序渐进 wisdom), each verified via zdic.net/
  Baidu Baike before authoring, same as batches 1-3. New this batch:
  checked every candidate's first-two/last-two character halves
  against the *entire* existing pool for `matchLevelContent.ts`'s
  no-collision guard *before* authoring rather than after — caught
  that 光明磊落 would have collided with the already-shipped 光明正大,
  swapped for 言出必行 instead. Regenerated `writingStrokeData.ts`
  against the full current 75-idiom set (216 distinct characters) per
  the 2026-09-12 batch's own lesson about partial regenerations —
  confirmed 0 missing characters.
  `typecheck`/`test` (343 passed)/`build` all green, but `test:e2e`
  failed: 6-8 desktop tests plus 1 mobile, all timeouts inside the
  writing-stage/jump-position e2e helpers, never a content or game-logic
  assertion. Investigated rather than assumed unrelated (same bar as PR
  #40's precedent): today's date-seeded session doesn't even draw any
  of this batch's new idioms; the stroke data for the characters it
  *does* use is byte-identical to the pre-batch file; and the same
  failing tests reproduce identically against an unmodified `origin/main`
  worktree. This points to this session's sandboxed headless Chromium
  being too slow for the writing-stage's simulated mouse tracing under
  load — a session-environment issue, not a regression from this
  change — but `AUTONOMY.md`'s auto-land policy blocks merging on any
  e2e failure regardless of suspected cause. Pushed to
  `claude/daily-2026-09-13`, opened PR #47, **left unmerged** for a
  human look or a future session with a less-loaded runner. Full detail
  in `BACKLOG.md`'s entry and PR #47's description.
- **2026-09-12 — Daily cycle: idiom pool batch 3 (45 → 60), plus a
  pre-existing writing-stage stroke-data gap found and fixed.** Pending
  Decisions was empty. Two other open PRs existed (#40: one
  example-sentence fix, pushed but not merged since its own e2e run hit
  an unrelated pre-existing flake; #44: porting 15 example-sentence
  fixes from a fork's review pass) — left both alone rather than
  merging or duplicating their work, since neither was created by this
  session and this cycle's own scope (`BACKLOG.md`'s idiom-pool-growth
  item) didn't overlap their content. Picked idiom-pool growth over the
  standing example-sentence review track specifically because two
  sessions were already actively working that track; growing the pool
  was the highest-priority *unclaimed* unblocked item.
  Added 15 new idioms (锲而不舍/废寝忘食/孜孜不倦/专心致志, 一诺千金/童叟无欺/
  襟怀坦白/大公无私, 舍己为人/扶危济困/慷慨解囊/古道热肠, 触类旁通/见微知著/
  前车之鉴), each verified via zdic.net/Baidu Baike/Taiwan MOE 成語典
  before authoring, same as batches 1-2 — full detail in `BACKLOG.md`.
  While validating, the full e2e suite failed everywhere past the
  resurface tests on the first run — root-caused (not guessed) to
  `writingStrokeData.ts` having silently missed the *previous* batch's
  characters too: the 2026-09-10 stroke-data regeneration only covered
  the 15→30 growth its own PR was against, and the 30→45 batch (PR #39,
  same day) never got a matching regeneration. 82 of 180 distinct
  characters were missing, not just this batch's own share. Regenerated
  against the full current 60-idiom set and re-ran the full suite clean
  before landing anything. All gates green (typecheck/test 336/build/
  e2e 84 passed, mobile+desktop); PR opened and merged per the standing
  2026-08-26 auto-land policy.
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
