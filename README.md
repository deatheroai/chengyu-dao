# Castle Puzzle — Mobile Web Adventure

A mobile-first, touch-based exploration/puzzle game. See
[`../GAME_DESIGN.md`](../GAME_DESIGN.md) for the full concept, mechanics,
and roadmap.

This is the MVP slice: one room (the castle's Great Hall) with a full
examine → puzzle → inventory → unlock loop.

## Stack

- Vite + TypeScript
- [Phaser 3](https://phaser.io/) for the explorable scene
- Plain DOM/CSS for UI chrome (inventory bar, clue text, puzzle modals)
- [Firebase](https://firebase.google.com/) (Auth + Firestore) for optional
  cloud saves, with automatic fallback to `localStorage`

## Develop

```bash
npm install
npm run dev
```

Open the printed local URL. Resize your browser or use device emulation to
test mobile viewports — the game is touch-first.

## Build

```bash
npm run build   # type-checks then builds to dist/
npm run preview # serve the production build locally
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

## Deploy (Vercel, free tier)

1. Push this repo to GitHub (already done if you're reading this from the
   repo).
2. Go to https://vercel.com → New Project → import the repo.
3. Set **Root Directory** to `game`.
4. If using cloud saves, add the `VITE_FIREBASE_*` env vars from
   `.env.example` in the Vercel project settings.
5. Deploy — `vercel.json` in this folder configures the build/output and
   SPA rewrites.

GitHub Pages also works for a static-only deploy (no env vars/rewrites
needed beyond what a plain SPA requires), but Vercel is recommended for
easier env var handling and automatic deploys on push.

## Project structure

```
src/
  scenes/     # Phaser Scene classes (RoomScene renders backgrounds + hotspots)
  rooms/      # Room data: hotspots, puzzle refs, connections (per environment)
  puzzles/    # Puzzle configs/logic, one module per puzzle type
  state/      # Game state model, interactions, save/load
  ui/         # DOM overlay: inventory bar, clue text, puzzle modals
  firebase/   # Firebase init + cloud save/load (optional)
```

Rooms and puzzles are data-driven (see `src/rooms/castle.ts` and
`src/puzzles/dialPuzzles.ts`), so adding rooms or a second environment
(e.g. the planned underwater shipwreck) is mostly a content task.
