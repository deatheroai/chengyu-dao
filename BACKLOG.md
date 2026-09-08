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

- [x] `done` — **Balloon stage: curve each balloon's own idiom text,
      shrink the font (2026-09-08).** Per your "curve the balloon so
      they don't take up so much horizontal space." Two false starts
      first, both from misreading "curve the balloon" as curving the
      *arrangement of balloons in the sky* rather than the text inside
      one balloon: a zigzag-based layout that scattered 3 of 4 candidates
      outside the camera's view ("balloons are missing"), then a
      corrected version that arranged the balloons themselves into a
      literal rainbow across the world — reported live as "I don't mean
      to spread the balloons out in a rainbow... the implementation got
      the wrong design." Both reverted; `layoutBalloons` is back to its
      original plain grid, unchanged.
      The actual fix is in `buildBalloon`: each of the idiom's 4
      characters (with its pinyin) now leans along a shallow arc within
      its own balloon card — like text curving on a badge — via new
      `balloonGlyphArc.ts` (pure function + tests). Each character sits
      in its own small rotated `Phaser.GameObjects.Container` (Phaser
      rotates a container's children for free, so the pinyin-above-hanzi
      stacking stays plain local coordinates); the arc's radius is
      derived from the balloon's own widest measured character unit
      (not a flat guess) so spacing scales with whatever the real
      content measures. The card's rounded-rect body and catch hitbox
      (`halfW`/`halfH`) are sized from the true rotated bounding box of
      all four characters, recentered so the drawn card actually matches
      the curved content. Also stepped
      `CANDIDATE_CHAR_FONT_PX`/`CANDIDATE_PINYIN_FONT_PX` down (34/13px
      → 28/11px), the other lever on "still spans too far." All green:
      `npm run typecheck`/`test` (286 passed)/`build`, plus the full
      `idiom-door.spec.ts` e2e suite (24 passed, mobile+desktop)
      including the balloon-stage tests. Still a first pass on the
      curve's tightness (`GLYPH_ANGLE_STEP_DEG` in
      `BalloonSentenceScene.ts`) — easy to nudge once you've looked at
      it.
