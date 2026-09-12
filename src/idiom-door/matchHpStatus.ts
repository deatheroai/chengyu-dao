/**
 * Mirrors the match-milestone finale's running HP (matchHp.ts) into a
 * DOM live region — same small "one attribute + one line of text"
 * pattern as doorHpStatus.ts/balloonHpStatus.ts.
 */
export function updateMatchHpStatus(hp: number): void {
  const el = document.getElementById("match-hp");
  if (!el) return;

  el.setAttribute("data-hp", String(hp));
  el.textContent = `❤️ ${hp}`;
}
