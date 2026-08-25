# chengyu-dao

An exploration-based game that helps primary school children learn Chinese
idioms (成语) — not through drills, but by discovering them in illustrated
scenes and seeing how they apply to everyday life.

## Stack

- Vite + TypeScript
- [Phaser](https://phaser.io/) for the explorable/game scenes
- Plain DOM/CSS for UI chrome
- [Firebase](https://firebase.google.com/) (Auth + Firestore) for optional
  cloud saves, with automatic fallback to `localStorage`

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

## Cloud saves (optional)

The game works out of the box with local-only saves. To enable cloud saves:

1. Create a free project at https://console.firebase.google.com
2. Enable **Authentication → Sign-in method → Anonymous**
3. Enable **Firestore Database**
4. Apply these Firestore rules (per-user document, owner-only access):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /saves/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Copy `.env.example` to `.env.local` and fill in your Firebase web app
   config (Project settings → General → Your apps).

Without a configured project, `isCloudSaveAvailable()` returns `false` and
the game silently uses `localStorage` only — see `src/firebase/`.

## Project structure

Each learning mechanic is its own entry point (`<name>.html` +
`src/<name>/`):

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
  firebase/        # Firebase init + cloud save/load (optional)
```

## Deploy

Any static host that can serve a Vite build works (Vercel, GitHub Pages,
etc.). `vercel.json` is included for a Vercel deploy:

1. Import this repo in Vercel.
2. Set **Root Directory** to the repo root (this repo *is* the game, unlike
   its original home as a subdirectory of a larger monorepo).
3. If using cloud saves, add the `VITE_FIREBASE_*` env vars from
   `.env.example` in the Vercel project settings.
4. Deploy — `vercel.json` configures the build/output and SPA rewrites.

## History

This game started as a castle escape-room prototype inside a larger
monorepo, then pivoted (2026-08-06) to the Chinese idiom learning concept
described above. That monorepo's design docs (`GAME_DESIGN.md`,
`DECISIONS.md`, `BACKLOG.md`) aren't included here; this repo carries the
code and its git history from that point forward.
