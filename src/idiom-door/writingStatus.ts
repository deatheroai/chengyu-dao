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
 */
export type WritingStagePhase = "watch" | "trace";

export function updateWritingStatus(charIndex: number, total: number, char: string, phase: WritingStagePhase, strokeIndex: number = 0): void {
  const el = document.getElementById("writing-status");
  if (!el) return;

  el.setAttribute("data-char-index", String(charIndex));
  el.setAttribute("data-total", String(total));
  el.setAttribute("data-char", char);
  el.setAttribute("data-phase", phase);
  el.setAttribute("data-stroke-index", String(strokeIndex));
  el.textContent = phase === "watch" ? `Watch how to write ${char} (${charIndex + 1}/${total})` : `Your turn — trace ${char}`;
}
