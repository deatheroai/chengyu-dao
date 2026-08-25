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
current default entry point. Each learning mechanic is otherwise its own
entry point (`<name>.html` + `src/<name>/`):

```
idiom-reveal.html    # tap-to-uncover an idiom in an illustrated scene
idiom-door.html       # balloon/door-based idiom matching mechanics
meaning-check.html    # "does this fit?" application check
catch-meaning.html    # catch-style meaning practice
platform-catch.html   # platformer-style catch mechanic
session.html          # session history / resurfacing flow

src/
  idioms/         # idiom content data + types
  idiom-reveal/    # idiom-reveal scene, progress, DOM status
  idiom-door/      # idiom-door + balloon/match scenes and logic
  meaning-check/   # application-check view + state
  catch-meaning/   # catch-meaning scene + progress
  platform-catch/  # platform-catch scene + physics
  session/         # session state + history
  shared/          # shared helpers (e.g. ruby text for pinyin)
```

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
