# Backlog

Worked top-to-bottom by whatever session picks it up next (see
[`AUTONOMY.md`](./AUTONOMY.md)). Items move `todo` → `in-progress` →
`done`, or `blocked` if they depend on a pending entry in
[`DECISIONS.md`](./DECISIONS.md).

Status legend: `todo` · `in-progress` · `blocked` · `done`

This repo split off from the `TestAI` monorepo on 2026-08-06 already
carrying six independent mechanic prototypes plus the castle prototype
they superseded. This file starts fresh from that split rather than
importing the monorepo's full backlog history — see `README.md`'s History
section and `TestAI`'s own `BACKLOG.md` for everything before this point.

## Chinese Idiom Discovery Game (current focus)

- [ ] `todo` — **Consolidate the six mechanic prototypes into one real
      root-URL experience.** `idiom-reveal.html`, `idiom-door.html`,
      `meaning-check.html`, `catch-meaning.html`, `platform-catch.html`,
      and `session.html` each validate a piece independently, but nothing
      ties them into the actual intended play loop yet. `/` currently
      redirects to `idiom-door.html` as a stopgap (2026-08-25, see
      `DECISIONS.md`) — not a real consolidation, just the most complete
      single mechanic to point at meanwhile.
- [ ] `todo` — Decide which prototypes are still live candidates for the
      final game vs. superseded spikes (e.g. `catch-meaning.html` vs.
      `platform-catch.html` — the latter's git history suggests it
      replaced the former's movement approach) and archive the ones that
      lost, the way the castle prototype was archived and later removed.

## Platform / infra

- [x] `done` — Live Vercel deployment (2026-08-25). `vercel.json`
      configures build/output; Root Directory is the repo root.
- [x] `done` — Removed the old castle escape-room prototype and its
      unused Firebase cloud-save scaffolding (2026-08-25, see
      `DECISIONS.md`).
- [ ] `todo` — No CI workflow exists in this repo yet (the parent
      monorepo's `game-ci.yml` wasn't carried over in the split). Add one
      if/when it's worth gating pushes automatically rather than relying
      on running `npm run typecheck && npm run test && npm run build`
      (and `npm run test:e2e`) by hand per `AUTONOMY.md`'s guardrails.
- [ ] `blocked` — Cloud saves (Firebase or otherwise). Removed entirely
      in the castle-prototype cleanup since nothing used it; would need
      re-scoping against whichever mechanic(s) survive the consolidation
      above before rebuilding it.

## Later / explicitly out of scope for now

- [ ] `blocked` — Multiplayer-adjacent features (shared idiom
      collections, class leaderboards, etc.).
- [ ] `blocked` — Monetization/ads. Especially worth being deliberate
      about given the target audience is children.
- [ ] `blocked` — Upper Primary (P4-P6) content tier, past the current
      Lower Primary set in `src/idioms/`.
