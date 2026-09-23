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

- [x] `done` — **Fix: a wrong catch chain-caught during the out-of-HP
      retrace epilogue silently overwrote "depleted" back to "wrong" on
      `#door-status` (2026-09-11).** Found while merging the fall-gravity
      change below onto `main`: `idiom-door.spec.ts`'s "running out of
      HP..." test started intermittently failing (CI: 2 separate full
      runs, both mobile — Playwright's own internal retry hit it both
      times too; locally reproduced ~66% of the time regardless of
      `FALL_GRAVITY_MULTIPLIER`, confirmed at the original 2x too, so not
      caused by that change). Root-caused with a real `MutationObserver`
      trace on `#door-status`/`#door-hp` (not just theorized) rather than
      guessed at: `checkHpDepleted` *does* correctly set `data-outcome`
      to `"depleted"` the instant HP hits 0 and schedules the retrace —
      but nothing stops `checkCatches` from still running every
      subsequent frame afterward, unlike the *solved* path (frozen by
      `fastForwarding`'s early-return in `update()`). If the character
      was still mid-air from whatever jump depleted the HP (or catches
      another jump's arc before `OUT_OF_HP_RESTART_DELAY_MS`'s 900ms
      beat elapses) and chain-catches a second wrong tile in a later
      frame, `handleCatch`'s own wrong-catch branch calls
      `updateDoorStatus(..., "wrong")` again — clobbering "depleted"
      back to "wrong" a frame or two later (confirmed: `depleted` → `wrong`
      within ~70ms in the trace, HP already at 0 either way), which is
      exactly what the test's own `data-outcome` assertion then caught.
      Fixed by extending `update()`'s existing `!this.orderedState.isComplete`
      guard on `checkCatches` to also require `!this.doorTriggered` — once
      this run's fate is sealed (depleted *or* solved), no further catch
      should still be mutating UI/state, matching the solved path's own
      `fastForwarding` freeze. Purely a display/consistency fix — HP and
      catch-ordering were never actually wrong, just the label a child
      would briefly see before the already-queued retrace fired.
      Verified against the exact scenario that exposed it: 8/8 clean
      repeats of the previously-flaky test (4x mobile+desktop) after the
      fix, plus the full `idiom-door.spec.ts` suite (28 passed,
      mobile+desktop) and the standing `npm run typecheck`/`test` (336
      passed)/`build`.
- [x] `done` — **Door stage: fall even faster — 2x still read as a curve,
      not a drop (2026-09-11).** Follow-up to the 2026-09-04 "land
      vertical instead of curved or slow" entry below — per your "the
      door stage seems to have lost one of the PRs that fixed the jump.
      The jump should come down much faster vertically instead of like a
      curve slowly." It hadn't actually regressed (checked git history —
      `FALL_GRAVITY_MULTIPLIER` was still 2, unchanged since 2026-09-04),
      it just wasn't steep enough to read as "much faster" once you
      looked again. `runPhysics.ts`'s `FALL_GRAVITY_MULTIPLIER` 2 → 4:
      the fall now takes ≈50% (1/√4) as long as the rise, down from 2x's
      ≈71% (1/√2) — noticeably closer to a straight vertical drop. Jump
      height and run speed are untouched either way (still governed by
      `JUMP_VELOCITY`/`JUMP_GRAVITY`/`RUN_SPEED` alone).
      "It should never touch adjacent tiles" is already a separate,
      physics-independent guarantee — `catchSelection.ts`'s
      `CATCH_RADIUS_X` is sized (and asserted,
      `catchSelection.test.ts`'s `2 * CATCH_RADIUS_X < MIN_SLOT_GAP`) so
      two neighboring tiles' catch zones can never overlap at all,
      regardless of gravity — confirmed unaffected, not just assumed.
      A steeper fall is still a net positive for it though: less time (so
      less horizontal drift, at the same `runSpeed`) spent descending
      through any one tile's height band.
      While re-validating this against the full e2e suite, found (and
      fixed) a real, pre-existing bug in the *test* helpers, unrelated to
      this change (confirmed reproducible at the original 2x too, 3/3
      runs) — `doorJump.ts`'s `jumpForFirstReachableWrongTile` picked
      *any* reachable tile that didn't match the character it was told to
      avoid, with no regard for how close that tile sat to one that
      *does* match — on today's specific date-seeded level
      (`sessionIdioms.ts`), a chosen "wrong" tile sometimes sat close
      enough to the genuinely-next tile that the same jump's arc (which
      `checkCatches` evaluates every frame, not once at takeoff) caught
      *both*: the deliberate wrong catch, immediately followed by a
      genuine catch of the real next character a few frames later,
      racing `idiom-door.spec.ts`'s "each jump costs HP..." test's
      `data-outcome === "wrong"` assertion past a state it moved through
      only transiently. Not a game bug — chain-catching an incidental
      second tile mid-arc is already intended, relied-on behavior
      elsewhere in this project — just an e2e helper that wasn't actually
      guaranteeing the isolated wrong catch its own name promises. Fixed
      by skipping any "wrong" candidate within `JUMP_ISOLATION_DISTANCE_X`
      (derived from the same real jump-footprint/`CATCH_RADIUS_X`
      geometry `doorJump.ts` already aims with, not a guessed number) of
      a same-char tile, so a jump aimed at a picked "wrong" tile
      genuinely can't also reach a real one.
      Verified empirically, not just reasoned about: the previously-
      failing test reproduced 3/3 at the original 2x and 2/3 at 4x before
      the fix (confirming the gravity bump wasn't the cause — if
      anything it slightly reduced the failure rate, consistent with less
      horizontal drift), then passed 4/4 after the `doorJump.ts` fix, at
      4x. All green: `npm run typecheck`/`test` (335 passed, unchanged)/
      `build`, plus the full `idiom-door.spec.ts` suite (28 passed,
      mobile+desktop) re-run clean after landing both fixes.
