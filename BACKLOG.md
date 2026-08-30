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

- [x] `done` — **Match warm-up: tap-for-a-hint on a first-half tile
      (2026-08-28).** A child who doesn't recognize a left-column card
      can tap it (press and release without ever dragging) to see a
      hint: its idiom's first two characters, its last two blanked out,
      then its plain-English meaning — new `#match-hint-card`, populated
      by `matchHintStatus.ts`'s `showMatchHint`/`buildHintMaskedIdiom`.
      Deliberately keyed to a genuine tap only, not a drag that misses
      its target: `IdiomMatchScene` now tracks how far the pointer moved
      between press and release (`TAP_MOVE_THRESHOLD`), so a real (if
      unlanded) drag attempt stays silent exactly as it did before —
      only a still press-and-release reads as "I don't know this one."
      Second-half (right column) tiles never show a hint, since the hint
      is keyed to "which idiom is this," which only a first-half tile's
      own text sets up. Dismissed via a "Got it" button (main.ts), same
      card-overlay pattern as every other full-screen card in this game.
- [x] `done` — **Consolidate the six mechanic prototypes into one real
      root-URL experience (2026-08-26, see `DECISIONS.md`).** `idiom-door`
      is now the real game, not a stopgap: `/` still redirects to
      `idiom-door.html`, which now also opens with the resurfacing
      callback (ported from the retired `session.html`) before its match
      warm-up. The other five prototypes (`idiom-reveal`, `meaning-check`,
      `catch-meaning`, `platform-catch`, `session`) were archived/deleted;
      their still-useful pieces moved to `src/shared/` (`positionStatus.ts`,
      `sessionHistory.ts`) — `applicationCheck.ts` also moved there at
      first, then removed once the balloon-stage redesign below made its
      full-sentence-splicing approach unnecessary.
- [x] `done` — **Redesign the balloon stage (2026-08-26).** Previously
      each balloon held a whole spliced example sentence (14-35+
      characters, cramped and hard to read while flying — the sentence's
      *font* was ~15px inside a variably-sized balloon). Now the idiom's
      example sentence is shown once, fixed and readable, with the idiom
      itself blanked out (○○○○); each balloon holds just one short (4
      character) candidate idiom at a much bigger font (34px), and the
      child catches whichever idiom actually fills the blank.
      `shared/applicationCheck.ts` (the old full-sentence distractor
      builder) is gone; `idiom-door/balloonLevelContent.ts` now builds a
      `MaskedSentence` plus simple idiom-candidate distractors directly.
