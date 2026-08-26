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

- [x] `done` — **Consolidate the six mechanic prototypes into one real
      root-URL experience (2026-08-26, see `DECISIONS.md`).** `idiom-door`
      is now the real game, not a stopgap: `/` still redirects to
      `idiom-door.html`, which now also opens with the resurfacing
      callback (ported from the retired `session.html`) before its match
      warm-up. The other five prototypes (`idiom-reveal`, `meaning-check`,
      `catch-meaning`, `platform-catch`, `session`) were archived/deleted;
      their still-useful pieces moved to `src/shared/`
      (`applicationCheck.ts`, `positionStatus.ts`, `sessionHistory.ts`).
- [ ] `todo` — **Draw `idiom-door`'s session content from the full idiom
      pool instead of the fixed 3-idiom set.** `src/idioms/idioms.ts` has
      15 idioms; `idiom-door`'s puzzle needs 4 *distinct* characters per
      idiom (see `levelContent.ts`'s doc comment), which 12 of the 15
      satisfy (excludes `yi-xin-yi-yi`, `you-shi-you-zhong`,
      `xiang-qin-xiang-ai`). Deliberately not attempted in the same
      sitting as the consolidation above — `idiom-door.spec.ts`'s e2e
      suite hardcodes assertions against the specific fixed 3 idioms
      (`doorLevels[i]`), so randomizing the selection needs its own pass
      to keep that suite (and the decoy pool's per-level collision
      filtering) correct rather than risking it alongside a large file
      reorg.
- [ ] `todo` — Now that `idiom-door` is the one real entry point, revisit
      whether its title/meta description (still "Idiom Door —
      Meaning-First Puzzle Spike" in `idiom-door.html`) and its own
      internal naming should drop the "spike/prototype" framing.

## Platform / infra

- [x] `done` — Live Vercel deployment (2026-08-25). `vercel.json`
      configures build/output; Root Directory is the repo root.
- [x] `done` — Removed the old castle escape-room prototype and its
      unused Firebase cloud-save scaffolding (2026-08-25, see
      `DECISIONS.md`).
- [x] `done` — CI workflow added (2026-08-26): `.github/workflows/game-ci.yml`
      runs typecheck, unit tests, build, and the e2e suite on every push
      to `main` and every PR.
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
