/**
 * Mirrors the balloon stage's HP (balloonHp.ts) into a DOM live region —
 * same small "one attribute + one line of text" pattern as
 * doorStatus.ts/balloonStatus.ts, kept as its own module since it's a
 * genuinely separate piece of state (HP vs. catch-resolved) that a test
 * or future stage might want to read independently.
 */
export function updateBalloonHpStatus(hp: number): void {
  const el = document.getElementById("balloon-hp");
  if (!el) return;

  el.setAttribute("data-hp", String(hp));
  el.textContent = `❤️ ${hp}`;
}
