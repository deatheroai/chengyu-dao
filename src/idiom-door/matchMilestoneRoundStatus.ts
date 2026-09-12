/**
 * Mirrors a match milestone's own sub-round progress ("Round 1/3, 2/3,
 * ...") into a small always-visible DOM badge inside `#match-ui-layer`
 * — same "the child can see their progress after each stage" purpose
 * and shape as sessionProgressStatus.ts's whole-session "1/3, 2/3, ..."
 * badge, just scoped to one milestone's 3 sub-rounds instead of a
 * session's 3 idioms. Reuses that module's own `.progress-dots`/
 * `.progress-dot` styling (style.css) rather than inventing new markup.
 */
export function updateMatchMilestoneRoundStatus(currentRoundIndex: number, totalRounds: number): void {
  const fractionEl = document.querySelector<HTMLElement>("[data-milestone-round-fraction]");
  const dotsContainer = document.querySelector<HTMLElement>("[data-milestone-round-dots]");
  if (!fractionEl || !dotsContainer) return;

  const ordinal = Math.min(currentRoundIndex + 1, totalRounds);
  fractionEl.textContent = `Round ${ordinal}/${totalRounds}`;

  if (dotsContainer.childElementCount !== totalRounds) {
    dotsContainer.innerHTML = "";
    for (let i = 0; i < totalRounds; i++) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      dotsContainer.appendChild(dot);
    }
  }

  const dots = Array.from(dotsContainer.children) as HTMLElement[];
  dots.forEach((dot, i) => {
    dot.classList.toggle("done", i < currentRoundIndex);
    dot.classList.toggle("current", i === currentRoundIndex);
  });
}
