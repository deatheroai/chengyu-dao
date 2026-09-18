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

- **2026-09-18 — Daily cycle: idiom pool batch 6 (90 → 100), reaching
  this backlog item's ~100 target.** Pending Decisions was empty. Three
  other open PRs existed: #51 ("Science Snake", a wholly separate
  P4-Science quiz game, not part of this repo's idiom-game scope or
  `BACKLOG.md`, and its own description asks for a human playtest on
  its Vercel preview before being judged — left untouched, same rule as
  always), and #40/#44 (the standing example-sentence-review track,
  unchanged since prior check-ins, no overlap with this cycle's scope).
  Continued the idiom-pool-growth item since it was the highest-priority
  genuinely unblocked backlog item, same pattern as the last several
  batches — this batch's own 10 idioms bring the pool to exactly 100,
  the item's own stated target, so it's now marked `done` in
  `BACKLOG.md` rather than left open for a further batch.
  Added 10 new idioms (see `BACKLOG.md`'s own batch-6 entry for the
  full list and sourcing detail) — verified via WebSearch against
  zdic.net-indexed pages and Baidu Baike, same as batch 5 (zdic.net
  itself is still directly network-blocked from this sandbox).
  Pre-checked every new candidate's first-two/last-two character halves
  against the full 90-idiom pool before authoring, and against each
  other within the batch — no collisions, no swaps needed. Regenerated
  `writingStrokeData.ts` against the full current 100-idiom set (283
  distinct characters, 27 new). Used two temporary, not-saved npm
  packages (`pinyin-pro`, `hanzi-writer-data@2.0.1`) as local drafting
  aids for this session only — neither is a project dependency, and
  every character they produced was hand-verified against this file's
  own existing conventions before being treated as vetted (see
  `BACKLOG.md`'s entry for the specific corrections this caught). All
  gates green: typecheck/test (367 passed)/build/e2e (70 passed,
  mobile+desktop, run with `CI=true` to match the actual PR gate). PR
  opened and merged per the standing 2026-08-26 auto-land policy.
- **2026-09-17 — Daily cycle: idiom pool batch 5 (75 → 90).** Pending
  Decisions was empty. Three other open PRs existed: #40 and #44 on the
  standing example-sentence-review track (unchanged since prior
  check-ins, no overlap with this cycle's scope, left alone as usual),
  and a new one from an interactive session earlier the same day, #51
  ("Science Snake", a wholly separate P4-Science quiz game, not part of
  this repo's idiom-game scope or `BACKLOG.md`) — its own description
  explicitly asks for a human playtest on its Vercel preview before
  being judged, so left untouched, same "PR asking for a subjective
  human read never gets auto-landed" rule as everything else on that
  track. Continued the idiom-pool-growth item since it was the
  highest-priority genuinely unblocked backlog item, same pattern as
  the last several batches.
  Added 15 new idioms (see `BACKLOG.md`'s own batch-5 entry for the
  full list and sourcing detail) — verification went through WebSearch
  rather than a direct zdic.net fetch, since zdic.net itself turned out
  to be blocked by this sandbox's egress proxy (first time that's come
  up; prior batches' own notes say "zdic.net" but don't record how they
  reached it, so this may not be new — noting it here in case a future
  session hits the same block and wonders why a direct fetch fails).
  Pre-checked every new candidate's first-two/last-two character halves
  against the full 75-idiom pool before authoring (the batch-4 lesson),
  and against each other within the batch — no collisions, no swaps
  needed. Regenerated `writingStrokeData.ts` against the full current
  90-idiom set (256 distinct characters, 40 new). All gates green:
  typecheck/test (367 passed)/build/e2e (70 passed, mobile+desktop, run
  with `CI=true` to match the actual PR gate). PR opened and merged per
  the standing 2026-08-26 auto-land policy.
- **2026-09-16 — Daily cycle: root-caused and fixed the `doorJump.ts`
  e2e bug that had blocked PR #40 (09-11)/#47 (09-13)/#49 (09-14) from
  landing, then landed idiom-pool batch 4 (60 → 75) on top of it.**
  Pending Decisions was empty. Two PRs open on the standing
  example-sentence-review track (#40, #44) — left both alone, same
  reasoning as prior cycles, since this cycle's own scope (the e2e fix
  + idiom-pool growth) doesn't overlap their content changes; #40's
  own e2e failure is now fixed as a side effect (its content fix still
  needs manually re-porting onto current `idioms.ts` by whoever picks
  it up, since its branch predates 3 rounds of idiom-pool growth and no
  longer applies cleanly).
  Rather than re-authoring a fresh batch 5 (duplicating #47/#49's
  already-verified content) or leaving #49 to rot a third day, picked
  up its own continuation. #49's own PR description already pointed at
  the real next step ("the `doorJump.ts` margin constants... are the
  next place to look") — investigated that directly rather than
  re-attempting the same rebase-and-hope #47→#49 already tried twice.
  Root cause: `jumpForFirstReachableWrongTile`'s chain-catch safety
  filter used one flat 60px back-margin for every candidate tile,
  regardless of height, when the real danger zone (a jump's actual
  takeoff-to-landing arc) sits further behind a taller tile's own x
  than a shorter one's — confirmed by hand against both of #49's actual
  CI failures (a real chain-catch on one, total candidate starvation on
  the other, both on the same 明察秋毫 level, both explained by the same
  flat-margin gap in opposite directions) before writing a fix, and
  again quantitatively against the whole 75-idiom pool's real generated
  levels afterward (37 missed chain-catch risks, 158 needless
  exclusions under the old filter, both resolved by the new one). Full
  detail in `BACKLOG.md`'s entry. All gates green: typecheck/test (367
  passed)/build/e2e (70 passed, mobile+desktop, plus 12/12 on top for
  the two specific tests that had failed on PR #49's own CI run — this
  exact bug had already produced one false-clean local run before, so a
  single pass wasn't enough to trust here). PR opened and merged per
  the standing 2026-08-26 auto-land policy; #47 and #49 closed as
  superseded.
- **2026-09-14 — Daily cycle: rebased PR #47 (idiom pool batch 4, 60 →
  75) onto latest main and re-validated, but it's still not merged — a
  real GitHub Actions run caught a chain-catch every local run
  missed.** Pending Decisions was empty. Two other open PRs on the
  standing example-sentence-review track (#40, #44) — left both alone,
  same reasoning as the last several cycles. Rather than authoring a
  fresh batch 5 (which would duplicate #47's already-verified content)
  or leaving #47 to rot, picked up its own continuation: merged latest
  `main` (which had picked up the milestone-only-matching change, PR
  #48, since #47 opened) onto a fresh `claude/daily-2026-09-14`
  branch. Only `DECISIONS.md` conflicted (both branches had appended
  an entry) — resolved by keeping both, in date order;
  `idioms.ts`/`writingStrokeData.ts`/`BACKLOG.md` merged clean.
  `typecheck`/`test` (367 passed)/`build` all green throughout.
  `test:e2e` failed locally on the first full run — a genuine thrown
  error this time (not a timeout like #47's own), from the "running out
  of HP..." test's `jumpForFirstReachableWrongTile` helper, for a real
  reason: unlike #47's own date, *today's* date seed draws 明察秋毫 (one
  of this batch's new idioms) as the session's first level, so this
  batch's new content is actually exercised today. Investigated
  properly: hand-computed the level's real candidate-tile set (32 safe
  "wrong catch" tiles across the track, several times more than the ~7
  a full HP drain needs), then reproduced the specific test 3/3 clean
  in isolation. Checked what the *real* PR gate actually requires:
  `game-ci.yml` runs `test:e2e` with `CI: true`, which
  `playwright.config.ts` gives a real retry (`retries: 1`) that my
  first two local full-suite runs (no `CI` set) didn't have — re-ran
  locally with `CI=true` to match, and all 70 passed. Opened PR #49 on
  that basis.
  **PR #49's own actual GitHub Actions run then failed anyway**, on a
  *different* test — "each jump costs HP..." (`idiom-door.spec.ts:431`)
  got `nextIndex` `"2"` instead of `"1"` on both its original attempt
  and its automatic retry: the deliberately-aimed "wrong" jump
  chain-caught the real next character too, for 明察秋毫's level again.
  Never reproduced locally (3/3 isolated, and a full local `CI=true`
  run including this exact test all green) — this looks like the same
  pre-existing `doorJump.ts` timing-margin fragility
  (`JUMP_FOOTPRINT_X`/`WRONG_TILE_BACK_MARGIN_X`, tuned repeatedly
  before, see their own doc comments and the 2026-08-30/08-31/09-11
  entries above) surfaced by which idiom this batch's growth put in
  front of the door stage today, not a regression in anything this PR
  actually touches (the catch/margin/level-generation code is
  unmodified here). But `AUTONOMY.md`'s auto-land gate is the *actual*
  CI run, not however many local repros pass — so PR #49 (superseding
  #47; both left open, neither merged) stays **pushed but not merged**,
  for a human look or a future session, same as #40 and #47's own
  precedent. Full detail in `BACKLOG.md`'s own entry.
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
- **2026-09-12 — Shipped BACKLOG.md's "milestone-only matching" entry
  (per your direct request, not the daily cycle).** Removed the
  per-session match warm-up from `main.ts`'s boot flow entirely — a
  session now goes straight from the resurface card (if any) into the
  first idiom's own intro. In its place, the idiom-halves matching
  mechanic now runs only as a milestone finale: every time the
  cumulative discovered-idiom count crosses a fresh multiple of 15
  (`shared/matchMilestoneHistory.ts`), that batch's matching finale runs
  at the very end of whichever session crosses it — split into 3
  sub-rounds of 5, a running HP score carried across all 3
  (`matchHp.ts`), a "progress after each stage" card between sub-rounds,
  and a final card showing that milestone's HP against past ones (a
  personal-best line and a round-over-round trend, both skipped on the
  very first milestone). Full detail, including the e2e-suite rework
  this needed, is in `BACKLOG.md`'s own entry. All gates green
  (typecheck/`test` 367 passed/`build`, plus the full mobile+desktop e2e
  suite).
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