- [x] `done` — **Draw `idiom-door`'s session content from the full idiom
      pool instead of the fixed 3-idiom set (2026-08-28).** New
      `src/idiom-door/sessionIdioms.ts` is the one shared source of truth:
      `ELIGIBLE_IDIOM_IDS` (the 12 of 15 idioms with 4 *distinct*
      characters — excludes `yi-xin-yi-yi`, `you-shi-you-zhong`,
      `xiang-qin-xiang-ai`, same constraint `levelContent.ts` always had)
      and `sessionIdiomIds`, a random 3 of those 12, seeded by *today's
      UTC calendar date* rather than `Math.random()` — picked specifically
      so a Playwright test importing the module in Node and the browser
      page it drives, evaluated moments apart, land on the same day
      string and therefore the same selection (true page-load randomness
      would make the two diverge, since each side would draw
      independently). `levelContent.ts`, `balloonLevelContent.ts`, and
      `matchLevelContent.ts` all now build from `sessionIdiomIds` instead
      of each hardcoding the same fixed trio; `levelContent.ts`'s decoy
      pool is now derived from every idiom in `idioms.ts` (deduplicated by
      glyph) instead of a hand-listed subset, so it no longer needs
      updating by hand when the door set changes. Idiom count per session
      stays 3 (`IDIOMS_PER_SESSION`) — only *which* 3 rotates — so nothing
      about level count or pacing changed, and `idiom-door.spec.ts`'s
      "1/3, 2/3, 3/3" progress assertions still hold as-is.
      `sessionIdioms.test.ts` guards the invariant this all leans on:
      no first-half/last-half collision across the *whole* eligible pool
      (matchLevelContent.ts's ambiguous-pairing guard), so any subset the
      daily rotation draws is safe by construction, not by luck.
      Along the way, found and fixed a latent bug in
      `idiom-door.spec.ts`'s `flyUntilResolved` helper: its world→screen
      conversion could land off-canvas (negative, or past the canvas's
      own bounds) when a session's balloon layout put the correct balloon
      far enough from the avatar's start that the camera hadn't scrolled
      to follow yet — invisible with the old fixed 3-idiom set (never
      happened to trigger it), but reliably reproducible once the door
      set could vary. Now clamped to just inside the canvas, same as a
      real finger/mouse would be.
- [x] `done` — Now that `idiom-door` is the one real entry point, dropped
      the "spike/prototype" framing (2026-08-28): `idiom-door.html`'s
      `<title>` is now "Chengyu Dao — Idiom Door" (was "Idiom Door —
      Meaning-First Puzzle Spike"), and it gained a `<meta
      name="description">` summarizing the game (there wasn't one
      before). Checked the rest of `idiom-door`'s own internal
      naming/comments for the same framing — the two remaining
      "prototype" mentions in `main.ts`/`style.css` are accurate
      historical notes about the retired `session.html` prototype code
      was ported from, not stale branding of `idiom-door` itself, so left
      as-is.

## Platform / infra

- [x] `done` — Live Vercel deployment (2026-08-25). `vercel.json`
      configures build/output; Root Directory is the repo root.
- [x] `done` — Removed the old castle escape-room prototype and its
      unused Firebase cloud-save scaffolding (2026-08-25, see
      `DECISIONS.md`).
- [x] `done` — CI workflow added (2026-08-26): `.github/workflows/game-ci.yml`
      runs typecheck, unit tests, build, and the e2e suite on every push
      to `main` and every PR.
- [x] `done` — **Cloud saves for `idiom-door` (2026-08-30).** Backend is
      Upstash Redis via a Vercel Marketplace integration (Vercel's own
      KV/Postgres products were sunset in favor of Neon/Upstash — see
      this cycle's PR for the research), a flat key→JSON-blob store
      fitting `sessionHistory.ts`'s save shape better than a relational
      schema would. New `api/cloud-save.ts` (GET/POST, Vercel's
      fetch-style Web handler — no `@vercel/node` dependency, whose
      current published types pull in several outdated/vulnerable
      transitive packages for what would've been types-only). No
      accounts: an 8-character device-typed code (`shared/
      cloudSaveValidation.ts`) is the entire sync/access model, chosen
      specifically so no personal information is ever collected, given
      the audience is children. `shared/cloudSync.ts` (client fetch
      wrapper) and `sessionHistory.ts`'s new `exportForCloud`/
      `importFromCloud` (merge-based restore, never an overwrite, so
      neither device can lose the other's progress) do the actual
      syncing; `idiom-door/cloudSaveStatus.ts` + `#cloud-save-card`
      wire it into the UI (a persistent `#cloud-save-btn`, matching
      `#session-progress`'s "reachable through every stage" placement).
      The Upstash integration is now installed and connected
      (2026-08-30, see `DECISIONS.md`).
- [x] `done` — **Fix: restoring from a code failed with "Couldn't
      reach the cloud save server" even though saving worked
      (2026-08-30).** Found live, right after connecting Upstash:
      saving (POST) succeeded but restoring (GET) didn't. Root cause —
      `cloudSync.ts` collapsed *any* non-501/404 failure into one
      generic "network" reason with no detail, so a genuine server-side
      error (e.g. a thrown exception in `api/cloud-save.ts`, which
      Vercel turns into a bare, body-less 500 on an uncaught exception)
      looked identical to actually being offline — impossible to tell
      apart from the UI alone, and no way to check server logs from
      here. Fixed two things: `api/cloud-save.ts` now wraps every
      `redis.get`/`redis.set` call in try/catch and returns a real JSON
      500 with the underlying error message instead of ever throwing
      uncaught, and `cloudSync.ts`'s failure results carry an optional
      `detail` (the server's own error, or the thrown error's message)
      that `cloudSaveStatus.ts` appends to the shown message — so the
      *next* time something like this happens, the message itself says
      what actually failed instead of a generic catch-all. New
      `api/cloud-save.test.ts` (added `api/**/*.test.ts` to vitest's
      `include`) covers the handler's own routing/validation/error
      paths directly against a mocked Redis client, including the
      exact "redis throws" case this bug lived in — something the
      original PR couldn't cover since it only had e2e tests against a
      mocked *client* fetch, never the server handler itself.
- [x] `done` — **Fix: cloud save crashed on every single request in
      production with `ERR_MODULE_NOT_FOUND` (2026-08-30).** The fix
      above still didn't make Restore (or, it turned out, Save) work —
      you pulled the actual Vercel function log, which showed
      `api/cloud-save.js` couldn't resolve its import of
      `../src/shared/cloudSaveValidation`. Root cause: this repo's
      `package.json` has `"type": "module"`, and Vercel's Node.js
      function build does **not** bundle `api/*.ts` into one file for
      that case — it transpiles 1:1 and lets Node's own ESM loader
      resolve imports at runtime, which (unlike Vite's dev/build
      pipeline, and unlike CommonJS `require`) requires an explicit
      file extension on every relative import. The bare import had none
      — worked fine under `vite dev`/`vite build` (generous resolver),
      crashed on every real invocation in production. Fixed by
      importing with an explicit `.js` extension (against the `.ts`
      source — TypeScript's `"bundler"` resolution explicitly supports
      this). Added `scripts/check-api-esm.mjs` + a new `verify:api` npm
      script, wired into `npm run build`, that actually emits real
      `.js` (`tsc -p tsconfig.api.json --noEmit false`) and runs it
      through Node's genuine ESM loader — the same mechanism a real
      deploy uses — so this exact class of bug (invisible to
      typecheck/test/e2e, all of which go through a more lenient
      resolver) can't silently ship again. Confirmed by reverting the
      extension locally and watching `verify:api` reproduce the exact
      production stack trace, then re-fixing and watching it pass.

## Later / explicitly out of scope for now

- [ ] `blocked` — Multiplayer-adjacent features (shared idiom
      collections, class leaderboards, etc.).
- [ ] `blocked` — Monetization/ads. Especially worth being deliberate
      about given the target audience is children.
- [ ] `blocked` — Upper Primary (P4-P6) content tier, past the current
      Lower Primary set in `src/idioms/`.
