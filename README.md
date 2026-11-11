# chengyu-dao

An exploration-based game that helps primary school children learn Chinese
idioms (成语) — not through drills, but by discovering them in illustrated
scenes and seeing how they apply to everyday life.

## Stack

- Vite + TypeScript
- [Phaser](https://phaser.io/) for the explorable/game scenes
- Plain DOM/CSS for UI chrome
- Saves are `localStorage`-first; optional cloud sync via a Vercel
  serverless function backed by Upstash Redis (`api/cloud-save.ts`),
  device-code based — no accounts (2026-08-30, see `DECISIONS.md`)

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

## Story writing practice (`story-writer.html`)

A separate, simple page for reading and writing practice (Primary 4
level): read a short story, practise its new characters in 田字格 boxes
(watch the stroke order, trace, then write alone), then a 默写 test
where she writes each character from memory into a blank in its
sentence from the story.

To change the story, edit `src/reading/stories.ts` (the text plus each
target character's pinyin, word and meaning), then run
`npm run gen:story-strokes` to bundle the new characters' stroke data.
`src/reading/stories.test.ts` catches a target missing from the text or
missing stroke data.

Practice earns up to three stars per character: ★ for tracing, ★★ for
writing it alone with at most one wrong stroke, ★★★ for writing it alone
with none within its target time (1.5 s per stroke, rounded up —
`SECONDS_PER_STROKE` in `src/reading/progress.ts`). Writing alone is
timed, and each flawless attempt can set a fastest time. Stars, fastest times and the best 默写 score are saved in
the browser's `localStorage` on that device only (`src/reading/progress.ts`),
and the "清除练习记录" link on the reading step clears them.

## Story builder (`story-builder.html`)

一起编故事: collaborative story writing for Mandarin practice. The child
picks an adventure. 团团 the panda writes a line (with pinyin and read
aloud) and asks a question, and the child writes the next sentence. They
can type it, tap a sentence starter, or say it with 🎤 where the browser
supports speech input. Before the sentence goes into the story, the
**五感放大镜** step helps make it richer. Tabs for 👀看到 / 👂听到 /
👃闻到 / ✋摸到 / 💭心情 / 🪄好句子 each ask a question and offer
scene-specific word chips (sounds like 哗啦啦, patterns like 像……一样)
to insert. A meter lights up each sense used and shows how much the
sentence grew. Each turn earns ★ for a sentence, ★★ for one sense and ★★★
for two or more. Finished stories go into 我的故事书 (`localStorage`,
this device only).

Content lives in `src/story-builder/adventures.ts` (each beat: partner
line, question, starters, scene words, a plain → rich example) and
`senses.ts` (general word banks). Pinyin comes from `pinyin-pro`, with
context fixes for the particles 地/得 in `pinyin.ts`.
`adventures.test.ts` checks every beat, including that each "rich"
example really uses a sense.

## Project structure

`index.html` (the site root) is a static redirect to `idiom-door.html`, the
real game (2026-08-26 consolidation — see `DECISIONS.md`): a warm-up match
stage, then each idiom's door-chase and balloon-catch stages in sequence,
opening with a resurfacing callback on a return visit.

```
idiom-door.html   # the game
api/              # Vercel serverless functions (cloud-save.ts)

src/
  idioms/      # idiom content data + types
  reading/     # story-writer.html: read, practise and 默写 characters
  story-builder/ # story-builder.html: collaborative story writing
  idiom-door/  # match/door/balloon scenes, level content, session flow
  shared/      # shared helpers: ruby text (pinyin), player-position DOM
               # hook, application-check distractor builder, session
               # history/resurfacing, cloud-save sync + code validation
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

Cloud save (optional — the game works fully `localStorage`-only without
it) needs an Upstash Redis integration installed from the Vercel
Marketplace and connected to this project, so that either
`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/
`UPSTASH_REDIS_REST_TOKEN` are set as environment variables — see
`api/cloud-save.ts`. Without those set, `/api/cloud-save` returns 501 and
the cloud-save panel shows "Cloud save isn't set up for this game yet"
rather than failing silently or breaking anything else.

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
