import HanziWriter from "hanzi-writer";
import type { IdiomContent } from "../idioms/types";
import { writingStrokeData, type WritingCharacterData } from "./writingData/writingStrokeData";
import { startingDoorHp, characterTraceAccuracy, traceRatingForAccuracy, type CharacterTraceResult } from "./writingScore";
import { updateWritingStatus, updateWritingFeedback, clearWritingFeedback } from "./writingStatus";

/** How long each character's own star-rating feedback stays on screen
 * before advancing to the next one — long enough to actually read (a
 * star count + a short label), short enough not to feel like a stall
 * between four back-to-back characters. Starting number, tune after
 * playtest — same as every other constant in this project (see
 * BACKLOG.md). */
const FEEDBACK_DISPLAY_MS = 1300;

/**
 * Fixed render size (and padding) for the tracing target — deliberately
 * not left to CSS/container sizing to determine, so an E2E test can
 * compute the same character-space-to-screen-pixel transform
 * HanziWriter's own internal Positioner uses (needed to turn a
 * character's bundled median stroke points into an actual on-screen
 * drag path) from these two numbers alone, without reading any live
 * layout. `#writing-target` in idiom-door.html is sized to match via
 * its own CSS (`.writing-target`, style.css).
 */
export const WRITER_SIZE = 260;
export const WRITER_PADDING = 20;

/** hanzi-writer's own `CharDataLoaderFn` contract: call `onLoad` with
 * this character's bundled stroke data, or `onError` if (which
 * shouldn't happen for any character in this project's own idiom set —
 * writingStrokeData.ts bundles every one of them) it's missing.
 * Deliberately not just `return writingStrokeData[char]` — hanzi-writer's
 * `LoadingManager._debouncedLoad` only resolves *or* rejects a *truthy*
 * return value; a `undefined` return (a missing char) would otherwise
 * silently hang the loader forever instead of surfacing the error. */
function charDataLoader(char: string, onLoad: (data: WritingCharacterData) => void, onError: (err?: unknown) => void): void {
  const data = writingStrokeData[char];
  if (data) onLoad(data);
  else onError(new Error(`writingStrokeData has no stroke data bundled for "${char}"`));
}

/**
 * Runs the writing/tracing stage for one idiom — BACKLOG.md's
 * 2026-09-08 "teach each character before the door" entry: each of the
 * idiom's 4 characters is shown in turn (a stroke-order animation, per
 * "each of the idiom's 4 characters shown one at a time over a
 * stroke-order template"), then the child traces it themselves via
 * HanziWriter's own quiz mode (real freehand pointer input, graded
 * stroke-by-stroke — see hanzi-writer's own stroke-matching, not
 * reimplemented here). Once every character's quiz resolves,
 * `onComplete` is called with the door stage's starting HP
 * (writingScore.ts's pure scoring, fed this run's per-character mistake
 * counts) — the one thing this stage hands off to the door stage that
 * follows it.
 *
 * A thin orchestration layer, same "pure-function-plus-thin-Scene"
 * split every other mechanic in this project keeps: this file owns
 * *sequencing* (character N's quiz resolving advances to character
 * N+1, or calls `onComplete` once all of them have) and the one
 * HanziWriter instance driving the DOM, not scoring itself (that's
 * writingScore.ts, independently unit-tested).
 *
 * Deliberately plain DOM, not a Phaser Scene, unlike the door/balloon/
 * match stages: HanziWriter owns its own SVG rendering target and
 * pointer-tracking directly, the same reason this project's reading-
 * focused full-screen cards (level-intro-card, balloon-intro-card) are
 * already plain DOM over the Phaser canvas rather than Phaser text —
 * there's no game physics here for a Scene to usefully own.
 *
 * `skipDemo` (writingScore.ts's `shouldSkipStrokeDemo`, decided by
 * main.ts from how many sessions this device has already completed)
 * skips straight to the quiz for every character instead of first
 * playing its stroke-order animation — per your "the child may get
 * impatient waiting if he already knew the strokes" feedback for a
 * more experienced child. Quiz mode still shows a faint outline of the
 * character as a guide either way (`showOutline: true` below); only the
 * *animated* demo is skipped.
 *
 * 2026-09-11 ("this assumes the words are all already familiar to the
 * player... can we include a button for players to review the strokes
 * when he has forgotten?"): `skipDemo` is a blunt, device-wide guess —
 * it can't know that *this particular* character is one the child
 * hasn't actually got yet, on a day he's otherwise experienced enough
 * to skip the rest. `#writing-review-btn` (wired below by `startQuiz`,
 * shown only during the `"trace"` phase — see writingStatus.ts's own
 * phase-toggle) is the per-character escape hatch: tapping it cancels
 * whatever quiz is in progress and replays that one character's
 * stroke-order animation (`reviewChar`, the same `animateCharacter`
 * call `traceChar` uses when `skipDemo` is false) before handing back
 * into a fresh quiz for it — available whether or not the automatic
 * demo ran. Deliberately a *fresh* quiz, not a resume: hanzi-writer's
 * own `quiz()` always starts a character's mistake tally at 0 (see its
 * `Quiz.startQuiz`), so asking to see it again also gives that
 * character a clean slate rather than carrying forward the mistakes
 * that prompted asking — the same "no fail state, nothing held against
 * you" ethos every other mechanic here already keeps.
 */
