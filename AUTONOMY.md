# Autonomous / Session Working Mode

This repo split off from a larger monorepo (`TestAI`) that ran on a daily
autonomous build cycle — see that repo's `AUTONOMY.md` for the original.
This doc adapts the same process to `chengyu-dao` as a standalone repo, so
any session (daily-cycle or one-off interactive) working here follows the
same expected behaviour instead of reinventing it each time.

## The cycle

Each cycle (automated or kicked off by an explicit ask) does two things in
order:

1. **Decision check-in.** Read [`DECISIONS.md`](./DECISIONS.md)'s Pending
   section. If it's non-empty, ask about those items directly (batched into
   one round, not one at a time) and record the answers, moving each item
   to the Resolved log.
2. **Build cycle.** Read [`BACKLOG.md`](./BACKLOG.md) and pick the next
   unblocked, highest-priority item(s) — as much as fits in one focused
   session. Implement it with tests, run the full test suite (must pass
   before committing), update `BACKLOG.md`, commit, and land it (see
   "Landing changes" below).

If nothing is pending and the backlog has an unblocked next item, step 1 is
a no-op and the session goes straight to building. If everything in the
backlog is blocked on a decision, the session raises that decision (if not
already logged) and stops rather than manufacturing busywork.

## What counts as a "critical decision" (asked, not guessed)

Logged to `DECISIONS.md` and raised at the next check-in instead of
guessed:

- **Scope/direction changes** — e.g. which mechanic becomes the "real"
  game vs. stays a snippet prototype, changing session length/idiom-count
  targets.
- **Irreversible or costly external commitments** — creating third-party
  accounts, picking a paid tier, anything with a cost implication.
- **Data model changes that would break existing saves** — reshaping
  saved-progress shape in a way old `localStorage` saves can't migrate
  from cleanly.
- **Art/audio direction with lasting consequences** — style commitments
  future scenes would need to match, or licensing/budget questions for
  real assets.
- **Monetization, ads, or anything privacy/legal-adjacent** — out of scope
  until explicitly raised.
- **Removing or replacing an existing mechanic/entry point** — e.g. what
  the site root (`/`) should point to.

## What does NOT require a decision (built autonomously)

- New idioms, scenes, and content that follow the established data-driven
  patterns in `src/idioms/` and each mechanic's own `src/<name>/`.
- Refactors, bug fixes, and test coverage for existing behavior.
- Implementation-detail choices (component structure, naming, minor
  library additions that don't have cost/lock-in implications).
- Small UX/polish tweaks that don't change the game's direction.

When in doubt, log the question to `DECISIONS.md` rather than guessing —
but keep building other unblocked backlog items in the same session
instead of stalling.

## Guardrails

- **Tests gate every commit.** `npm run typecheck`, `npm run test`, and
  `npm run build` must pass before anything is pushed; new logic ships
  with new/updated tests (see `README.md` for how the suite is organized).
- **Idiom/content data integrity is tested generically** where possible
  (see e.g. `src/rooms/roomIntegrity.test.ts`-style patterns, if content
  moves back toward hotspot/room data) so new content gets validated
  automatically instead of needing hand-written tests per item.
- **`main` is what Vercel actually deploys.** On Vercel's free (Hobby)
  tier the Production Branch setting is pinned to `main` and isn't
  changeable — confirmed the hard way in the parent monorepo (see
  `DECISIONS.md`'s 2026-08-07 entry there) and again here on 2026-08-25,
  when the live site kept showing stale content because the fix hadn't
  been merged to `main` yet. **Work finished and pushed to a feature/
  session branch is invisible on the live site until it lands on `main`.**
- **This repo has no perpetual "working branch."** Unlike the parent
  monorepo's daily-cycle setup (which pushed straight to one long-lived
  branch and fast-forwarded `main` to match), every session here — daily
  cycle or one-off — develops on its own per-session branch and can't push
  straight to `main`. See "Landing changes" below.
- **Actions only a human can take** (creating a real Vercel/Firebase
  account, flipping a dashboard setting, etc.) belong in `DECISIONS.md`
  under "Needs Your Action" — the loop won't block on these, it keeps
  building against local-only fallbacks in the meantime.

## Landing changes

Since there's no perpetual working branch to fast-forward `main` from,
"done" means merged, not just pushed:

1. Validate on the session branch — tests passing, matches what was asked.
2. Open a PR against `main`.
3. Merge it.

**The daily cycle lands itself (2026-08-26 decision).** All three steps
happen automatically as part of finishing a daily-cycle run, with no
go-ahead needed — this is the one standing exception to this repo's
"a PR is never opened silently" rule for interactive sessions. Landing
is conditional on step 1 actually passing: `npm run typecheck`,
`npm run test`, `npm run build`, and `npm run test:e2e` must all be
green (the same gate `.github/workflows/game-ci.yml` runs on the PR)
before the cycle opens and merges its PR; if anything's red, the cycle
stops and reports what's failing instead of landing broken work. This
is what makes `main` (and therefore the live Vercel deploy) update once
a day automatically, per the daily automated trigger described below.

A one-off interactive session (not the scheduled daily cycle) still
follows the original three-step split: step 1 is automatic, but
opening/merging a PR needs an explicit ask first, same as always.

### Playtest PRs before merging, not after

Production (`chengyu-dao.vercel.app` or whatever domain is live) only ever
reflects `main` — a branch that hasn't merged yet is invisible there. If a
PR's description asks for a human playtest before it's judged (feel/tuning
changes especially — see the door-stage jump/fall PRs), that playtest has
to happen on the PR's own **Vercel preview deployment**, not by merging
first to get something testable. Every PR gets one automatically (posted
as a comment by `vercel[bot]`, e.g.
`https://<project>-git-<branch>-<team>.vercel.app`); a session opening
such a PR must pull that URL from the PR and put it directly in the PR
description's "next step" line (`Try it here: <preview URL>`), not a vague
"try it once deployed" — that phrasing reads as "after merge" and defeats
the point of having a preview URL at all (this is exactly what went wrong
with PR #17 — see `DECISIONS.md`'s 2026-09-07 entry). Merging is still
never automatic for a PR whose own description says it's waiting on a
human's subjective read (per "Landing changes" above) — the fix here is
just making sure "try it" always means the preview URL, so that waiting
doesn't block testing.

### The daily automated trigger

A Routine fires a fresh session once a day (03:00 UTC) with a prompt
that runs this file's cycle end-to-end and lands the result per the
auto-merge policy above. Find its trigger id via `list_triggers` if it
needs adjusting (time, prompt, disabling). Changing this schedule, or
turning auto-merge back into an ask-first step, is exactly the kind of
thing "Changing this mode" below covers — just ask.

## Changing this mode

This doc mirrors the parent monorepo's process, trimmed to what applies to
a standalone single-project repo. To change cadence, decision criteria, or
the landing convention, just ask — this doc gets updated to match, the
same as its counterpart in `TestAI`.
