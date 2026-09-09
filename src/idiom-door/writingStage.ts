import HanziWriter from "hanzi-writer";
import type { IdiomContent } from "../idioms/types";
import { writingStrokeData, type WritingCharacterData } from "./writingData/writingStrokeData";
import { startingDoorHp, type CharacterTraceResult } from "./writingScore";
import { updateWritingStatus } from "./writingStatus";

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
 */
export function runWritingStage(idiom: IdiomContent, onComplete: (startingHp: number) => void): void {
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

  const traceChar = (index: number): void => {
    const char = chars[index];
    updateWritingStatus(index, chars.length, char, "watch");
    writer.animateCharacter({
      onComplete: () => {
        updateWritingStatus(index, chars.length, char, "trace", 0);
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
            advance(index + 1);
          },
        });
      },
    });
  };

  const advance = (index: number): void => {
    if (index >= chars.length) {
      onComplete(startingDoorHp(results));
      return;
    }
    void writer.setCharacter(chars[index]).then(() => traceChar(index));
  };

  traceChar(0);
}