- [x] `done` — **Writing stage: a "show me again" button to re-request
      the stroke demo per character, not just device-wide
      (2026-09-11).** Per your "I think there's a design for the writing
      guide to be turned off after a challenge. However this assumes the
      words are all already familiar to the player. can we include a
      button for players to review the strokes when he has forgotten?" —
      `shouldSkipStrokeDemo` (writingScore.ts, landed 2026-09-09) already
      turns off the automatic stroke-order animation device-wide once a
      device has a few completed sessions behind it, but that's a blunt
      guess: it can't tell "the child knows this specific character"
      apart from "the child is experienced enough that the rest of
      today's characters don't need the demo, but not this one."
      New `#writing-review-btn` (idiom-door.html, same `.icon-btn` shape
      as `#reveal-english-btn`'s "I don't understand" affordance),
      visible only while a quiz is actually waiting on a stroke
      (writingStatus.ts's existing phase toggle now also drives this
      button's `.visible` class, alongside `#writing-status`/
      `#writing-feedback`) — hidden while a demo is already animating or
      a just-finished character's rating is showing, since neither state
      has anything to "show again" yet. Tapping it (writingStage.ts's new
      `reviewChar`) replays that one character's own stroke-order
      animation (the same `animateCharacter` call `traceChar` already
      uses when the automatic demo isn't skipped) and hands back into a
      fresh quiz for it once the replay finishes — available whether or
      not `skipDemo` is in effect, since the whole point is covering the
      gap that device-wide flag can't.
      Deliberately a *fresh* quiz on return, not a resume from the
      stroke the child was stuck on: hanzi-writer's own `quiz()` always
      restarts a character's mistake tally at 0, so asking for the demo
      again also wipes whatever mistakes prompted asking — same "no fail
      state, nothing held against you" ethos every other mechanic here
      already keeps (backwards-stroke forgiveness, the 8-miss
      auto-advance cap, balloonHp/doorHp's floor-at-0). The button's own
      click handler is re-wired per character (`setReviewHandler`,
      removing the previous one before attaching the next — same manual
      "un-register on the way out" shape `showWritingSummaryCard`
      (main.ts) already uses for its own per-idiom Continue handler),
      since the button element itself persists across every
      character/idiom a writing-stage run drives, rather than being
      recreated like `#writing-target`'s own SVG content is.
      New e2e coverage in `writing-stage.spec.ts`: the button's
      visibility tracks the phase correctly, clicking it actually
      replays the demo and lands back in a completable quiz for the same
      character, and — the actual point of this feature — it still works
      on a device with the automatic demo skipped (3+ completed
      sessions). All green: `npm run typecheck`/`test` (335 passed,
      unchanged — no new pure logic to unit test, this is DOM/HanziWriter
      wiring the same way the rest of writingStage.ts already is)/
      `build`, plus the two new e2e tests (mobile+desktop) and the full
      existing `writing-stage.spec.ts`/`idiom-door.spec.ts` suites
      re-run clean.
- [x] `done` — **Balloon stage: curve each balloon's own idiom text and
      card, tighten the grid (2026-09-08).** Per your "curve the balloon
      so they don't take up so much horizontal space." Two false starts
      first, both from misreading "curve the balloon" as curving the
      *arrangement of balloons in the sky* rather than one balloon's own
      text and card: a zigzag-based layout that scattered 3 of 4
      candidates outside the camera's view ("balloons are missing"),
      then a corrected version that arranged the balloons themselves
      into a literal rainbow across the world ("I don't mean to spread
      the balloons out in a rainbow... the implementation got the wrong
      design"). Both reverted; `layoutBalloons` went back to its
      original grid.
      Two real fixes landed, per the actual follow-up feedback ("the
      words are curved but the rectangle remains the same... curve the
      rectangle" + "the balloons are too far apart... spread them evenly
      and slightly tighter"):
      1. **The card itself now curves.** `buildBalloon`'s background is
         a genuine curved band (`buildBalloon`'s `pointOnCircle`/path
         building, sampled onto the *same* circle `balloonGlyphArc.ts`'s
         `computeGlyphArc` already puts the 4 characters on — an inner
         arc and an outer arc closed into one banner shape) instead of a
         flat rounded rectangle sized to bound the curved text. Padding
         is tight and per-band (`BAND_PAD_X/Y`) rather than one generous
         allowance added once around an already-wide box.
         Worth being upfront about a real limit found here: for a
         4-character run to stay *legible* (each character rotated only
         a modest amount, not sideways), curving the text doesn't
         actually shrink its horizontal footprint much on its own — a
         wider curl trades width for height only past a point where
         individual characters would tilt too far to read. Checked
         numerically before landing this, not just assumed. The curved
         card is still the right visual (and what was asked for), but
         the real "less horizontal space" win is #2 below.
      2. **The grid is tighter.** `CELL_JITTER_FRACTION`
         (`balloonLevelContent.ts`, static per-level position
         randomization) 0.2 → 0.1 and `CELL_PADDING`
         (`BalloonSentenceScene.ts`, flat extra breathing room) 16 → 8 —
         together the biggest share of why cells were sized so much
         larger than the balloons actually needed. The continuous
         "drifting in the wind" animation amplitude
         (`WIND_DRIFT_RADIUS_X/Y`) is untouched — that's a different,
         not-asked-about thing, not the source of the "too far apart"
         complaint.
      Also stepped `CANDIDATE_CHAR_FONT_PX`/`CANDIDATE_PINYIN_FONT_PX`
      down (34/13px → 28/11px) in the first pass at this. All green:
      `npm run typecheck`/`test` (286 passed)/`build`, plus the full
      `idiom-door.spec.ts` e2e suite (24 passed, mobile+desktop)
      including the balloon-stage tests. Still a first look, not final
      tuning — `GLYPH_ANGLE_STEP_DEG`, `CELL_JITTER_FRACTION`, and
      `CELL_PADDING` are all easy to nudge further from here.
- [x] `done` — **Balloon stage: brick-style stagger, colors handed off
      for your pick, spacing nudged back out (2026-09-08).** Follow-up
      to the curve/grid-tightening work above, per "I don't like the
      stacking feel currently maybe a bit of brick like alternating
      floating... spread them out just a little bit more... just widen
      the horizon slightly."
      `layoutBalloons` now offsets odd rows by half a cell — the same
      running-bond offset actual brickwork uses — so no balloon sits
      directly under the one above it; the extra half-cell of world
      width that offset needs is exactly the "widen the horizon
      slightly" ask, not a separate knob. `CELL_JITTER_FRACTION`
      (0.1 → 0.13) and `CELL_PADDING` (8 → 11) nudged back up from the
      previous round's tightening, per "spread them out just a little
      bit more" — `WIND_DRIFT_RADIUS_X/Y` (the wind-drift animation)
      still untouched.
      Colors are yours to call, not guessed: published an interactive
      swatch picker (rendering the actual curved-band shape with real
      idiom text so colors read in context, live fill/border editing,
      a "suggest a fresh candy set" shuffle) rather than picking new
      `balloonColors.ts` hex values myself — say which set to lock in
      and I'll put it back into the file.
      All green: `npm run typecheck`/`test` (286 passed)/`build`, plus
      the full `idiom-door.spec.ts` e2e suite (24 passed,
      mobile+desktop) including the balloon-stage tests.
- [x] `done` — **Balloon stage: single overlapping line, a self-contained
      HP + pop-away on a wrong catch, more vivid colors (2026-09-08).**
      Another round of live feedback on top of the entries above:
      - **"the balloons can overlap a little, just keep them on the same
        horizontal line"** — drops the brick-stagger rows from the round
        before this one. `layoutBalloons` is back to a single row
        (`cols = total`), with a new `ROW_OVERLAP_FRACTION` (0.82)
        deliberately shrinking the cell spacing below the
        no-overlap-guaranteed formula — an *intentional* relaxation this
        time, not the accidental kind two earlier balloon-stage PRs
        shipped by mistake.
      - **"can we include some hp deduction if the wrong balloon is
        selected... after a wrong selection the balloon should pop
        away"** — new `balloonHp.ts` (pure state + test) is a small,
        self-contained HP counter *scoped to this stage only*, not yet
        the full cross-stage reward economy the writing-stage entries
        below describe (that needs the writing stage to exist first,
        so it can earn HP the door stage then spends) — this is the
        same shape that economy will eventually feed into, not a
        rewrite. A wrong catch deducts `WRONG_CATCH_HP_PENALTY` (20 of
        a starting 100, shown via new `#balloon-hp` /
        `balloonHpStatus.ts`), pops that decoy away for good (same
        shrink-and-destroy tween shape as a correct catch's grow, just
        inverted) via a new `popped` flag on `RuntimeBalloon` (skipped
        by catch-checking, drift/string updates, and the test-only
        position-sync hook). The *correct* balloon is never poppable —
        always something left to find, no fail state, same ethos as
        everywhere else here.
      - **"I still don't like the colours... I want more vivid
        colours"** — `balloonColors.ts` moves from a light pastel fill +
        vivid border to a saturated fill *and* a deep vivid border.
        Checked (not eyeballed) that `#4a3420` (BALLOON_TEXT) still
        clears 4.5:1 contrast — WCAG AA for normal text — against every
        new fill before landing it.
      All green: `npm run typecheck`/`test` (289 passed)/`build`, plus
      the full `idiom-door.spec.ts` e2e suite (24 passed, mobile+desktop,
      one mobile flake in the unrelated door-stage spam-jump test that
      passed clean on a solo re-run — pre-existing parallel-load timing,
      not a regression from this change).
- [x] `done` — **Balloon stage: no border on the card body (2026-09-08).**
      Per "let's do them without borders." `buildBalloon`'s curved-band
      body drops its `lineStyle`/`strokePath` — filled only now.
      `colorway.border` is untouched and still used for the dangling
      string (`redrawString`) — a separate visual element, not the
      card's own outline, so that wasn't part of the ask. All green:
      `npm run typecheck`/`test` (289 passed)/`build`, plus the full
      `idiom-door.spec.ts` e2e suite (24 passed, mobile+desktop, clean
      this time). New `balloonColors.ts` fill values from your palette
      pick are still pending — waiting on the actual hex values (the
      picker had no save feature, so nothing from your session there
      reached this repo).
- [x] `done` — **Writing/tracing stage: teach each character before the
      door (2026-09-08, landed 2026-09-09 through 2026-09-12).** New
      stage between an idiom's intro and its door
      (`src/idiom-door/writingStage.ts`): each of the idiom's characters
      shown one at a time over a HanziWriter (MIT) stroke-order template
      (`src/idiom-door/writingData/writingStrokeData.ts`, bundled locally
      for just this project's distinct characters), child traces it,
      scored on accuracy (`writingScore.ts`). Built by an interactive
      session across several commits (`be5fd14`..`d3dd868`) rather than a
      daily cycle, which is why this checkbox was never flipped at the
      time — confirmed still fully wired into `main.ts`'s
      `beginWritingStage` boot flow and covered by `e2e/writing-stage.spec.ts`
      during this cycle's backlog review, so correcting the record now.
- [x] `done` — **HP: earned from tracing, spent in the door stage, a
      real gate (2026-09-08, landed alongside the writing stage above).**
      Trace accuracy becomes that idiom's door-stage starting HP
      (`writingScore.ts`'s `PERFECT_TRACE_STARTING_HP = 100`,
      `traceRatingForAccuracy`); `doorHp.ts`'s `JUMP_HP_COST = 5` per
      jump and `WRONG_CATCH_HP_PENALTY = 10` extra on a wrong catch,
      landing right on this entry's own tuning estimate. At 0 HP,
      `checkDoor` routes back to *retracing* the same idiom
      (`beginWritingStage` called again from the restart path in
      `main.ts`) rather than just respawning the door tiles. HP meter +
      low-HP vignette live in the DOM layer (`doorHpStatus.ts`,
      `#door-hp`/`#low-hp-vignette`, own test coverage in
      `doorHpStatus.test.ts`). Same as the entry above: built by an
      interactive session, never marked done at the time; confirmed
      still fully wired and tested during this cycle's backlog review.
- [x] `done` — **Door stage: burning tile on a wrong catch (2026-09-08,
      landed 2026-09-10).** A wrong catch now recolors that specific
      tile scorched/charred (`IdiomDoorScene.scorchTile` — dark
      charcoal fill/border/text in place of the bright catchable
      palette) and marks it `inert`, so `checkCatches` stops
      considering it a candidate for the rest of the level. The wrong
      catch's own spark burst is reused (`spawnSparkBurst` now takes an
      optional `color`) but with its own angrier palette
      (`SPARK_COLOR_WRONG`, hot orange-red) and more particles (6 vs.
      the correct-catch default of 3-8) instead of the celebratory gold.
      This closes the exact "touch-and-go" gap noted here: near a jump
      arc's apex the character can linger inside a tile's catch radius
      for several frames (the same effect the jump-arc/hitbox-tuning
      entries above fought to minimize, never fully eliminated), which
      used to let one mistimed jump register the *same* wrong tile
      several times in a row, each firing its own "wrong" outcome.
      Scorching after the first wrong touch means one mistake reads as
      one mistake.
      Checked this can't make a level unsolvable before landing it:
      `levelContent.ts` already generates
      `MIN_REPEATS_PER_CHARACTER..MAX_REPEATS_PER_CHARACTER` (5-9) tiles
      per character, scattered across the track, specifically so any
      one tile being unavailable (caught, missed, or now scorched)
      still leaves several others bearing the same glyph — including
      for the three repeated-character idioms unblocked last cycle,
      where both occurrences already draw from that same per-character
      pool. A scorched tile stays visible (charred, not destroyed) and
      resets automatically on a level restart (`spawnTiles` rebuilds
      every tile's runtime state from scratch).
      No HP economy exists in the door stage yet (that's the separate
      HP entry above, gated on the writing/tracing stage) — this change
      is scoped to the visual/UX fix only, but shares the same tile
      object so wiring an HP deduction into `scorchTile`'s call site
      later is a small addition, not a rework.
      All green: `npm run typecheck`/`test` (290 passed, unchanged —
      `IdiomDoorScene` is a thin Scene wrapper with no unit tests of its
      own, same pattern as the rest of this stage)/`build`, plus the
      full `idiom-door.spec.ts` e2e suite (60 passed, mobile+desktop).
- [x] `done` — **Door stage: match caught tiles by glyph, not a
      pre-baked index — unlocks repeated-character idioms (2026-09-09).**
      `ELIGIBLE_IDIOM_IDS` used to exclude 一心一意/有始有终/相亲相爱
      because they repeat a character, and the door puzzle's catch
      logic (`orderedCatchProgress.ts`, `IdiomDoorScene.handleCatch`)
      pre-assigned each tile to a specific character *position* at
      level-build time — for a repeated glyph that produced two tiles
      that looked identical on screen but were internally tagged for
      different positions, so a child could get told "wrong" for
      grabbing the exact glyph asked for. Fixed: `attemptGrab` now takes
      the grabbed tile's actual glyph plus the idiom's full character
      array and compares against `expectedChars[nextIndex]` by value,
      instead of a `grabbedIndex`/`total` pair keyed to a baked-in
      position — `IdiomDoorScene.handleCatch` now passes
      `tile.def.char`/`this.characters`. Order stays enforced between
      *distinct* characters (still teaches the idiom's real character
      order); repeated glyphs just satisfy whichever occurrence is still
      outstanding — new `orderedCatchProgress.test.ts` case walks
      一心一意's actual 一-心-一-意 sequence end to end to confirm it.
      `levelContent.ts`'s tile-building (per-position repeats/decoys)
      didn't need to change — it already tagged each occurrence of a
      repeated glyph with its own `correctIndex` independently, that
      index just no longer gates the catch check directly. Decoys still
      can't collide with this ambiguity: `buildLevel`'s `validDecoys`
      filter already excluded every glyph in the idiom's own (deduped)
      character set, repeats included.
      `ELIGIBLE_IDIOM_IDS` (`sessionIdioms.ts`) now includes all 15
      idioms — nothing left to exclude — so 一心一意/有始有终/相亲相爱 are
      playable in the door/balloon/match rotation from today onward, not
      just the 12-idiom subset. Checked the one other place that name
      mattered: `matchLevelContent.ts`'s cross-idiom first-half/last-half
      collision guard is about *different* idioms sharing the same half,
      unrelated to a single idiom repeating its own character — verified
      by hand (and by `matchLevelContent.test.ts`'s existing
      whole-pool-no-collision test) that all 15 idioms' first-two/
      last-two characters are still pairwise distinct.
      All green: `npm run typecheck`/`test` (290 passed, +1 new
      test)/`build`, plus the full e2e suite (60 passed, mobile+desktop).
- [x] `done` — **Example sentences: fix 4 that were correct but didn't
      illustrate their idiom's actual meaning (2026-09-09).** Per your "some
      are not point on... although they are correct." Reviewed all 15
      `exampleSentence.hanzi` in `src/idioms/idioms.ts` against each idiom's
      `meaning`; four missed the point despite being grammatically valid
      idiom usage:
      - **拔苗助长** — old sentence ("can't rush learning to bike, practise
        slowly") only conveyed "don't rush," never the idiom's actual point
        that forcing it *backfires*. New sentence shows a child skipping
        training wheels too early and falling repeatedly as a direct result.
      - **温故知新** — old sentence ("review old words before a test") only
        showed the "review the old" half, never connecting to the "so the
        new becomes easier" payoff that's the whole causal point of the
        idiom. New sentence makes that link explicit.
      - **磨杵成针** — old sentence used reported speech ("Grandma often
        says...") instead of a child living out the persistence-pays-off
        meaning directly, and it used calligraphy while the idiom's own
        `dailyLifeScenario` field is about recorder practice. New sentence
        shows the child directly, in the same recorder-practice domain.
      - **助人为乐** — old sentence showed the helping action but not the
        "乐" (joy) that's specifically what the idiom names, not just
        helping. New sentence keeps the same action and adds that it made
        the child happy.
      All four re-authored with matching `pinyin`/`english`/`charPinyin`
      (charPinyin re-derived per character, punctuation-empty per the
      existing convention). `idioms.test.ts`'s content-integrity suite
      (own-hanzi inclusion, charPinyin length/punctuation alignment,
      cross-idiom sentence distinctness) passed unchanged against the new
      text — no test needed updating, which is the point of that suite
      being generic. All green: `npm run typecheck`/`test` (290
      passed)/`build`.
- [ ] `todo` — **Standing track: review the rest of the example-sentence
      pool the same way, and re-check any newly authored one against its
      idiom's actual meaning before treating it as vetted (2026-09-09).**
      The four fixed above were found by hand-reviewing all 15 sentences
      against their `meaning` field, not from a repeatable check — no
      automated way to catch "grammatically correct but off-point" (that's
      a judgement call, not a lint rule). Two borderline ones were raised
      and left as-is on your call: 助人为乐's "joy" framing is now folded
      into the fix above, but revisit if it still reads thin; 井底之蛙's
      more abstract lesson (flagged when it was authored, per its own
      `sourceNotes`) is worth an occasional re-read too. As the pool grows
      toward ~100 idioms (see the item below), do this same "does the
      example actually demonstrate the idiom's real meaning, not just use
      the characters correctly" pass on each new batch before treating it
      as fully vetted, same "needs your review" status the rest of this
      project's authored Chinese text already carries.

      **2026-09-19 daily cycle: ran this pass against the full current
      100-idiom pool on `main`.** Read all 100 `meaning`/`exampleSentence`
      pairs end to end (not spot-checked). Idioms 16-100 (batches 2-6,
      authored 2026-08-08 through 2026-09-18) all held up — every example
      sentence actually demonstrates its idiom's specific meaning rather
      than just using the characters correctly, no new fixes needed. This
      tracks: those batches were written *after* the original-15 pool's
      own review found this exact failure mode, so the lesson was already
      baked into how they were authored.

      **2026-09-21 daily cycle: landed PR #44, closing the original-15
      gap.** The gap noted above (PR #44's ported re-review sitting
      unmerged since 2026-09-12) is resolved — PR #44's own actual CI run
      had failed on `idiom-door.spec.ts:683`'s "solving all 3 levels..."
      test, on both mobile and desktop, which is why it sat unmerged
      rather than reflecting some overlooked reviewer objection. Checked
      rather than assumed unrelated: that failure is the same
      `doorJump.ts` chain-catch timing-margin class of bug documented at
      length in this file's own idiom-pool-growth entry below (PR
      #40/#47/#49's history) — PR #44's branch (based on `main` as of
      2026-09-11, before the 2026-09-16 root-cause fix landed) predates
      that fix entirely, so its CI run hit exactly the bug that fix later
      resolved. Merged PR #44's branch onto current `main` here — its
      `idioms.ts` content changes applied clean with no conflicts (only
      this file and `DECISIONS.md`'s own bookkeeping needed manual
      reconciliation) — and re-ran the full gate on top of the current,
      already-fixed `doorJump.ts`. All green (see `DECISIONS.md`'s
      2026-09-21 entry for the actual run's results), confirming the
      original CI failure really was the pre-existing bug and not a
      problem with PR #44's own content. The original 30-idiom pool is
      now fully covered end to end, on `main`, for real. Batches added
      after the 100-idiom milestone will still need this same pass before
      being treated as vetted.
- [x] `done` — **Remove the per-session match warm-up; matching becomes a
      milestone-finale-only mechanic (2026-09-08, landed 2026-09-12).**
      Per your steer: dropped `beginMatchStage`/`showMatchIntro` from
      `main.ts`'s boot flow entirely — a session now goes straight from
      the resurface card (if any) into the first idiom's intro
      (`matchLevelContent.ts`'s old always-built `matchLevel` singleton,
      tied to that session's own 3 idioms, is gone with it). In its
      place: every time the cumulative discovered-idiom count
      (`sessionHistory.ts`'s `allDiscoveredIdiomIds`) crosses a new
      multiple of 15 (`shared/matchMilestoneHistory.ts`'s
      `MILESTONE_BATCH_SIZE`/`pendingMatchMilestone`), that fresh batch
      of 15 triggers a celebratory match milestone — the existing
      idiom-halves mechanic (`IdiomMatchScene`/`matchProgress.ts`/
      `buildMatchLevel`, pairing/tile logic unchanged), split into 3
      sub-rounds of 5 (`splitIntoSubRounds`), scoped to that batch only
      (not the whole history). Checked right when a session that
      crosses the threshold finishes (`main.ts`'s
      `advanceAfterBalloonStage`, right after that session is recorded)
      — literally the session's finale, shown *before* the plain
      session-summary card, not instead of it.

      New running HP for the milestone itself (`matchHp.ts` — a wrong
      pair costs `WRONG_PAIR_HP_PENALTY`, same "running score, no fail
      state" shape as `balloonHp.ts`), carried across all 3 sub-rounds
      (each sub-round is a fresh `IdiomMatchScene` instance, its ending
      HP threaded into the next one's starting HP) rather than reset per
      sub-round. A "progress after each stage" card between sub-rounds
      (`showMilestoneRoundCard`) restates that HP running total, plus an
      in-stage "Round 1/3, 2/3, ..." badge
      (`matchMilestoneRoundStatus.ts`, reusing `#session-progress`'s own
      dots styling) — the "child can see his progress after each stage"
      steer. Each milestone's final HP is recorded to a new small
      on-device-only history (`shared/matchMilestoneHistory.ts`, no
      accounts, same shape `sessionHistory.ts`'s own saves already use —
      deliberately *not* yet wired into cloudSync.ts's export/import,
      noted as real follow-up scope in that module's own doc comment)
      so a finished milestone shows it against past ones ("Round 2: 480
      HP — Round 1 was 410, you're improving!" per this entry's own
      original example) — a personal-best line and a round-over-round
      trend line, same underlying data, displayed two ways
      (`showMilestoneFinalCard`), both skipped on the very first
      milestone since there's nothing yet to compare against. Not
      hardcoded to a fixed number of milestones — just keeps going as
      the idiom pool grows.

      Every e2e test that used to call `completeMatchStage` right after
      `page.goto` to get past the old per-session warm-up keeps doing
      so unchanged (22 call sites across idiom-door.spec.ts/
      writing-stage.spec.ts) — that helper (e2e/helpers/idiomMatch.ts)
      is now just a wait for `#level-intro-card`, which is already
      showing by then on every one of those callers' actual (fresh,
      unseeded-history) starting state; see its own doc comment. New
      `e2e/idiom-match.spec.ts` seeds a known 15-idiom "already
      discovered" history directly (localStorage, same technique
      writing-stage.spec.ts's own `seedCompletedSessions` already uses),
      then plays one real full session for real
      (`e2e/helpers/fullSession.ts`, extracted from
      idiom-door.spec.ts's own "solving all 3 levels..." flow since this
      needed the exact same real completion) to cross the threshold and
      exercise the whole milestone finale end to end — intro, a hint
      tap, a deliberate wrong pair (HP penalty confirmed), all 3
      sub-rounds' own progress cards, the final card's content, and the
      hand-off into the plain session summary after it. All gates green
      (typecheck/`test` 367 passed/`build`, plus the full mobile+desktop
      e2e suite).
- [x] `done` — **Grow the idiom pool from 15 toward ~100 (2026-09-08,
      batches 1-2 landed 2026-09-09/10; target reached 2026-09-18).** Same data-driven pattern
      `src/idioms/idioms.ts` already uses — per `AUTONOMY.md` this
      doesn't need a decision, just doing it. Authored in reviewable
      batches (matching this project's existing "needs your review
      before treated as fully vetted" practice for Chinese-language
      content), one flat age tier (no Upper Primary split, per your
      steer).
      **Batch 1 (2026-09-09): 15 → 30.** Added 持之以恒/全神贯注/一丝不苟/
      精益求精 (focus), 实事求是/光明正大/表里如一/诚心诚意 (honesty),
      见义勇为/雪中送炭/同甘共苦 (kindness), 举一反三/未雨绸缪/融会贯通/
      集思广益 (wisdom) — each with the full field set and meaning/origin
      verified via zdic.net, Baidu Baike, and Taiwan's MOE 成語典 (not
      from memory alone) before authoring, sourced per-entry in
      `sourceNotes`. Applied the previous cycle's own lesson (PR #33):
      each `exampleSentence` was written to actually demonstrate the
      idiom's causal meaning, not just use it grammatically. Checked by
      hand and by the existing `sessionIdioms.test.ts` (already generic
      over the *whole* pool, not a fixed subset) for zero first-half/
      last-half collisions — no code changes needed for that yet.
      `idioms.test.ts`'s hardcoded `expect 15` count is now a `>= 15`
      floor, since the rest of the suite validates new content
      generically per-idiom already. All green: typecheck/test (290
      passed)/build/e2e (60 passed, mobile+desktop). PR #34, merged.
      A follow-up (PR #37, same day) reworked 4 of these 15 sentences
      after your read-through flagged them as grammatically correct but
      weak illustrations (一丝不苟, 举一反三, 未雨绸缪, 融会贯通) — see
      that PR for specifics; worth repeating for future batches too,
      not a one-off.
      **Batch 2 (2026-09-10): 30 → 45.** Added 有条不紊/处变不惊/全力以赴
      (focus), 谦虚谨慎/知恩图报/严于律己/宽以待人 (honesty), 扶老携幼/
      手足情深/与人为善/乐善好施 (kindness), 明察秋毫/学以致用/因地制宜/
      深思熟虑 (wisdom) — same verification-before-authoring process as
      batch 1. Two candidates originally drafted turned out not to hold
      up under verification and were swapped before authoring: 眼见为实
      has no standalone zdic.net entry (only appears paired with 耳听为虚
      as a longer proverb) — replaced with 深思熟虑, which does; 尊老爱幼
      likewise has no standalone zdic.net page (only listed as a
      related term under other entries) — replaced with 扶老携幼, which
      does. All green: typecheck/test (290 passed)/build/e2e (60 passed,
      mobile+desktop). PR #39, merged.
      **Batch 3 (2026-09-12): 45 → 60.** Added 锲而不舍/废寝忘食/孜孜不倦/
      专心致志 (focus), 一诺千金/童叟无欺/襟怀坦白/大公无私 (honesty),
      舍己为人/扶危济困/慷慨解囊/古道热肠 (kindness), 触类旁通/见微知著/
      前车之鉴 (wisdom) — same verification-before-authoring process as
      batches 1-2. Two originally-drafted kindness candidates (乐于助人,
      无私奉献) didn't hold up under verification (no standalone zdic.net
      entry, same bar that dropped 眼见为实/尊老爱幼 from batch 2) —
      replaced with 慷慨解囊 and 大公无私/古道热肠, which do have proper
      dictionary entries. `锲而不舍`'s own pinyin is worth flagging since
      it's a common trap: MOE's 成語典 gives 注音 ㄅㄨˋ (i.e. `bù shě`, not
      the `bú shě` a couple of casual search summaries suggested) since
      舍/捨 here is 3rd tone, and 不's tone-sandhi shift to 2nd tone only
      applies before a 4th-tone syllable.
      This batch also surfaced (not caused) a real pre-existing bug: the
      full e2e suite failed everywhere past the resurface tests — root
      cause was `writingStrokeData.ts` (the bundled HanziWriter stroke
      subset), which turned out to have never been updated for the
      30→45 batch either. The 2026-09-10 regeneration (see that file's
      own header) only covered the 15→30 growth its own PR's diff was
      against; the 30→45 batch (PR #39, same day) added its own new
      characters afterward and nobody re-ran the regeneration for it —
      82 of the pool's 180 distinct characters were missing, not just
      this batch's own 15 new idioms' share. Regenerated against the
      full current 60-idiom set this time. Worth remembering for every
      future batch: re-check `writingStrokeData.ts` coverage against
      the *current* full idiom set, not just "the idioms this batch
      added" — a growth batch and its stroke-data regeneration aren't
      guaranteed to land in the same PR.
      All green: typecheck/test (336 passed)/build/e2e (84 passed,
      mobile+desktop, ~18.5 min — the writing-stage tests are the slow
      ones, real freehand tracing per character).
      **Remaining**: ~40 more idioms across further batches to reach
      ~100. One construction-time fix still needed before the pool gets
      much larger: `matchLevelContent.ts`'s no-collision guard (two
      idioms can't share the same first-two or last-two characters)
      currently assumes a small, hand-verified pool; collisions within a
      given milestone's 15-idiom batch become realistic well before 100.
      Needs to become an active collision-avoiding grouping step when
      assembling each milestone's batch, not just a guard that throws —
      tied to the separate "milestone-only matching" item below, not
      urgent yet at 60.
      **Batch 4 (2026-09-13): 60 → 75.** Added 脚踏实地/坚持不懈/一鼓作气
      (focus), 拾金不昧/一言为定/言出必行/说一不二 (honesty), 推己及人/
      守望相助/有求必应/一视同仁 (kindness), 画蛇添足/塞翁失马/对症下药/
      循序渐进 (wisdom) — same verification-before-authoring process as
      batches 1-3 (each checked for a standalone zdic.net entry, not
      just a search-summary mention, before being authored). One
      originally-drafted honesty candidate, 光明磊落, didn't clear the
      *other* verification step this batch newly ran (not just the
      dictionary-entry check the previous 3 batches already did):
      checked every new idiom's first-two/last-two characters against
      the *entire* existing pool for `matchLevelContent.ts`'s
      no-collision guard before authoring, not just after — 光明磊落
      shares its first half ("光明") with the already-shipped
      光明正大, which would have broken the halves-matching minigame
      the moment both landed in the same milestone batch. Caught by a
      small one-off Node script (`Array.from` each hanzi into
      first/last two-character halves, diff against the existing 60),
      not by hand — worth reusing for every future batch now that the
      pool is big enough for this to be a real risk, per the "Remaining"
      note just above. Replaced with 言出必行, which clears both checks.
      Also re-verified the whole 75-idiom pool is still collision-free
      via `sessionIdioms.test.ts`'s existing generic check (unchanged,
      still passes — no code change needed since it's already generic
      over the full pool).
      Regenerated `writingStrokeData.ts` against the full current
      75-idiom set up front (not just this batch's own 15 new idioms'
      characters) per the 2026-09-12 batch's own lesson — confirmed 0
      missing characters both before landing (36 new distinct
      characters added, 216 total) and via the same check re-run after
      writing this entry.
      **Validation — NOT all green, so this PR is not merged.**
      `typecheck`/`test` (343 passed)/`build` all pass. `test:e2e`
      failed (6-8 desktop tests, one mobile), all timeouts inside the
      writing/tracing-stage or jump-position helpers (`writingStage.ts`'s
      `mouse.move`/`#writing-status` polling, `doorJump.ts`'s
      `#player-position` polling) — never a content-integrity or
      collision assertion. Checked this isn't caused by this batch
      before assuming so, same as PR #40's precedent: (1) today's
      date-seeded 3-idiom session (触类旁通/同甘共苦/一丝不苟) doesn't even
      draw any of this batch's 15 new idioms, so the new stroke data
      isn't exercised by today's run at all; (2) confirmed byte-for-byte
      that `writingStrokeData.ts`'s entries for all 12 characters this
      run's idioms *do* use are unchanged from the pre-batch file
      despite the full regeneration; (3) re-ran the failing desktop
      tests against an unmodified `origin/main` worktree (no changes at
      all) and they fail identically there. This looks like this
      sandboxed session's headless Chromium being too slow for the
      writing-stage's fine-grained simulated mouse tracing under load,
      not a logic bug — but per `AUTONOMY.md`, an e2e failure still
      blocks auto-land regardless of suspected cause, same as PR #40.
      Pushed to `claude/daily-2026-09-13` and PR opened, **not merged**.
      **2026-09-14: rebase attempt, still not merged — a real GitHub
      Actions run caught what local runs didn't.** Merged latest `main`
      (which had picked up the milestone-only-matching change, PR #48,
      since PR #47 opened) onto a fresh session branch — only
      `DECISIONS.md` conflicted (both branches appended an entry),
      resolved by keeping both in chronological order;
      `idioms.ts`/`writingStrokeData.ts`/`BACKLOG.md` merged clean.
      `typecheck`/`test` (367 passed)/`build` all green throughout.
      `test:e2e` failed on the first local full run — a genuine
      exception this time, not a timeout: "running out of HP warns
      first..." threw from `jumpForFirstReachableWrongTile` ("no
      reachable tile... could be caught before the level ended"), for a
      real reason — *today's* date seed draws 明察秋毫 (this batch's own
      new content) as the session's first level, unlike #47's own day,
      so this batch's new idioms are actually exercised today.
      Investigated rather than assumed unrelated: hand-computed the
      level's real candidate-tile set — 32 safe "wrong catch" tiles
      exist across the track, several times more than the ~7 a full
      HP drain needs, so not a genuine tile-availability gap; the exact
      test passed 3/3 in local isolation. Checked what the *real* PR
      gate actually runs before trusting a bare local pass: `game-ci.yml`
      sets `CI: true`, which `playwright.config.ts` turns into a real
      retry (`retries: 1`) my first two local full-suite runs didn't
      have — re-ran locally with `CI=true` to match, and **all 70
      passed**. Opened PR #49 on that basis.
      **PR #49's own actual GitHub Actions run then failed anyway** —
      not the same test: "each jump costs HP, and a wrong catch costs
      extra on top" (`idiom-door.spec.ts:431`) got `nextIndex` `"2"`
      where it expected `"1"`, on *both* the original attempt and its
      built-in retry — the deliberately-wrong-aimed jump chain-caught
      the real next character too, for 明察秋毫's level once again (this
      batch's own content, same level 0 as the other failure). Never
      reproduced locally: 3/3 clean in isolation, and a full local
      `CI=true` run passed all 70 including this test. The underlying
      catch/margin code this depends on (`doorJump.ts`'s
      `JUMP_FOOTPRINT_X`/`WRONG_TILE_BACK_MARGIN_X`, `levelContent.ts`,
      `orderedCatchProgress.ts`) is untouched by this branch — this
      looks like the same class of pre-existing timing-margin fragility
      those constants' own history already documents (2026-08-30,
      2026-08-31, 2026-09-11 entries above), this time surfaced by which
      idiom this batch's growth happens to put in front of the door
      stage today, not a regression in anything this PR actually
      changes. But per `AUTONOMY.md`, a real e2e failure on the actual
      gate blocks auto-land regardless of suspected cause or how many
      local runs pass clean — so PR #49 (superseding #47, both left
      open) is **pushed but not merged**, for a human look or a future
      session, same as #40 and #47's own precedent. If it comes up
      again, the `doorJump.ts` margin constants themselves (not this
      batch's content) are the next place to look — see their own doc
      comments for the history of tuning them.
      **2026-09-16: root-caused and fixed the actual `doorJump.ts` bug
      behind #40/#47/#49, landed on top of #49's already-verified
      content.** The "next place to look" note above was right —
      `jumpForFirstReachableWrongTile`'s chain-catch safety filter used
      one flat `WRONG_TILE_BACK_MARGIN_X` (60px) behind every candidate
      tile's own x, regardless of that tile's height. But a jump's real
      takeoff point sits behind its target tile's x by an amount that
      *grows with the tile's height* (`timeToReachHeight` — ~34px at
      `HEIGHT_MIN`, ~79px at `HEIGHT_MAX`), so a flat 60px was
      simultaneously too narrow for taller candidates (a real excluded
      tile 70-90px behind one could slip through the filter and get
      chain-caught for real — exactly PR #49's own mobile CI failure,
      chain-catching a real 明 tile on 明察秋毫's level) and too wide for
      shorter ones (over-excluding otherwise-safe candidates — exactly
      #49's own desktop CI failure, "no reachable tile" on the same
      明-heavy level). Not guessed: confirmed by hand-computing both
      failing levels' real tile positions and takeoff offsets against
      the old filter before writing a fix. Replaced the flat margin with
      each candidate's own real arc (`takeoffXForTile(t)` through
      `takeoffXForTile(t) + JUMP_FOOTPRINT_X`, padded by `CATCH_RADIUS_X`
      on both ends — the same real hitbox `checkCatches` itself uses),
      removing `WRONG_TILE_BACK_MARGIN_X` entirely. Verified
      quantitatively against every idiom in the current 75-idiom pool's
      actual generated levels (not just the one that happened to fail),
      not just reasoned about: the old flat filter missed 37 genuine
      chain-catch risks and over-excluded 158 otherwise-safe candidates
      across the whole pool; the new arc-based check resolves every one
      of those correctly. Confirmed live: the full mobile+desktop e2e
      suite (70 tests) passed clean, then the two specific tests that
      had failed on PR #49's own CI run (`idiom-door.spec.ts:431`/`:500`)
      were re-run 3 more times each on both projects (12/12 clean) rather
      than trusting one pass, given this exact bug had already produced
      a false "all green" locally once before (PR #49's own history
      above). All gates green: `npm run typecheck`/`test` (367
      passed)/`build`/`test:e2e` (70 passed, mobile+desktop, plus the
      12/12 targeted re-runs). Landed PR #49's batch-4 content (60 → 75
      idioms) together with this fix — same branch, since the fix is
      what unblocks that content, not a separate concern. #47 and #49
      are both now superseded/closed in favor of this.
      **Batch 5 (2026-09-17): 75 → 90.** Added 闻鸡起舞/愚公移山/水滴石穿/
      三心二意 (focus), 开诚布公/直言不讳/循规蹈矩/问心无愧 (honesty), 患难与共/
      无微不至/嘘寒问暖 (kindness), 亡羊补牢/掩耳盗铃/刻舟求剑/画龙点睛 (wisdom) —
      same verification-before-authoring process as batches 1-4 (each
      confirmed to have a standalone zdic.net entry, not just a
      search-summary mention, before being authored; zdic.net itself is
      network-blocked from this sandbox, so verification went through
      WebSearch queries targeted at its indexed pages plus Baidu Baike
      instead of a direct fetch). Every candidate's first-two/last-two
      character halves were checked against the full existing 75-idiom
      pool, and against each other within this batch, before authoring
      — per the batch-4 lesson — and came back clean; no swaps were
      needed this round. Confirmed via `sessionIdioms.test.ts`'s
      existing generic pool-wide collision check (unchanged, still
      passes over all 90).
      Two of this batch's idioms (直言不讳, 无微不至) have their own name's
      `不` immediately before a 4th-tone syllable — kept each entry's own
      top-level `pinyin` field at the dictionary citation tone (`bù`,
      confirmed by web search against multiple idiom dictionaries) but
      applied real spoken tone sandhi (`bú`) in the compressed
      sentence-embedded form, matching `坚持不懈`'s own existing precedent
      in this same file (`jiān chí bù xiè` at the top, `jiānchí-búxiè`
      inside its example sentence).
      Regenerated `writingStrokeData.ts` against the full current
      90-idiom set up front, per the 2026-09-12/09-13 batches' own
      lesson about partial regenerations — 40 of this batch's 55
      distinct characters were new (the other 15 already covered by
      earlier batches' overlapping characters); confirmed 0 missing
      characters across the whole pool both before and after landing
      (256 distinct characters total).
      All green: `npm run typecheck`/`test` (367 passed, unchanged — no
      new pure-logic surface, same as every prior content-only batch)/
      `build`/`test:e2e` (70 passed, mobile+desktop, run with `CI=true`
      to match the actual PR gate, per PR #49's own lesson that a bare
      local run isn't enough to trust).
      **Batch 6 (2026-09-18): 90 → 100 — this item's ~100 target
      reached.** Added 千锤百炼/埋头苦干/只争朝夕 (focus), 货真价实/言行一致
      (honesty), 相濡以沫/感同身受 (kindness), 买椟还珠/邯郸学步/郑人买履
      (wisdom) — same verification-before-authoring process as batches
      1-5 (each confirmed to have a standalone zdic.net entry via
      WebSearch, not just a search-summary mention, before being
      authored; zdic.net remains directly network-blocked from this
      sandbox, same as batch 5's own note). Every candidate's
      first-two/last-two character halves were checked against the full
      existing 90-idiom pool, and against each other within this batch,
      before authoring — came back clean, no swaps needed. Confirmed via
      `sessionIdioms.test.ts`'s existing generic pool-wide collision
      check (unchanged, still passes over all 100) and a standalone
      script re-deriving every idiom's halves directly from `idioms.ts`
      (same technique batch 4 introduced).
      Two pinyin/tone details worth recording for future batches: (1)
      言行一致's own `不`/`一`-adjacent tone-sandhi treatment follows
      batch 5's precedent (top-level `pinyin` at the dictionary citation
      tone, real spoken sandhi applied only in the compressed
      example-sentence form) — confirmed against this file's own
      existing 一视同仁/一诺千金/一言为定 entries, which turned out to
      already be inconsistent with each other on this point (citation
      tone frozen for some, sandhi'd for others), so this batch matched
      whichever existing entry's pattern fit each specific case rather
      than picking one rule and forcing it everywhere. (2) Generated
      each new `charPinyin` array's first draft with the `pinyin-pro`
      npm package (installed with `--no-save`, used only as a local
      drafting aid this session — not a project dependency) rather than
      typing every character's reading by hand from scratch, then
      hand-corrected every character the library's word-segmentation
      guessed wrong before treating any of it as vetted — most
      commonly 只 ("only," mis-read as the animal-classifier zhī) and
      地 (the adverbial particle "-ly," mis-read as the noun "earth"
      dì) in several sentences, both caught and fixed by cross-checking
      against this file's own existing usage elsewhere before landing.
      Worth a future batch reusing the same drafting shortcut, but not
      skipping the same hand-verification pass.
      Regenerated `writingStrokeData.ts` against the full current
      100-idiom set up front (fetched from a temporary, not-saved
      `hanzi-writer-data@2.0.1` install, same one-off-tool pattern as
      `pinyin-pro` above) — 27 of this batch's 34 distinct characters
      were new (the other 7 already covered by earlier batches'
      overlapping characters); confirmed 0 missing characters across the
      whole pool (283 distinct characters total).
      All green: `npm run typecheck`/`test` (367 passed, unchanged — no
      new pure-logic surface, same as every prior content-only
      batch)/`build`/`test:e2e` (70 passed, mobile+desktop, run with
      `CI=true` to match the actual PR gate, per PR #49's own lesson
      that a bare local run isn't enough to trust).

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
- [x] `done` — **Writing/tracing stage: teach each character before the
      door (2026-09-09).** Lands the two `todo` entries above it
      together (teaching the characters, and the HP economy that
      connects them to the door stage) — the second needed the first to
      exist, per that entry's own note.
      A new stage now runs between each idiom's intro card and its door:
      the idiom's 4 characters shown one at a time, a stroke-order
      animation (`HanziWriter.animateCharacter`) then a real freehand
      quiz (`HanziWriter.quiz` — genuine pointer-drawn strokes, graded
      stroke-by-stroke by the library itself, not reimplemented here).
      Stroke data (`writingStage/writingData/writingStrokeData.ts`)
      is a *derived subset* of `hanzi-writer-data` 2.0.1 — just the 51
      distinct characters across this project's own 15-idiom set, not
      the full corpus — carried with its Arphic Public License text
      alongside it per that license's redistribution terms.
      `writingScore.ts` (pure, unit-tested) turns each character's own
      mistake count into a 0-1 accuracy, averaged across the idiom (one
      badly-traced character doesn't zero out the whole thing) into
      `startingDoorHp` — up to `PERFECT_TRACE_STARTING_HP` (100) for a
      mistake-free trace, no baseline freebie for a bad one, per your
      "decent writing should enable the child to pass the door stage but
      if badly written the child should have to restart."
      `doorHp.ts` (pure, unit-tested) spends that pool in the door stage
      itself: `JUMP_HP_COST` (5) per *executed* jump, plus
      `WRONG_CATCH_HP_PENALTY` (10) on top for one that lands on the
      wrong character. `canJump` goes false at 0 HP —
      `IdiomDoorScene.update` swallows jump input rather than queuing it,
      so the character keeps auto-running but can't catch anything.
      Reaching the door unsolved (always possible, same as before) no
      longer just respawns the same tiles in place — a new
      `onUnsolvedDoorReached` callback (same pattern as `onDoorReached`)
      sends the child back through the writing stage for the same idiom,
      earning a fresh HP pool, before the door scene restarts. Falls back
      to the old in-place `restartLevel` when that callback isn't wired
      (e.g. a caller driving the scene directly), so nothing that doesn't
      opt in loses its "never truly stuck" guarantee.
      Deliberately plain DOM (`writingStage.ts` + a new
      `#writing-ui-layer`), not a Phaser Scene — HanziWriter owns its own
      SVG rendering target and pointer input directly, the same reason
      this project's reading-focused full-screen cards (level-intro-card,
      balloon-intro-card) are already plain DOM over the canvas rather
      than Phaser text. There's no game physics here for a Scene to
      usefully own.
      `idiom-door.spec.ts`'s old "just spam JUMP on an interval" e2e
      strategy no longer holds up against a real HP budget — most blind
      jumps land on nothing, and each one still costs HP. Replaced with
      *aimed* jumps (new `e2e/helpers/doorJump.ts`): each tile's own
      already-known, deterministic world position plus the door stage's
      own jump physics (now exported from `runPhysics.ts`, moved there
      from `IdiomDoorScene.ts` so they're importable without pulling
      Phaser into a Node test process) work out exactly when to press
      jump for a one-shot, reliably-landing catch — the same "expose the
      exact position, aim deterministically" approach `flyUntilResolved`
      already used for the balloon stage. A parallel helper
      (`e2e/helpers/writingStage.ts`) drives the writing stage itself
      with real freehand strokes along each character's own bundled
      median points, landing 0 mistakes every time, so every e2e test
      opens its door stage at the full starting HP unless it's
      deliberately testing the HP economy. New `writing-stage.spec.ts`
      covers the stage on its own (mirroring `idiom-match.spec.ts`'s
      relationship to the match warm-up); `idiom-door.spec.ts` gained
      dedicated HP-economy and retrace-routing tests alongside its
      existing coverage, rewritten throughout to trace before every door
      interaction.
      All green: `npm run typecheck`/`test` (306 passed, +16 new)/`build`,
      plus the full e2e suite (mobile+desktop).
- [x] `done` — **Skip the stroke-order demo for an experienced child; a
      distinct pop animation for a wrong balloon (2026-09-09).** Two
      small follow-ups from live feedback on the writing stage/balloon
      stage above.
      - **"For the more advanced phases maybe after three
        celebrations, can we skip the example tracing? The child may
        get impatient waiting if he already knew the strokes."** —
        `writingScore.ts`'s new `shouldSkipStrokeDemo` gates
        `writingStage.ts`'s per-character stroke-order animation
        (`HanziWriter.animateCharacter`) on how many sessions this
        device has already completed (`sessionHistory.ts`'s new
        `completedSessionCount` — each session ends at the celebratory
        summary card, "celebrations" per your phrasing).
        `SESSIONS_BEFORE_SKIPPING_STROKE_DEMO` (3) or more behind it,
        and every character's quiz starts immediately instead — the
        animated demo is skipped, not the quiz's own outline guide
        (`showOutline: true`, unchanged), so there's still a faint
        reference while tracing. Re-checked on every call
        (`main.ts`'s `beginWritingStage`), not cached once at
        bootstrap, so the exact session crossing the threshold already
        benefits on its very next idiom.
      - **"For the balloon stage can we add some animation when we
        burst the wrong balloon? Like explode into tiny rubber pieces
        or confetti like?"** — `BalloonSentenceScene`'s wrong-catch
        handling used to reuse the same golden `spawnSparkBurst` a
        correct catch gets (just fewer sparks) before the plain
        shrink-and-fade. New `spawnPopBurst` replaces that with ~14
        small rotated-rectangle shards, colored from the popped
        balloon's own colorway (fill + border) mixed with a couple of
        fixed accent colors for a multi-colored confetti feel, tumbling
        outward and downward (a light gravity-like bias, not real
        physics) while spinning and fading — reads as distinctly *not*
        the correct-catch flourish, per your ask.
      All green: `npm run typecheck`/`test` (312 passed, +6 new)/`build`,
      plus targeted e2e coverage (new `writing-stage.spec.ts` tests
      confirming a fresh device still sees the demo, a device with 2
      prior sessions still sees it, and one with 3+ skips straight to
      the quiz; a one-off manual check confirmed the balloon pop-burst
      runs with no page errors and the expected HP deduction) plus a
      full mobile+desktop e2e suite run.
- [x] `done` — **Writing feedback, immediate restart at 0 HP, and a
      low-HP warning (2026-09-10).** Three fixes from live feedback on
      the writing/door stages above.
      - **"there should be some feedback on the writing to explain to
        child how well he wrote and eventually how many points he
        got"** — `writingScore.ts`'s new `traceRatingForAccuracy` maps
        a character's trace accuracy to a 3-star rating and an
        always-encouraging label (never "fail"/"bad"/"wrong", matching
        this project's no-fail-state ethos even at 0 stars). New
        `#writing-feedback` shows that rating right after each
        character's own quiz resolves (`writingStage.ts`, a short
        `FEEDBACK_DISPLAY_MS` beat before the next character begins);
        `writingStatus.ts` gained a third `"feedback"` phase (alongside
        `"watch"`/`"trace"`) so `#writing-status`'s own `data-phase`
        doesn't linger stale on `"trace"` for that whole beat — found
        because an e2e helper polling for `"trace"` to know it's safe
        to draw the next stroke could otherwise match immediately on
        the stale value and re-trace the character that just finished.
        Once every character is done, a new `#writing-summary-card`
        (`main.ts`'s `showWritingSummaryCard`, gated behind its own
        Continue tap like every other card in this project) restates
        the idiom, its overall star rating, and the literal HP number
        earned for the door stage — the "how many points he got" half.
      - **"once the hp reaches 0 at the door stage, it should
        immediately restart instead of continuing without ability to
        jump"** — `IdiomDoorScene`'s new `checkHpDepleted` (checked
        every frame, alongside the existing `checkDoor`) fires as soon
        as HP hits 0 while the idiom is still unsolved, instead of
        waiting for the character to physically run the remaining
        track to the door with jumping disabled the whole way. Shows a
        brief "Out of energy! Let's trace it again..." door-status
        message (new `"depleted"` `GrabOutcome`) for
        `OUT_OF_HP_RESTART_DELAY_MS` (900ms — long enough to read, far
        short of actually running to the door) before retracing via the
        same `onUnsolvedDoorReached` path the door-reached-unsolved
        case already used. Refactored both call sites into a shared
        `triggerRetrace`.
      - **"give the player some warning when hp is running low or
        insufficient to jump thru the door phase"** — `doorHp.ts`'s new
        `isHpLow`/`LOW_HP_THRESHOLD` (20 — below which a single wrong
        catch's full cost, `JUMP_HP_COST` + `WRONG_CATCH_HP_PENALTY` =
        15, would leave 5 or less) flags the on-screen `#door-hp`
        counter (`doorHpStatus.ts`, rewritten) with a `⚠️` prefix and a
        `data-low` attribute plus a pulsing red animation, so running
        low never comes as a total surprise before the immediate
        restart above.
      - **Bug found while e2e-testing the low-HP warning, fixed
        alongside it:** a *wrong* catch never marked its tile `caught`
        (unlike a correct one — the same physical tile still needs to
        be catchable later, once it's actually that character's turn),
        but `checkCatches` runs every frame of a jump's whole arc, and a
        tile tall enough to sit close to the jump's own apex could stay
        within catch radius for several consecutive frames — without a
        guard, every one of those frames re-ran the same wrong catch,
        each charging another `WRONG_CATCH_HP_PENALTY` on top of the
        last. A single mistimed jump near a tall wrong tile could burn
        through most or all of a level's starting HP pool in one jump —
        nowhere close to the "one wrong catch, one penalty" cost every
        other mechanic (and the child) expects, and a real fairness bug
        the new low-HP warning would otherwise have had no chance to
        catch. Fixed with a new `wrongCaughtThisArc` flag per tile, set
        on a wrong catch and cleared the next time the character lands
        — a fresh takeoff gets a fresh chance to catch it, only that
        jump's own lingering re-catch was ever the problem.
      All green: `npm run typecheck`/`test` (335 passed, +23 new)/
      `build`, plus the full mobile+desktop e2e suite (new coverage:
      per-character feedback and the writing-summary card in
      `writing-stage.spec.ts`; immediate-restart-on-depletion with the
      low-HP warning confirmed via a `MutationObserver` watching
      `#door-hp`'s own `data-low` attribute, catching the warning even
      when it only shows for a single frame between two catches in the
      same jump, in `idiom-door.spec.ts`). Also hardened
      `e2e/helpers/doorJump.ts` along the way: `jumpForTile` now waits
      out a jump's own full airborne duration after pressing (so a
      caller chaining aimed jumps back to back never presses again
      while still mid-arc from the previous one — `IdiomDoorScene` only
      accepts jump input while grounded), and new
      `jumpForFirstReachableWrongTile` tries candidate tiles in track
      order rather than trusting a single nearest one's own timing
      margin, same shape as `catchCharacter`'s existing per-tile retry.
- [x] `done` — **Fix: 47 of the grown idiom pool's 98 characters had no
      writing/tracing-stage stroke data at all (2026-09-10).** Found
      while merging the writing-feedback work above onto main after the
      idiom pool grew 15 → 30 idioms (98 distinct characters): this
      project's own `writingStrokeData.ts` — a hand-curated subset of
      `hanzi-writer-data`, deliberately not the full corpus — still only
      covered the *original* 15-idiom pool's 51 characters. The 15 new
      idioms' extra 47 characters were silently missing, which
      `writingStage.ts`'s `charDataLoader` would only ever surface as a
      quietly-swallowed load error (not a crash) — the writing stage for
      any of those 15 idioms would just hang, never reaching the trace
      phase, with nothing on screen to explain why. Regenerated the file
      (per its own documented one-off procedure) against the full
      current idiom set — all 98 characters now covered, checked by
      diffing every idiom's distinct hanzi against the bundle's own
      keys before landing this, not just re-running the generator and
      trusting it.
      Also bumped `idiom-door.spec.ts`'s "dev 'new idioms' control"
      test's own timeout (90000ms → 180000ms): it's the only test in
      that file running a full match + writing-stage + door-entry cycle
      *twice*, and a real freehand trace of one idiom's 4 characters
      (writingStage.ts's `FEEDBACK_DISPLAY_MS` beat included) measured
      ~40-50s on its own — two back to back left essentially no slack
      against the old budget even under normal conditions, which is
      exactly what started actually missing the deadline (not just
      occasionally flaking) once this session's feedback-beat additions
      lengthened every playthrough. Sized against this file's own
      established "budget to the actual workload" pattern (see the
      3-level session-summary test's 600000ms).
      All green: `npm run typecheck`/`test` (335 passed)/`build`, plus
      the full mobile+desktop e2e suite, with the previously-hanging
      "dev 'new idioms'" test re-run several times in isolation (with
      and without other tests competing for the sandbox) to confirm the
      fix rather than trusting one clean pass.
- [x] `done` — **Low-HP warning: a full-screen pulsing vignette, not
      just a tiny corner icon (2026-09-11).** Per your "low hp needs to
      be more obvious, it is now a tiny icon on screen" — direct
      follow-up to the low-HP warning entry above.
      `#door-hp[data-low="true"]` (style.css) now gets a real alert
      treatment — a filled red pill visibly bigger than the counter's
      own normal size, not just the previous same-size color swap —
      but the bigger change is new `#low-hp-vignette`: a full-viewport
      pulsing red edge glow (`position: fixed`, `pointer-events: none`),
      toggled by the same `data-low` state (`doorHpStatus.ts`).
      Peripheral-vision-sized on purpose: a child's eyes are on the
      runner mid-jump, not a small corner status chip. Nested inside
      `#catch-ui-layer` (rather than absolutely positioned within it,
      which would've boxed it into that layer's own thin top-strip
      height) specifically so `.stage-hidden` hiding that layer also
      hides the vignette the instant the door stage isn't showing, with
      no separate cleanup needed. Checked with a real screenshot before
      landing (`#door-hp` forced low via `page.evaluate`), not just
      trusted from the CSS alone.
      Also fixed two real, pre-existing e2e test-helper bugs found
      while re-validating the full suite against this (both in
      `e2e/helpers/doorJump.ts`, unrelated to the CSS/DOM change
      itself, exposed by which idioms happened to be in today's
      session): (1) `jumpForFirstReachableWrongTile` (used by the
      deliberate-wrong-catch HP tests) could pick a "wrong" tile
      sitting close enough to the actually-needed tile that the same
      jump chain-caught *both* — turning a deliberate wrong catch into
      an accidental correct one. Fixed with a new safety margin (new
      `JUMP_FOOTPRINT_X`/`WRONG_TILE_BACK_MARGIN_X`, derived from the
      jump's own real flight distance, not guessed) excluding any
      "wrong" candidate whose own arc could sweep into the needed tile;
      a first, simpler symmetric-margin pass at this fixed the bug but
      was overly conservative, occasionally starving a different test
      (draining a whole HP pool via repeated wrong catches) of enough
      safe candidates to finish before the runner reached the end of a
      level whose target character recurred often — narrowed to the
      real (mostly-forward) danger zone once caught live, not just
      assumed correct from the first pass. (2) That draining test's own
      timeout budget got a matching bump for the same "size it to the
      real workload" reasoning as the 'dev new idioms' test's own fix
      above.
      All green: `npm run typecheck`/`test` (336 passed)/`build`, plus
      the full mobile+desktop e2e suite (80 passed) — both doorJump.ts
      fixes specifically re-run several times each (not just once) to
      confirm they held rather than happened to pass by chance, given
      how timing-sensitive this exact area of the suite already was.

## Science Snake Game (new, 2026-09-16; merged to `main` 2026-09-22, 2026-09-23)

A second, standalone game — a P4-syllabus (Singapore MOE) science quiz
wrapped in a snake game, not a mode inside `idiom-door`. Design settled by
conversation on 2026-09-16; built across PR #51
(`claude/educational-snake-game-kd6anh`), human-playtested on its Vercel
preview and confirmed working, then merged into `main` on 2026-09-22
(`f226609`) — live at `/science-snake.html`. Round-over-round scoring
followed via PR #58 on the same branch, merged 2026-09-23 (`9f88008`).
Items below are ordered build-priority, pure-logic-first same as every
other mechanic in this repo.

- [ ] `in-progress` — **Content bank: P4 Science question set
      (`src/science-snake/scienceQuestions.ts`), authored + reviewed in
      batches of 5 (2026-09-16, see `DECISIONS.md`).** Batch 1 (5
      questions: diversity of living/non-living things, plant life cycle,
      states of matter, magnets, animal life cycle) landed —
      `src/science-snake/types.ts` + `scienceQuestions.ts` +
      `scienceQuestions.test.ts` (10 integrity tests, including a
      standalone check that every `modelAnswer` would itself grade
      correct against its own `requiredKeywords`, and that every `hint`
      stops short of doing the same — same "content bug, not just a
      nice-to-have" reasoning as `idioms.test.ts`'s own cross-checks).
      Batch 2 (5 more: plant systems, material properties, water cycle,
      heat conductors, light and shadows) landed the same way, merged
      into the single `scienceQuestions` array (batch boundaries marked
      inline, not separate exports) — 10 questions total now. Per your
      "can the answer be more specific to why the shadow grew longer":
      the light-and-shadows question's `requiredKeywords`/`hint`/
      `modelAnswer` were revised to require the actual mechanism (the
      sun sitting lower in the sky → a shallower light angle → a longer
      shadow), not just "the sun's position changes." More batches
      follow the same author-then-review-5-at-a-time flow before this
      item is done. Foundational —
      nothing else below is buildable/testable against real content
      without it. Each question: `topic`, `icon` (doubles as the
      snake-food sprite — 🍁🍂🍃 for plant parts/life cycles, 🔍🔎 for
      scientific investigation, 🧪 for materials, 🧲 for magnets, 💧 for
      water cycle, ☀️ for light/heat, plus 🧊/🦋 added as topics needed
      them — the roster is content-driven, not fixed), `prompt`,
      `requiredKeywords: string[][]` (OR-groups, every group must be
      hit), `minWords`, `hint` (a Socratic nudge shown after try 1, not
      the answer), `modelAnswer` (revealed word-chunked after try 2).
      Short-answer only — per your "questions 1-3 are too generic... a
      little more descriptive scenario" and "question 5 feels more
      suited for MCQ, we only want short-answer questions here" (batch 1
      review): every prompt needs a concrete little scenario (a named
      child doing/observing something) that gives the child enough to
      reason from, not a bare recall-the-fact or list-the-stages
      question — a plain list-in-order question reads as MCQ-shaped even
      without options, since there's nothing to actually reason about.
      MCQ-format content is explicitly out of scope for this game, left
      for later (per your "MCQ for another time").
- [x] `done` — **Pure grading module (`answerGrading.ts` + tests,
      2026-09-16).** `satisfiesRequiredKeywords` (case-insensitive, all
      `requiredKeywords` OR-groups must have a match), `isMalformed`
      (`minWords` floor plus a cheap "does this contain any
      sentence-shaped function word at all" check — lenient, not a
      grammar checker, so a P4 child isn't marked wrong for grammar they
      haven't been taught), `gradeAnswer` (malformed checked before
      keyword-matching, so a too-short answer is "malformed" even if it
      happens to contain every keyword), and `resolveAttempt` (the
      two-try flow itself: correct on either try, `retry` with the
      verdict on a wrong try 1, `reveal` on a wrong try 2). 15 tests;
      `scienceQuestions.test.ts` now imports this module's real
      `gradeAnswer`/`satisfiesRequiredKeywords` instead of its own
      duplicated copy, so content and grading logic can't quietly drift
      apart. All green: typecheck, full unit suite (403 passed).
- [x] `done` — **Hint + word-chunk reveal (`chunkWords.ts` + tests,
      2026-09-16).** Per your "wrong once must give guidance... wrong
      twice should reveal the correct answer maybe reveal three words at
      a time... to enforce reading instead of skipping away":
      `chunkWords(text, size = 3)` splits a sentence into 3-word groups
      (last chunk may be shorter), and `revealedText`/`isFullyRevealed`/
      `nextRevealedCount` give the overlay everything it needs to drive
      a tap-by-tap reveal — `isFullyRevealed` is exactly what should gate
      the "Continue" button into existing, so dismissing the reveal
      requires having stepped through every chunk first. Pure math only;
      the actual "Next →"/"Continue" tap handling belongs to the DOM
      overlay item below, not built yet. 10 tests, all green alongside
      the grading module above.
- [x] `done` — **Snake grid/movement/growth core (`snakeGrid.ts` +
      tests, 2026-09-16).** Grid (`GRID_WIDTH`/`GRID_HEIGHT`, 384 cells;
      portrait 16×24 since the 2026-09-18 mobile-layout fix, originally
      24×16) — big enough to sustain a 10-15 min session, small enough to
      stay winnable. `TICK_MS = 180`. `createInitialSnake`/
      `nextHeadPosition`/`changeDirection` (ignores a
      direct reversal, the classic Snake rule) handle movement;
      `step` advances one tick and returns `moved` /
      `self-collision` (wall-collision doesn't exist — see the 2026-09-18
      follow-up below, edges wrap instead) — self-collision (running into
      your own body) is the classic Snake lose condition, made explicit
      per the poison-apple follow-up, including the tail-vacates-this-
      tick nuance (moving onto the current tail cell is fine when not
      growing, a genuine collision when growth is owed that tick).
      Growth: `applyAppleEaten` (+`APPLE_GROWTH`, or ×`POISON_GROWTH_
      MULTIPLIER = 4` once `isPoisoned`), `applyCorrectAnswerEaten`
      (always +`CORRECT_ANSWER_GROWTH = 4`, untouched by poison either
      way), `applyPoisonAppleEaten` (owed-growth = current length, i.e.
      roughly doubles as the snake keeps moving, plus flips `isPoisoned`
      on permanently) — all via a shared owed-growth counter (the tail
      isn't popped for that many future ticks) clamped so total length
      can never exceed `TOTAL_CELLS`, not by teleporting segments onto
      the board. `hasWon` checks length against `WIN_LENGTH` (`WIN_
      LENGTH_RATIO = 0.7` of the grid, not literal 100% — see the
      Win/Lose scenes item below for why). 32 tests, all green alongside
      the grading/reveal modules above (typecheck + full unit suite,
      423 passed). Starting numbers, tune after playtest — same as every
      constant in this file.
      **Follow-up (2026-09-18) per "can we skip the running into the
      edge? Let's make it respawn at the opposite end":** wall-collision
      is no longer a lose condition at all. `isOutOfBounds` is gone,
      replaced by `wrapPosition` — reaching past an edge wraps the head
      to the opposite one (Pac-Man style), handling a negative
      coordinate correctly (`((n % size) + size) % size`, not plain
      `%`, which returns negative for a negative input in JS). `step`
      wraps the raw next position *before* running the self-collision
      check, so wrapping onto your own body is still correctly a
      self-collision, not a free pass — covered by its own test.
      `MoveResult`/`LoseReason` shrink to just `moved`/`self-collision`
      (`SnakeGameScene.ts`'s lose paths are now only self-collision and
      suffocation). Re-verified live: let the snake run to the right
      edge and past it — no lose card, snake head reappeared on the
      left edge, tail still trailing on the right, zero console errors.
      All green: typecheck, full unit suite (461 passed, up from 459),
      production build.
- [x] `done` — **Poison apples: 10% of apples, rainbow-colored,
      double the snake's length and permanently 4x its apple-growth rate
      (2026-09-16, revised from purple/one-shot-only per your follow-up).**
      Corrected stale bookkeeping (2026-09-22): this had been left
      `in-progress` waiting on the rainbow/"gooey" render treatment, but
      that landed with the Phaser scene item below the same day (the
      cycling-rainbow-palette-plus-wobble render, confirmed live) — all
      three pieces (growth rule, spawn rule, render) are in and merged.
      The growth-rule half is built and tested — `snakeGrid.ts`'s
      `applyPoisonAppleEaten`/`applyAppleEaten` (see that item above) —
      and so is the spawn-rule half: `itemSpawner.ts`'s `spawnApple`
      rolls poison at `POISON_APPLE_CHANCE = 0.1` (see the item spawner
      entry above). ~10% of spawned apples are poison
      instead of normal — visually the
      same apple sprite but rendered with a cycling rainbow palette
      (`POISON_APPLE_PALETTE`) rather than a single recolor, so it reads
      as distinctly "off" (same "recolor an existing thing for a
      variant" pattern `IdiomDoorScene.scorchTile` already uses for its
      wrong-catch tile, just an animated palette instead of a flat one).
      Eating one does two things: (1) sets owed-growth to the snake's
      *current* length, same instant-double mechanic as before — not an
      on-the-spot append, it plays out via `snakeGrid.ts`'s owed-growth
      counter as the snake keeps moving, since there's no valid board
      position to instantly place that many segments into; and (2) sets
      `isPoisoned = true` for the rest of the run, so every *normal*
      apple eaten afterward grows the snake by `4×` instead of `1×`. Both
      awards 0 points (tracked separately as `poisonApplesEaten`, not
      counted toward the apple score). Confirmed (2026-09-16):
      `isPoisoned` doesn't decay or wear off for the rest of the run,
      and eating a second poison apple re-triggers the instant double
      but doesn't stack the multiplier past 4x. This compounds the
      original danger: doubling on the
      spot *and* every subsequent apple now growing 4x as fast both
      shrink the snake's own safe maneuvering room fast, making
      self-collision (the explicit lose condition above) much more
      likely soon after — "cause the game to end quickly" per your ask,
      via a *different* lose path than `suffocation.ts`'s question-
      pileup one, though it's also a genuine risk/reward: 4x growth also
      races toward the 70% win threshold much faster for a player who
      can keep dodging their own tail. Owed growth is clamped so total
      length can't exceed `gridWidth * gridHeight` (defensive only — in
      practice a snake forced that large runs out of safe cells and
      self-collides well before hitting the literal cap).
- [x] `done` — **Item spawner + suffocation predicate (`itemSpawner.ts`,
      `suffocation.ts` + tests, 2026-09-16).** `seededRandom.ts`
      (`createRng`, mulberry32) is a deliberate standalone copy of
      `idiom-door`'s own — not imported cross-game, per the
      "completely independent" resolution in `DECISIONS.md`.
      `freeCells`/`pickRandomFreeCell` place items on any grid cell the
      snake/other items don't already occupy; `spawnApple` rolls poison
      at `POISON_APPLE_CHANCE = 0.1`; `pickNextItemType` keeps the
      board's science:apple ratio near `SCIENCE_TO_APPLE_RATIO` (~1
      science item per 3.5 apples) by direct ratio check on normal
      spawns (apple eaten/question answered correctly → spawn a
      replacement) — deliberately *not* used by
      `spawnIndigestionItems`, which bypasses the ratio entirely to
      place `INDIGESTION_SPAWN_COUNT = 3` replacement science items on a
      wrong-twice, the intended risk spike. `pickNextQuestionId` avoids
      putting the same question on the board twice at once, falling
      back to allowing a repeat only once every question is already
      active. Per your "should end early quickly if player fails, i.e.
      pooped out half the screen": `suffocation.ts`'s `isSuffocating` is
      a pure predicate over *unresolved science items specifically* (not
      apples, not the snake's own body) — `SUFFOCATION_THRESHOLD_RATIO
      = 0.5` of total cells triggers immediate game over, meant to be
      checked every tick, independent of snake length/win progress. 27
      tests (including a statistical check that the poison roll lands
      within 5 points of its configured 10% over 2000 spawns). All
      green: typecheck, full unit suite (450 passed, up from 423).
- [x] `done` — **Scoring + high score persistence
      (`scienceSnakeScore.ts` + tests, 2026-09-16).** `calculateScore`:
      `apples*APPLE_POINTS(5) + questionsCorrect*CORRECT_ANSWER_POINTS(30)`.
      `recordHighScoreIfBetter` is called only on a win (per your spec)
      and only overwrites the stored record when this run's score
      actually beats it. Direct-localStorage, try/catch-on-parse shape
      — same as `shared/sessionHistory.ts` — under its own
      `science-snake-high-score` key, not `idiom-door`'s; the
      cloud-sync half of that pattern isn't wired up yet (still
      localStorage-only), left for later polish. 11 tests.
- [x] `done` — **Phaser scene + DOM question overlay
      (`SnakeGameScene.ts`, `QuestionOverlay.ts`, 2026-09-16).** Thin
      wiring only, same "pure-function-plus-thin-Scene" split every
      mechanic here keeps — the Scene runs a `TICK_MS` timer calling
      `snakeGrid.ts`'s `step`, pauses the instant the snake eats a
      science item, hands control to `QuestionOverlay.ts`'s
      `askQuestion` (plain DOM over the canvas, same pattern
      `writingStage.ts` uses for text-heavy input — the two-try
      ask/hint/reveal flow itself is just `answerGrading.ts`'s
      `resolveAttempt` and `chunkWords.ts`'s reveal helpers wired to
      button clicks), and resumes once it resolves. Once
      `snakeGrid.ts`'s `isPoisoned` flips true, the snake's render
      cycles through a rainbow palette with a small per-segment sine
      wobble instead of its normal solid color — a persistent tell, not
      a one-off flash. No external art assets, same as the rest of this
      project — grid/snake drawn with Phaser Graphics, items rendered as
      their own emoji via Phaser Text.
      **Verified with a real headless-browser playthrough** (Playwright
      against a `vite dev` build, not just unit tests): built and
      steered the snake live, confirmed apples/poison-apple/science-item
      rendering, wall-collision game-over with correct stats, and the
      full question flow end-to-end — wrong answer 1 → hint appears,
      wrong answer 2 → word-chunk reveal (stepped through via "Next →",
      "Continue" only appearing once fully revealed) → indigestion
      correctly spawned 3 replacement science items on the board. Zero
      console errors throughout. All green: typecheck, full unit suite
      (459 passed), production `npm run build`.
      **Follow-up (2026-09-16) per "the snake is missing a head and a
      tail, able to make it obvious":** the head is now a distinct
      slightly-larger rounded square with two small white eyes that
      reorient to face whichever direction the snake is currently
      travelling (`DIRECTION_FORWARD`/`DIRECTION_SIDE`); the last
      `TAIL_TAPER_SEGMENTS = 3` segments shrink progressively toward the
      actual tail tip and get a couple of thin light ring stripes across
      them (skipped while poisoned, since the cycling rainbow fill is
      already that state's own tell) — evokes a real snake's tapered,
      banded tail rather than a uniform row of identical squares.
      Rendering-only change, re-verified live (zoomed screenshot of the
      snake with the dev server running).
      **Follow-up (2026-09-18) per "can this be mobile friendly too?
      Let's allow the child to tap to turn":** `#dpad`
      (`science-snake.html`) — 4 always-visible tap buttons in a cross
      layout, bottom-center, `.dpad-btn`'s `touch-action: none` and
      generous 3.4rem tap targets sized for a child's finger. Wired the
      same "DOM button calls a public method on the live scene
      instance" pattern `idiom-door`'s own `#jump-btn`/`requestJump`
      already uses — `SnakeGameScene.requestDirection` is the new
      public entry point, `main.ts` wires each button's `pointerdown`
      to it. Sits below the card-layer overlays' `z-index`, so tapping it
      while a card/the question overlay is open is *visually* blocked
      (though see the 2026-09-18 correct-answer-collision follow-up
      below — that turned out not to be the whole story; the keyboard
      path had no such protection at all). Verified with real touch taps
      in a headless browser against an iPhone 13 viewport/device
      profile (Playwright's `hasTouch: true` context, `page.tap`): the
      snake's on-screen position visibly changed direction after
      tapping the down button. All green: typecheck, full unit suite
      (459 passed), production build.
      **Follow-up 2 (2026-09-18) per "I still cannot play on mobile":**
      the D-pad addition alone didn't fix the real problem. Two actual
      bugs, found by measuring real layout geometry (not just eyeballing
      screenshots) against two device profiles (iPhone 13, Pixel 5):
      (1) `#game-container` was *both* CSS flex-centered *and* handed to
      Phaser's own `Scale.FIT` + `autoCenter: CENTER_BOTH` — two
      systems fighting over the same canvas's size/position, the kind
      of bug that "happens to render" in one browser/viewport and not
      another. Fixed by giving up the CSS-side centering entirely: a
      `#play-area` flex column now holds `#game-container` (`flex: 1 1
      auto`) and a `#dpad-bar` (`flex: 0 0 auto`) as plain siblings —
      Phaser owns 100% of the canvas's own sizing/centering, the DOM
      layout just reserves distinct space for each so they can never
      overlap by construction (confirmed via `getBoundingClientRect()`:
      the D-pad's top edge lands exactly at the canvas's bottom edge on
      both profiles, 0px overlap). (2) The grid itself
      (`snakeGrid.ts`'s `GRID_WIDTH`/`GRID_HEIGHT`) was landscape
      (24×16) — Phaser's `FIT` scale is capped by whichever screen
      dimension is tighter, and a phone's *width* is always the tight
      one, so a landscape board rendered as a small strip (~260px tall
      out of an ~840px-tall phone screen — technically functional, but
      tiny enough to plausibly read as "can't play"). Swapped to
      portrait (16×24, same 384 total cells, same win-threshold math) —
      the canvas now fills ~470-535px of vertical space on the two
      profiles tested, a ~2x improvement. All existing tests already
      referenced `GRID_WIDTH`/`GRID_HEIGHT` symbolically rather than
      hardcoding 24/16, so the swap needed no test changes. Re-verified
      live on both device profiles: canvas fill, zero geometry overlap,
      and a real touch tap still visibly turning the snake. All green:
      typecheck, full unit suite (459 passed), production build.
      **Follow-up 3 (2026-09-18) per "after every correct answer, the
      game ends with 'the snake ran into itself'":** a real, deterministic
      bug, root-caused rather than guessed — Phaser's keyboard manager
      listens on the whole window, not scoped to canvas focus, so every
      keystroke typed into `#question-input` that happened to match a
      WASD/arrow key was silently changing `this.snake.direction`
      *while the question overlay was open and the game paused*. Since
      a real sentence answer (required to pass the malformed-answer
      check) is essentially guaranteed to contain "a"/"s"/"d" somewhere,
      this fired on close to every answer, correct or not — by the time
      the game resumed, direction was whatever letter was typed last,
      effectively random, and very likely to immediately clip the
      snake's own body. `SnakeGameScene.requestDirection` (both the
      keyboard and D-pad path route through it) now ignores calls
      entirely while `paused`/`ended`, fixed at the single call site
      both input paths share rather than trusting the D-pad's own
      z-index blocking (which was never the actual protection here).
      Root-caused via code reading (not guessed), then verified live
      rather than trusting the theory alone: placed a science item
      directly in the snake's path via a temporary test-only hook,
      answered correctly with *real* character-by-character key events
      (`pressSequentially`, not `page.fill`, which wouldn't exercise the
      bug at all since it never dispatches keydown) for a genuine
      model-answer sentence loaded with "a"/"s"/"d", confirmed the fixed
      code survives it (no lose card, overlay closes cleanly), and
      separately confirmed normal keyboard steering still works outside
      the paused window. All green: typecheck, full unit suite (461 passed),
      production build.
- [x] `done` — **Win/Lose scenes + visuals (2026-09-16).** Win triggers
      at `WIN_LENGTH_RATIO = 0.7` of grid cells (~270 segments, not
      literal 100% — a free-moving snake can't realistically occupy
      every last cell without a Hamiltonian-path route, so 100% would
      make the win nearly unreachable; at 70% the board reads as
      visually full), and both win/lose show a card with the run's
      stats plus a working "Play again" (`main.ts`).
      Suffocation's death image (`playSuffocationDeath`): first attempt
      geometrically flipped the snake upside down (`scaleY = -1` around
      its own center) — turned out to be a dead end, verified live: a
      snake drawn as a straight row of symmetric rounded squares is
      pixel-identical when mirrored around its own center, so the flip
      was invisible in the actual common case (a straight horizontal or
      vertical stretch, not a curve). Replaced with a cue that's
      unambiguous regardless of shape: every segment switches to a pale
      `BELLY_COLOR` (the "rolled onto its back" tell) and the head's
      eyes become a cartoon "X X" (`DEAD_EYE_COLOR`), plus
      `SMOKE_PUFF_COUNT = 8` grey circles tweened rising/fading off the
      snake's center — a short `SUFFOCATION_DEATH_DURATION_MS = 1100`
      beat before the lose card shows, not a lingering animation, per
      your separate "should end early quickly" ask for this specific
      lose path.
      Two real bugs found and fixed while verifying this live (a
      temporarily-lowered `SUFFOCATION_THRESHOLD_RATIO` plus a
      temporary `window`-exposed scene handle, both reverted after —
      neither shipped): (1) `tick()`'s own trailing `render()` call ran
      *after* `handleHeadPosition()` could already trigger
      `playSuffocationDeath`, silently overwriting the just-drawn dead
      frame with a normal alive redraw before it was ever visible — now
      guarded by `if (this.ended) return`. (2) `isSuffocating` was only
      ever checked at the instant something was eaten
      (`checkOutcome`, called from inside the eating branches) — a
      board that piled up past the threshold while the snake was simply
      wandering having eaten nothing that tick would never actually
      have been checked at all; now also checked every tick
      unconditionally. Re-verified live after both fixes (forced a
      crowded board via a temporary test-only hook): pale/cream snake
      with black X eyes and rising smoke, confirmed correct. All green:
      typecheck, full unit suite (459 passed), production build.
- [x] `done` — **Entry point: `science-snake.html`, fully independent
      of `idiom-door` (resolved 2026-09-16, see `DECISIONS.md`).** Its
      own page/URL, no picker, no shared nav, no relation to
      `idiom-door.html` beyond living in the same repo/deploy —
      `vite.config.ts`'s build input list has its own `scienceSnake`
      entry alongside `idiomDoor`. `index.html`
      is untouched.
- [x] `done` — **Round-over-round improvement feedback
      (`scienceSnakeScore.ts`, 2026-09-22).** Per your "there should be a
      scoring system so the player knows if he has improved each round":
      `recordRun(stats)` now runs at the end of *every* completed run —
      win or lose alike, not only wins as originally spec'd — since a run
      that suffocates early having answered several questions correctly
      can score more than a scraped-together win, and deserves the same
      feedback. It tracks two things independently: the immediately-prior
      run's score (`science-snake-last-run` in localStorage, a new key)
      for round-over-round comparison, and the all-time best
      (`science-snake-high-score`, the existing key/shape, now updated
      from a loss too when a loss's score actually beats it). Replaced
      the old win-only `recordHighScoreIfBetter`/`calculateScore`-in-
      `main.ts` combo entirely — this repo's "don't leave
      backwards-compat shims" convention, and pre-launch content besides.
      `describeRunOutcome(outcome)` turns that into one kid-readable line
      (📈/📉 delta vs last run, or a 🏆 new-high-score callout) — pure
      formatting, no DOM, same split as everything else here. Both win
      and lose cards (`#win-comparison`/`#lose-comparison`,
      `science-snake.html`) show it now, and the top-right high-score
      display (`#high-score-display`) updates after a loss too, not just
      a win. 16 tests (`scienceSnakeScore.test.ts`, up from 11).
      **Bug found and fixed while verifying live:** `main.ts`'s
      `onWin`/`onLose` callbacks called `showHighScore()` *before*
      `showWinCard`/`showLoseCard` — but the high score is only actually
      updated inside those (via `recordRun`), so the header kept showing
      the *pre*-run value on the exact run that just beat it. Fixed by
      reordering (record first, then read). Verified with a real headless
      browser (Playwright against `vite dev`, not just unit tests) via a
      temporary `window.__QA_game` debug hook (reverted before commit):
      forced a win beating a seeded prior score (comparison line showed
      "🏆 New high score! (+85 vs your last run)", header updated to the
      new value immediately), forced a lower-scoring loss (showed "📉
      -100 vs your last run (best: 140)"), and forced a *losing* run that
      still beat the current high score (correctly showed "🏆 New high
      score!" off a loss, header updated to the new value) — the exact
      case this feature didn't previously support. All green: typecheck,
      full unit suite (469 passed, up from 461), production build.
- [ ] `todo` — **E2E test suite (`e2e/science-snake*.spec.ts`).** Mirrors
      `idiom-door`'s `e2e/helpers/` pattern: a full winning playthrough, a
      full suffocation-loss playthrough (repeated wrong answers piling up
      poop), and specifically a test asserting the reveal overlay's
      "Continue" is genuinely gated behind stepping through every
      chunk (not just present from the start) — that gating is the actual
      point of the mechanic, not incidental UI.

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