export function runWritingStage(idiom: IdiomContent, skipDemo: boolean, onComplete: (startingHp: number) => void): void {
  const chars = Array.from(idiom.hanzi);
  const target = document.getElementById("writing-target");
  if (!target || chars.length === 0) {
    // Shouldn't happen for any real idiom on the real page — falls back
    // to "no trace data at all" (0 starting HP) rather than ever
    // blocking the child from reaching the door stage over it.
    onComplete(startingDoorHp([]));
    return;
  }
  target.innerHTML = "";

  const results: CharacterTraceResult[] = [];
  const writer = HanziWriter.create(target, chars[0], {
    width: WRITER_SIZE,
    height: WRITER_SIZE,
    padding: WRITER_PADDING,
    showOutline: true,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 300,
    charDataLoader,
  });

  // The "show me again" button (see this function's own doc comment)
  // persists in the DOM across every character/idiom this one run (and
  // every run after it) drives, so its click handler has to be swapped
  // out per character rather than added once — `setReviewHandler` always
  // removes whatever handler it last attached before attaching the new
  // one, the same manual "un-register on the way out" shape
  // `showWritingSummaryCard` (main.ts) already uses for its own
  // per-idiom Continue handler. Belt-and-suspenders alongside
  // writingStatus.ts's `.visible` phase-gating, not a substitute for
  // it — a stray leftover handler firing while the button is hidden is
  // harmless either way, since a hidden button can't be tapped.
  const reviewBtn = document.getElementById("writing-review-btn");
  let reviewHandler: (() => void) | null = null;
  const setReviewHandler = (handler: (() => void) | null): void => {
    if (reviewHandler) reviewBtn?.removeEventListener("click", reviewHandler);
    reviewHandler = handler;
    if (reviewHandler) reviewBtn?.addEventListener("click", reviewHandler);
  };

  const startQuiz = (index: number): void => {
    const char = chars[index];
    updateWritingStatus(index, chars.length, char, "trace", 0);
    setReviewHandler(() => reviewChar(index));
    writer.quiz({
      showHintAfterMisses: 3,
      // Direction (drawing a stroke backwards) is a common, harmless
      // learning-stage mistake for a 7-9 year old — accepted as
      // correct rather than marked a scored mistake, same "gentle"
      // ethos as every other mechanic in this project.
      acceptBackwardsStrokes: true,
      // A generous cap, not `false` (HanziWriter's own default,
      // "never move on") — no fail state: a child (or a bad run)
      // stuck on one stroke still reaches the end of the quiz
      // rather than being stuck on it forever. Its own mistakes
      // still count fully toward this character's score either way.
      markStrokeCorrectAfterMisses: 8,
      onCorrectStroke: (strokeData) => {
        updateWritingStatus(index, chars.length, char, "trace", strokeData.strokeNum + 1);
      },
      onMistake: (strokeData) => {
        // Still waiting on the same stroke — strokeIndex unchanged.
        updateWritingStatus(index, chars.length, char, "trace", strokeData.strokeNum);
      },
      onComplete: (summary) => {
        results.push({ char, totalMistakes: summary.totalMistakes });
        // 2026-09-09 ("there should be some feedback on the writing to
        // explain to child how well he wrote"): this character's own
        // star rating, shown for a short beat before moving on — the
        // idiom-level total (writing-summary card) comes later, once
        // every character is done, but a child shouldn't have to wait
        // that long to find out how *this* one went. Also flips
        // #writing-status into its own "feedback" phase so `data-phase`
        // doesn't linger stale as "trace" for this whole beat.
        updateWritingStatus(index, chars.length, char, "feedback");
        const rating = traceRatingForAccuracy(characterTraceAccuracy(summary.totalMistakes));
        updateWritingFeedback(rating.stars, rating.label, summary.totalMistakes);
        setTimeout(() => advance(index + 1), FEEDBACK_DISPLAY_MS);
      },
    });
  };

  const traceChar = (index: number): void => {
    const char = chars[index];
    clearWritingFeedback();
    setReviewHandler(null);
    if (skipDemo) {
      startQuiz(index);
      return;
    }
    updateWritingStatus(index, chars.length, char, "watch");
    writer.animateCharacter({ onComplete: () => startQuiz(index) });
  };

  /** The `#writing-review-btn` handler `startQuiz` wires up for whichever
   * character is currently being traced — replays that one character's
   * own stroke-order animation on request, then hands back into a fresh
   * quiz for it (`startQuiz`'s own `onComplete` callback below still
   * fires exactly once, whether that quiz that resolves it is the
   * child's first attempt or a post-review one). `writer.animateCharacter`
   * cancels any quiz still waiting on input itself (hanzi-writer's own
   * `animateCharacter`/`cancelQuiz`), so there's nothing else to tear
   * down here first. */
  const reviewChar = (index: number): void => {
    const char = chars[index];
    updateWritingStatus(index, chars.length, char, "watch");
    writer.animateCharacter({ onComplete: () => startQuiz(index) });
  };

  const advance = (index: number): void => {
    if (index >= chars.length) {
      setReviewHandler(null);
      onComplete(startingDoorHp(results));
      return;
    }
    void writer.setCharacter(chars[index]).then(() => traceChar(index));
  };

  traceChar(0);
}
