/**
 * Mirrors the writing/tracing stage's own progress into a DOM live
 * region — same small "one attribute + one line of text" pattern as
 * doorStatus.ts/balloonStatus.ts. Also doubles as this stage's
 * test-only hook: an E2E test can't watch a real freehand stroke
 * happen the way it can poll a canvas-drawn game's position (there's
 * no equivalent of #player-position/#balloon-position for a stroke
 * mid-draw), but it *can* poll which character/stroke the quiz is
 * currently waiting on before driving a synthetic pointer stroke at
 * it — see writingStage.ts's callers of this and
 * e2e/idiom-door.spec.ts's traceWholeIdiom.
 *
 * 2026-09-09: added the "feedback" phase for the short beat between a
 * character's quiz resolving and the next character's own watch/trace
 * beginning (writingStage.ts's `FEEDBACK_DISPLAY_MS`). Without its own
 * distinct phase, `data-phase` would linger stale as "trace" from the
 * just-finished character for that whole beat — harmless for a human,
 * but an e2e helper polling for "trace" to know it's safe to draw the
 * next stroke could match immediately on the stale value and re-trace
 * the character that just finished instead of waiting for the real
 * next one.
 *
 * 2026-09-11: also toggles `#writing-review-btn`'s own `.visible` class
 * in lockstep with `data-phase` — it only makes sense to offer "show me
 * the strokes again" while a quiz is actually waiting on input, not
 * while one's already animating on screen (`"watch"`) or a just-finished
 * character's rating is showing (`"feedback"`). writingStage.ts owns
 * *what* the button does when tapped (`reviewChar`); this is just the
 * one place that already decides the phase deciding *whether it's
 * there* to tap, same as every other `#writing-*` element this function
 * already drives off the same phase value.
 */
export type WritingStagePhase = "watch" | "trace" | "feedback";

export function updateWritingStatus(charIndex: number, total: number, char: string, phase: WritingStagePhase, strokeIndex: number = 0): void {
  const el = document.getElementById("writing-status");
  if (!el) return;

  el.setAttribute("data-char-index", String(charIndex));
  el.setAttribute("data-total", String(total));
  el.setAttribute("data-char", char);
  el.setAttribute("data-phase", phase);
  el.setAttribute("data-stroke-index", String(strokeIndex));
  if (phase === "watch") {
    el.textContent = `Watch how to write ${char} (${charIndex + 1}/${total})`;
  } else if (phase === "feedback") {
    el.textContent = `Nicely done, ${char}!`;
  } else {
    el.textContent = `Your turn — trace ${char}`;
  }

  document.getElementById("writing-review-btn")?.classList.toggle("visible", phase === "trace");
  setWritingProgressState(charIndex, phase);
}

/**
 * 2026-09-12 ("can the writing stage display the meaning and the
 * progress of the 4 character writing at the top?"): the idiom's
 * plain-English meaning, shown once per idiom (writingStage.ts calls
 * this a single time, right as a new idiom's run begins — unlike
 * `updateWritingStatus`, this doesn't change per character) so the
 * child sees *what* they're learning to write, not just *how*. Sits in
 * `#writing-meaning`, above `#writing-status` in `.writing-card` (see
 * idiom-door.html) — its own element rather than folded into
 * `#writing-status`'s text so it doesn't have to be repeated (and
 * possibly re-derived) on every phase/character change.
 */
export function updateWritingMeaning(meaning: string): void {
  const el = document.getElementById("writing-meaning");
  if (el) el.textContent = `Means: "${meaning}"`;
}

/**
 * Renders the per-character progress trail — one dot per character,
 * labeled with that character's own hanzi — once per idiom, right
 * alongside `updateWritingMeaning` above. A static row of anonymous
 * dots would tell the child *how many* characters are left, but not
 * *which* ones; labeling each with its own character lets them see the
 * whole idiom's shape from the start. `updateWritingStatus` (the only
 * other thing that changes which dot is current/done) toggles this
 * same row's state on every phase change via `setWritingProgressState`
 * below, rather than re-rendering it — nothing here needs to change
 * once the idiom's characters are known.
 */
export function initWritingProgress(chars: string[]): void {
  const el = document.getElementById("writing-progress");
  if (!el) return;
  el.innerHTML = "";
  for (const char of chars) {
    const dot = document.createElement("span");
    dot.className = "writing-progress-dot";
    dot.textContent = char;
    el.appendChild(dot);
  }
}

/** Marks which of `initWritingProgress`'s dots is done (a past
 * character, or the current one once its own feedback beat starts —
 * see writingStage.ts's `onComplete`, which flips the phase to
 * "feedback" the moment that character's quiz has actually resolved,
 * before `advance` moves `charIndex` on) versus merely active (still
 * being watched/traced) versus not yet reached. */
function setWritingProgressState(charIndex: number, phase: WritingStagePhase): void {
  const el = document.getElementById("writing-progress");
  if (!el) return;
  const dots = el.querySelectorAll<HTMLElement>(".writing-progress-dot");
  dots.forEach((dot, i) => {
    const done = i < charIndex || (i === charIndex && phase === "feedback");
    dot.classList.toggle("done", done);
    dot.classList.toggle("active", i === charIndex && !done);
  });
}

/**
 * 2026-09-09 ("there should be some feedback on the writing to explain
 * to child how well he wrote"): shown for a short beat right after each
 * character's own quiz resolves (writingStage.ts), before moving on to
 * the next one — a star rating (writingScore.ts's `traceRatingForAccuracy`)
 * plus a plain mistake count, so the child sees *this character's* own
 * result immediately rather than only the whole idiom's total at the
 * very end (that's the separate writing-summary card, main.ts).
 */
export function updateWritingFeedback(stars: number, label: string, mistakes: number): void {
  const el = document.getElementById("writing-feedback");
  if (!el) return;

  const starsText = "⭐".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
  el.setAttribute("data-stars", String(stars));
  el.setAttribute("data-mistakes", String(mistakes));
  el.textContent = `${starsText} ${label}`;
  el.classList.add("visible");
}

/** Hides the per-character feedback — called right as the next
 * character's own "watch"/"trace" phase begins, so stale feedback from
 * the previous one doesn't linger on screen. */
export function clearWritingFeedback(): void {
  const el = document.getElementById("writing-feedback");
  if (!el) return;
  el.classList.remove("visible");
}
