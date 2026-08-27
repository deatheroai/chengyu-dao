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
