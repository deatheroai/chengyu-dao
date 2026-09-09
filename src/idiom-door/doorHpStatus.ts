/**
 * Mirrors the door stage's HP (doorHp.ts) into a DOM live region — same
 * small "one attribute + one line of text" pattern as
 * balloonHpStatus.ts/doorStatus.ts, kept as its own module for the same
 * reason those stayed separate: genuinely separate state a test or
 * future stage might want to read independently of catch progress.
 */
export function updateDoorHpStatus(hp: number): void {
  const el = document.getElementById("door-hp");
  if (!el) return;

  el.setAttribute("data-hp", String(hp));
  el.textContent = `❤️ ${hp}`;
}
