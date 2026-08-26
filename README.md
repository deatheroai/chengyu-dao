# chengyu-dao

An exploration-based game that helps primary school children learn Chinese
idioms (成语) — not through drills, but by discovering them in illustrated
scenes and seeing how they apply to everyday life.

## Stack

- Vite + TypeScript
- [Phaser](https://phaser.io/) for the explorable/game scenes
- Plain DOM/CSS for UI chrome
- Saves are `localStorage`-only per mechanic today (no cloud sync)

## Develop

```bash
npm install
npm run dev
```

Open the printed local URL. Resize your browser or use device emulation to
test mobile viewports — the game is touch-first.

## Build & test

```bash
npm run build      # type-checks then builds to dist/
npm run preview    # serve the production build locally
npm run typecheck
npm run test        # unit tests (vitest)
npm run test:e2e    # end-to-end tests (playwright)
```

## Project structure

`index.html` (the site root) is a static redirect to `idiom-door.html`, the
real game (2026-08-26 consolidation — see `DECISIONS.md`): a warm-up match
stage, then each idiom's door-chase and balloon-catch stages in sequence,
opening with a resurfacing callback on a return visit.

```
idiom-door.html   # the game

src/
  idioms/      # idiom content data + types
  idiom-door/  # match/door/balloon scenes, level content, session flow
  shared/      # shared helpers: ruby text (pinyin), player-position DOM
               # hook, application-check distractor builder, session
               # history/resurfacing
```

Five earlier standalone mechanic prototypes (`idiom-reveal`,
`meaning-check`, `catch-meaning`, `platform-catch`, `session`) were
archived/deleted on 2026-08-26 once `idiom-door` absorbed or superseded
each of them — see `DECISIONS.md`'s 2026-08-26 entry and `BACKLOG.md` for
what came from where.

## Deploy

Any static host that can serve a Vite build works (Vercel, GitHub Pages,
etc.). `vercel.json` is included for a Vercel deploy:

1. Import this repo in Vercel.
2. Set **Root Directory** to the repo root (this repo *is* the game, unlike
   its original home as a subdirectory of a larger monorepo).
3. Deploy — `vercel.json` configures the build/output.

## History

This game started as a castle escape-room prototype inside a larger
monorepo (`TestAI`), then pivoted (2026-08-06) to the Chinese idiom
learning concept described above. This repo carries the code and its git
history from that point forward; the pre-pivot castle prototype itself was
removed on 2026-08-25 (see `DECISIONS.md`).

`TestAI`'s own design docs (`GAME_DESIGN.md`, `SNIPPET_PLANS.md`,
`CATCH_MECHANIC_PLAN.md`) and its full decision/backlog history aren't
included here. This repo has its own `AUTONOMY.md` / `DECISIONS.md` /
`BACKLOG.md`, adapted from `TestAI`'s to this repo's standalone structure,
starting fresh from the split rather than carrying the monorepo's full
history over.