- [ ] `todo` — **Writing/tracing stage: teach each character before the
      door (2026-09-08).** New stage between an idiom's intro and its
      door: each of the idiom's 4 characters shown one at a time over a
      stroke-order template, child traces it, scored on accuracy.
      Recommend [HanziWriter](https://hanziwriter.org/) (MIT) with
      stroke data bundled locally for just this project's distinct
      characters (not the full CDN dataset) rather than building stroke
      recognition from scratch. New DOM UI layer + Phaser scene +
      pure-logic scoring module, following the same
      pure-function-plus-thin-Scene pattern as every other mechanic
      here.
- [ ] `todo` — **HP: earned from tracing, spent in the door stage, a
      real gate (2026-09-08).** Per your "decent writing should enable
      the child to pass the door stage but if badly written the child
      should have to restart": trace accuracy (no baseline freebie)
      becomes that idiom's door-stage HP. Every jump costs a small flat
      amount; a jump that lands on the wrong character costs an
      additional, larger amount on top. At 0 HP, jumping stops working
      — the character keeps auto-running but can't catch anything, so
      it reaches the door unsolved, which already gently restarts the
      level (`IdiomDoorScene.checkDoor`). That restart needs to route
      back to *retracing* this idiom (a new callback out to `main.ts`,
      same pattern as `onDoorReached`), not just respawn the same door
      tiles with an already-spent pool. Needs a small HP meter in
      `catch-ui-layer` so the child can see they're running low. Starting
      numbers (tune after playtest, same as every other constant in
      this file): ~100 HP for a perfect trace, ~5 HP/jump, +~10 HP extra
      on a wrong catch.
- [ ] `todo` — **Door stage: burning tile on a wrong catch (2026-09-08).**
      Wrong catch recolors that specific tile scorched/charred (reuse
      the existing spark-burst system, angrier) and marks it inert
      afterward — so one mistimed jump lingering near it (the exact
      "touch-and-go" problem past door-feel PRs fought hard to fix)
      doesn't rack up repeat HP penalties for a single mistake.
- [ ] `todo` — **Door stage: match caught tiles by glyph, not a
      pre-baked index — unlocks repeated-character idioms (2026-09-08).**
      `ELIGIBLE_IDIOM_IDS` currently excludes 一心一意/有始有终/相亲相爱
      because they repeat a character, and the door puzzle's catch
      logic (`orderedCatchProgress.ts`, `IdiomDoorScene.handleCatch`)
      pre-assigns each tile to a specific character *position* at
      level-build time — for a repeated glyph that produces two
      tiles that look identical on screen but are internally tagged for
      different positions, so a child can get told "wrong" for grabbing
      the exact glyph asked for. Fix: match a caught tile by comparing
      its glyph against `characters[nextIndex]` (the next character
      still needed) rather than a positional index. Order stays enforced
      between *distinct* characters (still teaches the idiom's real
      character order); repeated glyphs just satisfy whichever
      occurrence is still outstanding. Removes the need for
      `ELIGIBLE_IDIOM_IDS` to exclude anything — the whole idiom pool
      becomes door/balloon-playable.
- [ ] `todo` — **Remove the per-session match warm-up; matching becomes a
      milestone-finale-only mechanic (2026-09-08).** Per your steer:
      drop `beginMatchStage`/`showMatchIntro` from `main.ts`'s boot flow
      entirely — a session goes straight from the resurface card (if
      any) into the first idiom's intro. In its place: every time the
      cumulative discovered-idiom count (`sessionHistory.ts`'s
      `allDiscoveredIdiomIds`) crosses a new multiple of 15, that fresh
      batch of 15 triggers a celebratory match milestone — the existing
      idiom-halves mechanic (`IdiomMatchScene`/`matchProgress.ts`/
      `buildMatchLevel`, unchanged), split into 3 sub-rounds of 5,
      scoped to that batch only (not the whole history). Each
      milestone's final HP is recorded to a new small on-device-only
      history (no accounts, matches how saves already work) so a
      finished milestone can show it against past ones ("Round 2: 480 HP
      — Round 1 was 410, you're improving!") — a personal-best list and
      a round-over-round trend are the same underlying data, just
      displayed two ways. Not hardcoded to a fixed number of rounds —
      just keeps going as the idiom pool grows.
- [ ] `todo` — **Grow the idiom pool from 15 toward ~100 (2026-09-08).**
      Same data-driven pattern `src/idioms/idioms.ts` already uses —
      per `AUTONOMY.md` this doesn't need a decision, just doing it.
      Authored in reviewable batches (matching this project's existing
      "needs your review before treated as fully vetted" practice for
      Chinese-language content), one flat age tier (no Upper Primary
      split, per your steer). One construction-time fix needed
      alongside it: `matchLevelContent.ts`'s no-collision guard (two
      idioms can't share the same first-two or last-two characters)
      currently assumes a small, hand-verified pool; at ~100 idioms,
      collisions within a given milestone's 15-idiom batch become
      realistic. Needs to become an active collision-avoiding grouping
      step when assembling each milestone's batch, not just a guard that
      throws.

- [x] `done` — **Dev-only: a "New idioms" control to reroll this
      session's idiom set for testing (2026-09-07).** Per "I am getting
      bored testing on these three idioms" — `sessionIdioms.ts` rotates
      once per UTC calendar day by design (right for a real child: same
      3 idioms all day, a fresh 3 the next day), which meant a tester
      replaying the game many times in one sitting was stuck on
      whatever 3 idioms today happened to draw. New
      `dev-reroll-idioms-btn` (alongside the existing `dev-controls`
      panel's "Seed history"/"Clear history" — same "not part of the
      child-facing product" dev-only status) writes a timestamp-based
      seed to a `localStorage` override
      (`setDevIdiomSeedOverride`/`chengyu-dao-dev-idiom-seed-override`)
      that `sessionIdiomIds` now checks first, before falling back to
      the normal date-based seed — nothing in the shipped game ever
      writes this key on its own, so a real child's session is
      unaffected. "Clear history" now also clears this override
      (`clearDevIdiomSeedOverride`), so one button gets a tester fully
      back to today's normal, deterministic set rather than leaving them
      permanently stuck on whatever they last rerolled to.
- [x] `done` — **Balloon stage: show the masked sentence on its own
      centered screen before revealing the floating balloons
      (2026-09-07).** Per your "surface the sentence in the centre for
      the player to read before revealing the floating balloons"
      feedback — until now, `beginBalloonStage` showed the balloon UI
      chrome (including `#balloon-prompt`'s masked-sentence line) *and*
      started `BalloonSentenceScene` (so its balloons) all at once, the
      instant a door was solved, with no reading pause first — unlike
      every other stage transition in this game (level-intro-card,
      match-intro-card), which all gate their actual start behind a
      Start tap. New `#balloon-intro-card` (main.ts's
      `showBalloonIntro`), same full-screen-card/Start-button pattern as
      those two: shown the moment a door is solved, rendering the exact
      same masked sentence `#balloon-prompt` already used (no new
      content), and `beginBalloonStage` (which starts the Phaser scene)
      now only runs as its `onStart` callback — so no balloon exists on
      screen until the child taps Start. `#balloon-prompt` still shows
      the same sentence, smaller, once flying begins, same big-card/
      small-in-flight-line relationship level-intro-card has to
      `#meaning-prompt`. `idiom-door.spec.ts`'s balloon-stage tests
      updated with a new `startBalloonStage` helper (mirrors
      `startPlaying`) to dismiss this new intro before expecting the
      balloon stage itself.
- [x] `done` — **Door stage: fall faster than rise, so landing reads
      as vertical (2026-09-04).** Asked directly (a jump-shape change,
      not pure numbers-tuning, per your "land vertical instead of
      curved or slow"): chose the smallest of three options offered —
      keep moving forward throughout the jump (no freezing, the
      auto-runner's "always advancing" identity stays intact), but make
      gravity while falling stronger than while rising
      (`runPhysics.ts`'s new `fallGravityMultiplier`, set to 2 in
      `IdiomDoorScene.ts`) — the classic "float up, drop like a rock"
      platformer trick (Mario, Celeste). Jump height is untouched (still
      only `JUMP_VELOCITY`/`JUMP_GRAVITY`, same ≈175px apex); only the
      descent's *duration* shrinks — at 2x, the fall takes ≈71% (1/√2)
      as long as the rise that preceded it, instead of the ≈100% a
      symmetric arc gives, so there's less time (and so less horizontal
      drift, at the same `runSpeed`) spent descending through a tile's
      height band. Complements, doesn't replace, the touch-and-go arc
      tuning and real-sized catch hitboxes above/below — those made a
      *well-aimed* jump reliable; this makes the *landing itself* read
      as a drop rather than a glide.
- [x] `done` — **Door stage: real-sized catch hitboxes instead of a
      generous "forgiveness radius" (2026-09-04, "how does Mario do
      it?").** The touch-and-go arc tuning (below) still wasn't the
      whole story — reported live, still catching a tile beside the
      intended one. Actual remaining cause: `CATCH_RADIUS_X`/`_Y` were a
      flat ±70px/±80px radius picked independent of any real rendered
      size, stacked on top of an already-forgiving jump arc. Two
      concrete problems that fell out of that: (1) two minimum-gap
      tiles (`levelContent.ts`'s `MIN_SLOT_GAP`, ~110px) could still
      have overlapping catch zones (2×70=140 > 110) even after the
      nearest-candidate fix — nearest-wins only helps once both zones
      are already contending for the same frame; (2) ±80px on the Y
      axis is *wider than the entire height range* tiles are drawn from
      (`HEIGHT_MIN..HEIGHT_MAX` spans only 70px), so a tile's height
      essentially never disqualified anything — every tile within X
      range was always within Y range too, regardless of how different
      its actual height was. Real platformers don't hit-test against an
      independent forgiveness blob like that — they overlap-test each
      object's own actual collision box against the player's. Moved
      `CATCH_RADIUS_X`/`_Y` into `catchSelection.ts` (now exported) and
      derived them from an assumed player hitbox half-extent plus each
      tile's own real half-extent (tiles render 60×60) — 45px/50px, down
      from 70px/80px. That's not just "smaller," it's now *provably*
      non-overlapping on X for any two minimum-gap tiles
      (`2*CATCH_RADIUS_X < MIN_SLOT_GAP`, asserted directly in
      `catchSelection.test.ts`) and small enough on Y that height
      differences between tiles finally matter for real. The
      touch-and-go arc tuning still earns its keep — it's what makes a
      well-aimed jump actually land inside this tighter window
      reliably, rather than sailing past it.
- [x] `done` — **Door stage: snappier "touch and go" jump arc
      (2026-08-31).** The nearest-tile catch fix (below) wasn't the
      whole story — reported live, still catching tiles beside the
      intended one, and specifically that the jump "floats a little
      before landing." Real remaining cause: near a jump arc's apex,
      vertical speed is close to zero, so the character drifts
      sideways for a while while still inside `CATCH_RADIUS_Y` of
      whatever height it peaked at — sweeping through several
      similar-height tiles during one "floaty" jump, no tile-order bug
      needed to explain it. `IdiomDoorScene`'s jump physics
      (`gravity`/`jumpVelocity`, now named `JUMP_GRAVITY`/
      `JUMP_VELOCITY`) scaled up together — 1400/-700 to 2850/-1000 —
      which keeps the arc's max height essentially unchanged (still
      ≈175px, so every tile height in `levelContent.ts`'s
      `HEIGHT_MIN..HEIGHT_MAX` range stays reachable) but cuts
      time-to-apex from 0.5s to ≈0.35s (~30% snappier) — less time (and
      so less horizontal drift) spent hovering near any one height
      band. `runPhysics.ts` itself is untouched (pure function, config
      passed in) and its own tests use a self-contained config, so
      nothing there needed updating.
- [x] `done` — **Fix: door stage sometimes caught the wrong tile when
      two were close together (2026-08-30).** Reported live: "the first
      two and last two characters appearing side by side... very easy
      to accidentally touch the next character when jumping." Root
      cause — `IdiomDoorScene.checkCatches` resolved a frame's catch to
      whichever in-range tile came first in track order (left to
      right), not the nearest one to the character's actual position.
      With `levelContent.ts`'s tiles only ~110px apart at minimum
      (`MIN_SLOT_GAP`) and a deliberately generous ±70px catch radius
      (so a mistimed jump still forgives), two adjacent tiles'
      catch zones genuinely overlap — the game was then picking
      whichever one happened to sort earlier, regardless of which one
      the child actually jumped toward. New `catchSelection.ts`
      (`pickCatchCandidate`, pure function + unit tests, same
      "logic module + thin Scene wiring" split as
      `orderedCatchProgress.ts`/`runPhysics.ts`) now picks the nearest
      in-range tile instead — same forgiving catch radius, but ambiguity
      resolves by genuine proximity rather than an arbitrary array-order
      tiebreak. If this doesn't fully resolve it in practice, the next
      lever is tightening `CATCH_RADIUS_X`/`CATCH_RADIUS_Y` or widening
      `MIN_SLOT_GAP`, not attempted here since the array-order bug alone
      is a sufficient, confirmed explanation.
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
