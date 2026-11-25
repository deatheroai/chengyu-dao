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

Under the story, 📚 故事目录 lists every story with its stars and best
默写 score; tapping one opens it (`?story=<id>`). Every three stories, in
the order they appear in `stories`, form a set with a 复习 button: one
默写 of all three stories' characters (18), each in its own sentence
(`?review=<n>`, `src/reading/library.ts`). Its summary links each
missed character to practice in its own story, and its best score is
saved separately from the stories'. A target character must not repeat
across stories (`src/reading/library.test.ts` checks this).

Practice earns up to three stars per character: ★ for tracing, ★★ for
writing it alone with at most one wrong stroke, ★★★ for writing it alone
with none within its target time (1.5 s per stroke, rounded up —
`SECONDS_PER_STROKE` in `src/reading/progress.ts`). Writing alone is
timed, and each flawless attempt can set a fastest time. Stars, fastest times and the best 默写 score are saved in
the browser's `localStorage` on that device only (`src/reading/progress.ts`),
and the "清除练习记录" link on the reading step clears them.

## Story builder (`story-builder.html`)

一起编故事: collaborative story writing for Mandarin practice. 团团 the
panda writes a line and asks a question, and the child writes the next
sentence. Then they spin the **mission wheel** (👀看到 / 👂听到 / 👃闻到 /
✋摸到 / 💭心情 / 🪄比喻) and improve their own sentence to match the
mission, typing it themselves. 💡提示 shows a few example words as
inspiration only; nothing is inserted into their text. Each finished
mission earns ⭐. After 3 turns (`TURNS` in `src/story-builder/flow.ts`)
the story ends, is saved to 我的故事书 (`localStorage`, this device only),
and 团团 asks the child to **teach him to write** three characters from
their own sentences (教团团写字, `src/story-builder/teach.ts`). The child
doesn't choose: 团团 picks words the 好词卡 starred or the child added in
a mission, skips everyday characters and ones he already learned, and
shows each in its sentence. Showing the stroke order, tracing, then
writing it alone with no wrong strokes means 团团 "learns" it and moves
on; the characters he has learned are kept on the device. Stroke data
comes from hanzi-writer-data on jsDelivr.

**AI partner (optional).** With `ANTHROPIC_API_KEY` set in Vercel,
`api/story-partner.ts` uses Claude Haiku 5.5 to judge each mission
(generously, accepting the child's own words), react to what they wrote,
continue the story from it, and start stories from the child's own idea.
Requests are capped per IP and per day when Upstash Redis is configured.
Without a key, or if a call fails, the page uses the pre-written stories
in `src/story-builder/adventures.ts` and the child confirms missions
themselves. The page/server contract is `src/story-builder/partnerApi.ts`.

To check whether a deployment has the key, open `/api/story-partner` on it:
`{"enabled":true}` means the AI partner is on. Vercel only passes
environment variables to deployments built after they were saved, so
redeploy after adding or changing the key (tick both Production and
Preview so branch previews get it too).

Cost: `/api/story-partner?stats` shows today's and the last 7 days' AI
calls, tokens and an estimated cost (at Haiku 5.5 prices) per day and
per finished story, from daily totals kept in Upstash Redis. Each call's
token counts are also logged (Vercel → Logs). Only numbers are stored,
never story text. The Claude Console bill is the official figure.

## Sentence grower (`sentence-grower.html`)

句子长大了: the child takes one plain sentence (小狗在跑。) and makes it
richer one sense at a time. They pick a sense card (👀看到 / 👂听到 /
👃闻到 / ✋摸到 / 💭心情 / 🪄比喻; used ones grey out), 团团 asks a question
about the picture, and the child taps a ＋ between the words and types
only the new words there. The ＋ where that sense usually goes in the
picture glows (`spots` in `seeds.ts`), and the sentence above updates in
the sense's colour as they type. ✏️ 整句改一改 lets them edit the whole
sentence instead, for bigger changes like 跑 → 跑来跑去.
If they're stuck, they can use 💡 hint words and 👀 an example on a
*different* sentence. Nothing is ever inserted into their text. What each
sense added shows in that sense's colour, and each finished sense earns
⭐. After 3 senses (`SENSES_PER_SENTENCE` in
`src/sentence-grower/grow.ts`) the end card shows before/after and what
each sense added. Then comes 读一读: 团团 asks whether it reads smoothly,
and the child can ✏️ 改一改. The sentence is saved to 我的好句子
(`localStorage`, this device only; `?test` uses a separate list), and
团团 asks to learn one character the child added (教团团写字).

Plain sentences come from the picture cards in `src/sentence-grower/seeds.ts`
(an emoji picture, a question and 3 hint words per sense), plus short
sentences the child wrote in the story builder's 我的故事书. With the AI
partner on, the `grow` action of `api/story-partner.ts` judges each
sense generously, reacts to what was added, nudges with a question when
it's missing, and suggests hint words for the next sense. It uses the
same limits and cost tracking as the story builder. Without AI, any newly
added characters count. The two pages link to each other and share
`src/story-builder/ui.ts` (pinyin, 🔊, 🎤).

## Spot the wrong characters (`sharp-eyes.html`)

火眼金睛: 团团 wrote notes, postcards and 作文 in everyday Singapore
settings and got some characters wrong. The child taps a character she
thinks is wrong, sees a funny reveal of what 团团 actually wrote (游永 →
永远在游，停不下来！), and picks the right character from its family
(晴/睛/清/情/请). A wrong tap uses one of 3 drops of red ink; running out
is never game over, 团团 just circles what's left. 🔍 提示 never costs
ink. Each note ends with a stamp (优 / 良 / 加油). The first note is
easy and uses no ink.

After each fix she teaches 团团 to write the right character: a new one
is watched, traced, then written alone; one she has written before is
written alone straight away. Writing every character in a note with no
wrong stroke earns a ✍️ 金笔. The end card offers ✍️ 默写: the
characters fixed so far, each in its sentence with a blank and the
pinyin over it. Ones she misses come first in the next 默写.

Content is in `src/sharp-eyes/`: `families.ts` (20 families of
look-alike and sound-alike characters, P3–P5, each with meanings and a
clue) and `notes.ts` (each mistake written `{wrong|right}` in the text,
with one funny reveal per mistake). `content.test.ts` checks every note
automatically: each mistake swaps one character for another in the same
family, at or below the note's level, and every character has stroke
data. Progress (the best stamp per note) is kept on the device only;
`?test` keeps a separate copy. `?level=4` or `?note=p5-garden` opens a
level or a note directly.

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
  sentence-grower/ # sentence-grower.html: grow a sentence one sense at a time
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
