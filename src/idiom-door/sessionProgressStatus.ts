/**
 * Mirrors the overall session's idiom progress into a small always-
 * visible DOM badge — "how far through the 3-idiom session am I,"
 * not any one level's own internal catch/balloon progress (that's
 * doorStatus.ts/balloonStatus.ts's job). Per your 2026-08-27 request:
 * a "1/3, 2/3, ..." indicator visible regardless of which stage
 * (intro, door, balloon, summary) currently has the screen.
 */
export function updateSessionProgress(currentIndex: number, total: number): void {
  const fractionEl = document.querySelector<HTMLElement>("[data-progress-fraction]");
  const dotsContainer = document.querySelector<HTMLElement>("[data-progress-dots]");
  if (!fractionEl || !dotsContainer) return;

  const ordinal = Math.min(currentIndex + 1, total);
  fractionEl.textContent = `${ordinal}/${total}`;

  // Rebuilt to match `total` whenever it doesn't already — cheap, and
  // means callers never need a separate "set up N dots" step before
  // the first real update.
  if (dotsContainer.childElementCount !== total) {
    dotsContainer.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      dotsContainer.appendChild(dot);
    }
  }

  const dots = Array.from(dotsContainer.children) as HTMLElement[];
  dots.forEach((dot, i) => {
    dot.classList.toggle("done", i < currentIndex);
    dot.classList.toggle("current", i === currentIndex);
  });
}
