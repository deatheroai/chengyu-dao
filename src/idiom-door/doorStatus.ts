/**
 * Mirrors ordered-grab progress into a DOM live region — same purpose
 * as catch-meaning/domStatus.ts and platform-catch's reuse of it, but
 * this puzzle's state (which position is next, what just happened) is
 * shaped differently enough (order matters, "wrong" isn't the same as
 * "decoy") to warrant its own small module rather than overloading the
 * existing one.
 */
/** 2026-09-09: "depleted" — doorHp.ts's HP hit 0 (IdiomDoorScene's
 * checkHpDepleted) — joins "advanced"/"wrong" as a third thing this
 * status line can report. Distinct from the door-*reached*-unsolved
 * path (no outcome of its own — that one's already self-explanatory
 * from the level visibly restarting) because this one needs to explain
 * *why* the level is about to restart immediately, before the child has
 * even reached the door. */
export type GrabOutcome = "advanced" | "wrong" | "depleted";

export function updateDoorStatus(nextIndex: number, total: number, isComplete: boolean, nextChar: string | undefined, outcome?: GrabOutcome): void {
  const el = document.getElementById("door-status");
  if (!el) return;

  el.setAttribute("data-next-index", String(nextIndex));
  el.setAttribute("data-total", String(total));
  el.setAttribute("data-complete", String(isComplete));
  // Explicitly cleared when absent, not left as whatever the previous
  // call set — otherwise a fresh level's first render (called with no
  // outcome) would keep showing the *previous* level's last outcome on
  // this attribute, even though the displayed text is correct. Found by
  // an E2E assertion on this exact attribute after a level transition.
  if (outcome) el.setAttribute("data-outcome", outcome);
  else el.removeAttribute("data-outcome");
  if (nextChar) el.setAttribute("data-next-char", nextChar);
  else el.removeAttribute("data-next-char");

  if (isComplete) {
    el.textContent = "You found it! Keep running to the door →";
  } else if (outcome === "depleted") {
    el.textContent = "Out of energy! Let's trace it again...";
  } else if (outcome === "wrong") {
    el.textContent = `Not that one — look for ${nextChar ?? "the next character"}!`;
  } else if (outcome === "advanced") {
    el.textContent = `Yes! ${nextIndex} of ${total} found`;
  } else {
    el.textContent = `${nextIndex} of ${total} found`;
  }
}
